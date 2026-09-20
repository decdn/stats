import { AwsClient } from "aws4fetch"

import type { Env } from "./env"

export const STATS_KEY = "stats.json"

const httpMetadata = {
  contentType: "application/json",
  cacheControl: "public, max-age=60",
}

// Where stats.json lives. The R2 *binding* is the default (prod, and the
// locally emulated bucket under `wrangler dev`). When S3 credentials are set
// the same bucket is reached over R2's S3 API instead, so a local run can
// read/write the real bucket without `wrangler dev --remote`.
export type StatsStore = {
  label: string
  get(): Promise<string | null>
  put(body: string): Promise<void>
}

export function statsStore(env: Env): StatsStore {
  return env.R2_ACCESS_KEY_ID ? s3Store(env) : bindingStore(env.STATS)
}

function bindingStore(bucket: R2Bucket): StatsStore {
  return {
    label: "r2 binding",
    async get() {
      const object = await bucket.get(STATS_KEY)
      return object ? object.text() : null
    },
    async put(body) {
      await bucket.put(STATS_KEY, body, { httpMetadata })
    },
  }
}

function s3Store(env: Env): StatsStore {
  for (const key of [
    "R2_SECRET_ACCESS_KEY",
    "R2_S3_ENDPOINT",
    "R2_BUCKET",
  ] as const) {
    if (!env[key])
      throw new Error(`${key} must be set alongside R2_ACCESS_KEY_ID`)
  }
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  })
  const url = `${env.R2_S3_ENDPOINT!.replace(/\/$/, "")}/${env.R2_BUCKET}/${STATS_KEY}`
  return {
    label: `s3 ${env.R2_BUCKET}`,
    async get() {
      const res = await client.fetch(url, { method: "GET" })
      if (res.status === 404) return null
      if (!res.ok)
        throw new Error(`s3 get failed: ${res.status} ${await res.text()}`)
      return res.text()
    },
    async put(body) {
      const res = await client.fetch(url, {
        method: "PUT",
        body,
        headers: {
          "content-type": httpMetadata.contentType,
          "cache-control": httpMetadata.cacheControl,
        },
      })
      if (!res.ok)
        throw new Error(`s3 put failed: ${res.status} ${await res.text()}`)
    },
  }
}

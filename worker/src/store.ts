import { AwsClient } from "aws4fetch"

import type { Env } from "./env"

export const STATS_KEY = "stats.json"

const httpMetadata = {
  contentType: "application/json",
  cacheControl: "public, max-age=60",
}

// Where stats.json lives. The R2 *binding* is the default (prod, and the
// locally emulated bucket under `wrangler dev`). When S3 credentials are set
// the same bucket (assuming `R2_BUCKET` matches wrangler.jsonc's
// `bucket_name`) is reached over R2's S3 API instead, so a local run can
// read/write the real bucket without `wrangler dev --remote`.
export type StatsStore = {
  label: string
  get(): Promise<string | null>
  put(body: string): Promise<void>
  // Copies the current stats.json to a recovery key before a destructive
  // rewrite (deployment reset). A missing source is a no-op.
  backup(): Promise<void>
}

export const BACKUP_KEY = "stats.json.pre-reindex"

export function statsStore(env: Env): StatsStore {
  if (env.R2_ACCESS_KEY_ID) return s3Store(env)
  if (!env.STATS) {
    throw new Error(
      "R2 binding STATS is missing and no R2_* S3 credentials are set"
    )
  }
  return bindingStore(env.STATS)
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
    async backup() {
      const object = await bucket.get(STATS_KEY)
      if (object) await bucket.put(BACKUP_KEY, await object.text())
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
  const base = `${env.R2_S3_ENDPOINT!.replace(/\/$/, "")}/${env.R2_BUCKET}`
  const url = `${base}/${STATS_KEY}`
  return {
    label: `s3 ${env.R2_BUCKET}`,
    async get() {
      const res = await client.fetch(url, { method: "GET" })
      if (res.ok) return res.text()
      const body = await res.text()
      // Only a missing key means "not indexed yet"; a missing bucket is a
      // config error and must not kick off a backfill.
      if (res.status === 404 && body.includes("<Code>NoSuchKey</Code>")) {
        return null
      }
      throw new Error(`s3 get failed: ${res.status} ${body}`)
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
    async backup() {
      const res = await client.fetch(`${base}/${BACKUP_KEY}`, {
        method: "PUT",
        headers: { "x-amz-copy-source": `/${env.R2_BUCKET}/${STATS_KEY}` },
      })
      // 404 = nothing to back up; anything else must not be swallowed.
      if (!res.ok && res.status !== 404)
        throw new Error(`s3 backup failed: ${res.status} ${await res.text()}`)
    },
  }
}

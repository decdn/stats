import { AwsClient } from "aws4fetch"

import { parseChainId, type Env } from "./env"

const httpMetadata = {
  contentType: "application/json",
  cacheControl: "public, max-age=60",
}

// What the store needs from the Worker env, so statsKey and statsStore don't
// depend on the indexer's config.
export type StoreEnv = Pick<
  Env,
  | "STATS"
  | "CHAIN_ID"
  | "R2_ACCESS_KEY_ID"
  | "R2_SECRET_ACCESS_KEY"
  | "R2_S3_ENDPOINT"
  | "R2_BUCKET"
>

// One file per chain, so switching CHAIN_ID never overwrites another chain's
// history.
export function statsKey(env: StoreEnv) {
  return `stats-${parseChainId(env)}.json`
}

// Where the indexer reads and writes the stats file (the page fetches it from
// the bucket's public URL instead). The R2 *binding* is the default (prod, and
// the locally emulated bucket under `wrangler dev` and `pnpm index`). When S3
// credentials are set the same bucket (assuming `R2_BUCKET` matches
// wrangler.jsonc's `bucket_name`) is reached over R2's S3 API instead, so a
// local run can read/write the real bucket without `wrangler dev --remote`.
// `get` returns the body with the etag it was read at; `put` only writes if
// the stored object still has that etag (or, for a null etag, if there is no
// object yet) and reports whether it did. Cron ticks can overlap, and this
// keeps a slow older tick from clobbering the newer file.
export type Stored = { body: string; etag: string | null }

export type StatsStore = {
  label: string
  key: string
  get(): Promise<Stored | null>
  put(body: string, etag: string | null): Promise<boolean>
}

export function statsStore(env: StoreEnv): StatsStore {
  const key = statsKey(env)
  if (env.R2_ACCESS_KEY_ID) return s3Store(env, key)
  if (!env.STATS) {
    throw new Error(
      "R2 binding STATS is missing and no R2_* S3 credentials are set"
    )
  }
  return bindingStore(env.STATS, key)
}

function bindingStore(bucket: R2Bucket, key: string): StatsStore {
  return {
    label: `r2 binding ${key}`,
    key,
    async get() {
      const object = await bucket.get(key)
      if (!object) return null
      return { body: await object.text(), etag: object.etag }
    },
    async put(body, etag) {
      // put resolves null when onlyIf fails.
      const written = await bucket.put(key, body, {
        httpMetadata,
        onlyIf:
          etag === null ? { etagDoesNotMatch: "*" } : { etagMatches: etag },
      })
      return written !== null
    },
  }
}

function s3Store(env: StoreEnv, key: string): StatsStore {
  for (const name of [
    "R2_SECRET_ACCESS_KEY",
    "R2_S3_ENDPOINT",
    "R2_BUCKET",
  ] as const) {
    if (!env[name])
      throw new Error(`${name} must be set alongside R2_ACCESS_KEY_ID`)
  }
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  })
  const url = `${env.R2_S3_ENDPOINT!.replace(/\/$/, "")}/${env.R2_BUCKET}/${key}`
  return {
    label: `s3 ${env.R2_BUCKET}/${key}`,
    key,
    async get() {
      const res = await client.fetch(url, { method: "GET" })
      if (res.ok) {
        return { body: await res.text(), etag: res.headers.get("etag") }
      }
      const body = await res.text()
      // Only a missing key means "not indexed yet"; a missing bucket is a
      // config error and must not kick off a backfill.
      if (res.status === 404 && body.includes("<Code>NoSuchKey</Code>")) {
        return null
      }
      throw new Error(`s3 get failed: ${res.status} ${body}`)
    },
    async put(body, etag) {
      const res = await client.fetch(url, {
        method: "PUT",
        body,
        headers: {
          "content-type": httpMetadata.contentType,
          "cache-control": httpMetadata.cacheControl,
          ...(etag === null ? { "if-none-match": "*" } : { "if-match": etag }),
        },
      })
      if (res.status === 412) return false
      if (!res.ok)
        throw new Error(`s3 put failed: ${res.status} ${await res.text()}`)
      return true
    },
  }
}

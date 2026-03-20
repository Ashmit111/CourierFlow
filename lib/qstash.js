import { Client } from '@upstash/qstash'

// baseUrl is intentionally NOT hardcoded here.
// In dev: set QSTASH_URL to the local dev CLI server (e.g. http://localhost:8080)
// In prod: set QSTASH_URL to https://qstash.upstash.io (or leave blank, SDK defaults to it)
// The SDK reads QSTASH_URL from env automatically when baseUrl is not passed.
const qstash = new Client({
  token: process.env.QSTASH_TOKEN,
})

export default qstash

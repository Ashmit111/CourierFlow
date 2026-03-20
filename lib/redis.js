import { Redis } from '@upstash/redis'

let redis

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  if (!global._redis) {
    global._redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  redis = global._redis
} else {
  // Noop fallback when Redis is not configured
  redis = {
    get: async () => null,
    set: async () => null,
    setex: async () => null,
    del: async () => null,
  }
}

export default redis

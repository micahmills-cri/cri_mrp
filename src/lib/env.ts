import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  STORAGE_BUCKET_ID: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
})

export const env = envSchema.parse(process.env)

export default env

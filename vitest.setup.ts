import '@testing-library/jest-dom'

process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/test'
process.env.JWT_SECRET ??= 'development-test-secret-key-123456'
process.env.STORAGE_BUCKET_ID ??= 'local-bucket'
process.env.NODE_ENV ??= 'test'

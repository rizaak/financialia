import { defineConfig } from 'prisma/config';

/** Solo para `prisma generate` / validación sin `.env`; migraciones reales usan tu DATABASE_URL. */
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://postgres:wPxtVaaGzQbIIxwmkLHgsjdyqAMRJlyX@hopper.proxy.rlwy.net:53015/railway';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});

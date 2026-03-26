import { type PoolConfig } from "pg";

function parseBooleanEnv(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

export function buildPgPoolConfig(overrides: Partial<PoolConfig> = {}): PoolConfig {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const url = new URL(connectionString);

  // `pg` does not need libpq query params like sslmode/channel_binding when
  // SSL is provided explicitly in code, and some hosted URLs include them.
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");

  const sslDisabled = parseBooleanEnv(process.env.PG_SSL_DISABLE);
  const rejectUnauthorized = parseBooleanEnv(process.env.PG_SSL_REJECT_UNAUTHORIZED);

  return {
    connectionString: url.toString(),
    ssl: sslDisabled
      ? false
      : {
          rejectUnauthorized,
        },
    keepAlive: true,
    max: 10,
    min: 0,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    ...overrides,
  };
}

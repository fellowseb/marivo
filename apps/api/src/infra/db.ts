import postgres from 'postgres';

let sql: ReturnType<typeof postgres>;

export function initDatabase() {
  sql = postgres({
    transform: {
      // Avoid the automagic snake_case to camelCase transforms
      // ...postgres.camel,
      undefined: null,
    },
    host: process.env.POSTGRES_HOST ?? 'postgres',
    port: Number.parseInt(process.env.POSTGRES_PORT ?? '5432'),
    database: 'marivo',
    username: process.env.POSTGRES_USERNAME ?? '',
    password: process.env.POSTGRES_PASSWORD ?? '',
  });
}

export function getDatabase() {
  if (!sql) {
    throw new Error('Database not initialized');
  }
  return sql;
}

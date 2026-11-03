import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres, { type Sql } from "postgres";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer | undefined;
let sql: Sql | undefined;

/**
 * Start a real Postgres container, apply schema, and return a sql client.
 * Shared across all integration tests in the same process.
 */
export async function setupTestDatabase(): Promise<Sql> {
  if (sql) return sql;

  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("marivo_test")
    .withUsername("test")
    .withPassword("test")
    .start();

  sql = postgres({
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    username: container.getUsername(),
    password: container.getPassword(),
    transform: { undefined: null },
  });

  const schemaPath = resolve(__dirname, "../../schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  await sql.unsafe(schema);

  return sql;
}

/** Connection settings of the shared test container, as env vars. */
export function testDatabaseEnv() {
  if (!container) throw new Error("Test database not started");
  return {
    POSTGRES_HOST: container.getHost(),
    POSTGRES_PORT: String(container.getPort()),
    POSTGRES_DB: container.getDatabase(),
    POSTGRES_USERNAME: container.getUsername(),
    POSTGRES_PASSWORD: container.getPassword(),
  };
}

export async function teardownTestDatabase(): Promise<void> {
  if (sql) await sql.end();
  if (container) await container.stop();
}

/** Insert a test user and return its id. */
export async function createTestUser(sql: Sql): Promise<number> {
  const [row] = await sql`
    INSERT INTO users (clerk_id, username, full_name, primary_email)
    VALUES ('test_clerk_id', 'testuser', 'Test User', 'test@example.com')
    RETURNING id
  `;
  return row.id;
}

/** Insert a test script and return its id. */
export async function createTestScript(sql: Sql): Promise<number> {
  const [row] = await sql`
    INSERT INTO scripts (checksum) VALUES ('testchecksum') RETURNING id
  `;
  return row.id;
}

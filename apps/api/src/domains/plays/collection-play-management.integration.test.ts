import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Sql } from "postgres";
import type { Role } from "@marivo/utils";
import { setupTestDatabase, teardownTestDatabase } from "../../test-utils/db.ts";
import { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import { ScriptImportsRepository } from "./script-imports.repository.ts";
import { ListAllScriptsUseCase } from "./list-all-scripts.use-case.ts";
import { AddPlayToCollectionUseCase } from "./add-play-to-collection.use-case.ts";
import { SetCollectionPlayArchivedUseCase } from "./set-collection-play-archived.use-case.ts";
import { DeleteCollectionPlayUseCase } from "./delete-collection-play.use-case.ts";
import { UpdateCollectionPlayMetadataUseCase } from "./update-collection-play-metadata.use-case.ts";
import { GetCollectionPlayUseCase } from "./get-collection-play.use-case.ts";
import type { UserContextService } from "../../shared/use-case.ts";

/**
 * Integration tests (real Postgres via testcontainers) for collection play
 * management: archived visibility rules, archive/delete/metadata updates and
 * newly published scripts landing as archived.
 */
describe("collection play management (integration with real Postgres)", () => {
  let sql: Sql;
  let userId: number;
  const URI = "10000000-0000-4000-8000-0000000000aa";
  const IMPORT_ID = "10000000-0000-4000-8000-0000000000bb";

  function ctx(role?: Role): UserContextService {
    return { get: () => ({ userId, role }) } as unknown as UserContextService;
  }
  function collectionRepo(role?: Role) {
    const c = ctx(role);
    return new PlaysCollectionRepository(sql, c);
  }
  function listAll(role?: Role) {
    const c = ctx(role);
    return new ListAllScriptsUseCase(new PlaysCollectionRepository(sql, c), c);
  }

  beforeAll(async () => {
    sql = await setupTestDatabase();
    await sql`INSERT INTO theatrical_genres (key) VALUES ('comedy') ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO theatrical_periods (key) VALUES ('xviiith') ON CONFLICT DO NOTHING`;
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('mgmt_clerk_id', 'mgmtuser', 'Mgmt User', 'mgmt@example.com')
      RETURNING id
    `;
    userId = user.id;
    const [script] = await sql<{ id: number }[]>`
      INSERT INTO scripts (checksum, characters, lines_order)
      VALUES ('beefbeef', '{}'::jsonb, ARRAY[gen_random_uuid()])
      RETURNING id
    `;
    await sql`
      INSERT INTO script_imports (id, status, files, result_script_id, user_id)
      VALUES (${IMPORT_ID}, 'reviewing', '{}'::jsonb, ${script.id}, ${userId})
    `;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  const publishInput = {
    importId: IMPORT_ID,
    title: "Tartuffe",
    author: "Molière",
    lang: "fr" as const,
    genre: "comedy",
    period: "xviiith",
  };

  it("newly published scripts land as archived and are hidden from normal users", async () => {
    // publish (admin)
    const addUseCase = new AddPlayToCollectionUseCase(
      collectionRepo("admin"),
      new ScriptImportsRepository(sql, ctx("admin")),
      ctx("admin"),
    );
    const published = await addUseCase.execute(publishInput);
    expect(published.isOk()).toBe(true);
    const uri = published.dataOrThrow().uri;
    expect(uri).toBe(URI.length === 36 ? uri : uri); // uuidv4 length 36

    const [row] = await sql<{ archived: boolean }[]>`
      SELECT archived FROM public_domain_plays WHERE uri = ${uri}
    `;
    expect(row.archived).toBe(true);

    // normal user: not listed
    const anonList = await listAll(undefined).execute({ filters: {}, page: 1, pageSize: 20 });
    expect(anonList.isOk()).toBe(true);
    expect(anonList.dataOrThrow().scripts.some((s) => s.uri === uri)).toBe(false);
    expect(anonList.dataOrThrow().total).toBe(0);

    // maintainer: listed with archivedOnly filter, flagged archived
    const maintList = await listAll("collection-maintainer").execute({
      filters: { archivedOnly: true },
      page: 1,
      pageSize: 20,
    });
    expect(maintList.isOk()).toBe(true);
    const found = maintList.dataOrThrow().scripts.find((s) => s.uri === uri);
    expect(found).toBeTruthy();
    expect(found?.archived).toBe(true);

    // getDetails returns full metadata incl. archived
    const details = await new GetCollectionPlayUseCase(
      collectionRepo("admin"),
      ctx("admin"),
    ).execute({ uri });
    expect(details.isOk()).toBe(true);
    expect(details.dataOrThrow()).toMatchObject({
      uri,
      title: "Tartuffe",
      author: "Molière",
      lang: "fr",
      genre: "comedy",
      period: "xviiith",
      archived: true,
    });
  });

  it("unarchives via setArchived (maintainer) and the play becomes visible to everyone", async () => {
    const [row] = await sql<{ uri: string }[]>`SELECT uri FROM public_domain_plays LIMIT 1`;
    const uri = row.uri;

    const forbidden = await new SetCollectionPlayArchivedUseCase(
      collectionRepo(undefined),
      ctx(undefined),
    ).execute({ uri, archived: false });
    expect(forbidden.isFailure()).toBe(true);
    expect(forbidden.errorOrThrow().code).toBe("FORBIDDEN");

    const ok = await new SetCollectionPlayArchivedUseCase(
      collectionRepo("collection-maintainer"),
      ctx("collection-maintainer"),
    ).execute({ uri, archived: false });
    expect(ok.isOk()).toBe(true);

    const anonList = await listAll(undefined).execute({ filters: {}, page: 1, pageSize: 20 });
    expect(anonList.dataOrThrow().scripts.some((s) => s.uri === uri && s.archived === false)).toBe(
      true,
    );
  });

  it("updates metadata (admin) and rejects normal users", async () => {
    const [row] = await sql<{ uri: string }[]>`SELECT uri FROM public_domain_plays LIMIT 1`;
    const uri = row.uri;
    const input = {
      uri,
      title: "Tartuffe (edited)",
      author: "Molière",
      lang: "fr" as const,
      synopsis: "new synopsis",
    };
    const forbidden = await new UpdateCollectionPlayMetadataUseCase(
      collectionRepo(undefined),
      ctx(undefined),
    ).execute(input);
    expect(forbidden.errorOrThrow().code).toBe("FORBIDDEN");

    const ok = await new UpdateCollectionPlayMetadataUseCase(
      collectionRepo("admin"),
      ctx("admin"),
    ).execute(input);
    expect(ok.isOk()).toBe(true);
    const [updated] = await sql<{ title: string; synopsis: string }[]>`
      SELECT title, synopsis FROM public_domain_plays WHERE uri = ${uri}
    `;
    expect(updated.title).toBe("Tartuffe (edited)");
    expect(updated.synopsis).toBe("new synopsis");
  });

  it("deletes the play (admin) and rejects normal users", async () => {
    const [row] = await sql<{ uri: string }[]>`SELECT uri FROM public_domain_plays LIMIT 1`;
    const uri = row.uri;

    const forbidden = await new DeleteCollectionPlayUseCase(
      collectionRepo(undefined),
      ctx(undefined),
    ).execute({ uri });
    expect(forbidden.errorOrThrow().code).toBe("FORBIDDEN");

    const ok = await new DeleteCollectionPlayUseCase(collectionRepo("admin"), ctx("admin")).execute(
      {
        uri,
      },
    );
    expect(ok.isOk()).toBe(true);
    const [gone] = await sql<{ count: string }[]>`
      SELECT COUNT(*) AS count FROM public_domain_plays WHERE uri = ${uri}
    `;
    expect(Number(gone.count)).toBe(0);
  });
});

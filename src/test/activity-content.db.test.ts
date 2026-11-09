import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";

const target = process.env["CONTENT_TEST_PG"];
describe.skipIf(!target)("admin rubric database persistence", () => {
  const sql = postgres({ host: target, port: 6544, user: "postgres", database: "postgres", max: 1, onnotice: () => undefined });
  const criteria = [{ criterion: "A", description: "Coerência jurídica", weight: 3 }, { criterion: "B", description: "Clareza", weight: 1 }];
  const save = (rubric = criteria, timestamp = "2026-11-09T00:00:00Z") => sql`select public.save_activity_rubric('p1','a1',${timestamp}::timestamptz,${sql.json(rubric)}::jsonb)`;
  beforeAll(async () => {
    await sql.unsafe(`create schema auth;
      create role anon; create role authenticated;
      create function auth.uid() returns uuid language sql as $f$ select '11111111-1111-4111-8111-111111111111'::uuid $f$;
      create function public.has_role(uuid,text) returns boolean language sql as $f$ select current_setting('test.admin',true)='on' $f$;
      create table public.learning_programs(id text primary key,content jsonb,updated_at timestamptz);
      create table public.learning_submissions(program_id text,activity_id text,grade numeric);
    `);
    await sql.unsafe(readFileSync("drizzle/migrations/0018_admin_activity_rubric.sql", "utf8"));
  });
  afterAll(() => sql.end());
  beforeEach(async () => {
    await sql`delete from public.learning_programs`; await sql`delete from public.learning_submissions`;
    await sql`select set_config('test.admin','on',false)`;
    await sql`insert into public.learning_programs values ('p1',${sql.json({ title: "Curso", activities: [{ id: "a1", rubric: [{ criterion: "A" }, { criterion: "B" }], demandBody: "Preservar" }, { id: "a2", rubric: [{ criterion: "C" }] }] })}::jsonb,'2026-11-09T00:00:00Z')`;
  });
  it("saves complete weighted criteria and preserves other course content and grades", async () => {
    await sql`insert into public.learning_submissions values ('p1','a1',8.1)`;
    await save();
    const [row] = await sql`select content from public.learning_programs`;
    expect(row?.["content"].activities[0].rubric).toEqual(criteria);
    expect(row?.["content"].activities[0].demandBody).toBe("Preservar");
    expect(row?.["content"].activities[1].rubric).toEqual([{ criterion: "C" }]);
    expect((await sql`select grade from public.learning_submissions`)[0]?.["grade"]).toBe("8.1");
  });
  it("rejects non-administrators even through direct RPC", async () => {
    await sql`select set_config('test.admin','off',false)`;
    await expect(save()).rejects.toThrow(/administração/);
  });
  it("rejects outdated edits rather than overwriting another save", async () => {
    await save(); await expect(save()).rejects.toThrow(/Recarregue/);
  });
  it("preserves criterion names and order after a delivery", async () => {
    await sql`insert into public.learning_submissions values ('p1','a1',8.1)`;
    await expect(save([...criteria].reverse())).rejects.toThrow(/nomes e a ordem/);
  });
  it("rejects incomplete descriptions and zero weights at the database boundary", async () => {
    await expect(save([{ criterion: "A", description: " ", weight: 1 }])).rejects.toThrow(/descrição/);
    await expect(save([{ criterion: "A", description: "Descrição", weight: 0 }])).rejects.toThrow(/positivos/);
  });
});
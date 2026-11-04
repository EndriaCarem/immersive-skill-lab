import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";

/**
 * Runs the real queue SQL (migration 0016) against a throwaway local PostgreSQL, never the project database.
 * Start one and set QUEUE_TEST_PG="host=/tmp/pgq port=6543" to run; skipped otherwise.
 */
const target = process.env["QUEUE_TEST_PG"];
const opt = Object.fromEntries((target ?? "").split(" ").filter(Boolean).map(kv => kv.split("=") as [string, string]));
const connect = () => postgres({ host: opt["host"], port: Number(opt["port"] ?? 5432), user: "postgres", database: "postgres", onnotice: () => undefined, max: 1 });

describe.skipIf(!target)("AI grading queue (database rules)", () => {
  let sql: ReturnType<typeof connect>;
  const LEASE = 300;
  const claim = (db = sql, only?: string) => db`select id, status, tries from public.claim_learning_ai_evaluations(1, ${LEASE}, ${only ?? null}::uuid)`;
  const row = async (id: string) => (await sql`select * from public.learning_ai_evaluations where id = ${id}`)[0]!;
  const expire = (id: string) => sql`update public.learning_ai_evaluations set lease_until = now() - interval '1 second' where id = ${id}`;
  const insert = async (fields: Record<string, unknown> = {}) =>
    (await sql`insert into public.learning_ai_evaluations ${sql({ submission_id: crypto.randomUUID(), user_id: crypto.randomUUID(), program_id: "p1", activity_id: "a1", ...fields })} returning id`)[0]!["id"] as string;

  beforeAll(async () => {
    sql = connect();
    await sql.unsafe(`
      drop schema if exists public cascade; drop schema if exists auth cascade; create schema public; create schema auth;
      do $$ begin create role anon; exception when duplicate_object then null; end $$;
      do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
      do $$ begin create role service_role; exception when duplicate_object then null; end $$;
      create function auth.uid() returns uuid language sql as $f$ select nullif(current_setting('test.uid', true), '')::uuid $f$;
      create function public.has_role(_user_id uuid, _role text) returns boolean language sql as $f$ select coalesce(current_setting('test.admin', true), '') = 'on' $f$;
      create table public.learning_ai_evaluations (
        id uuid primary key default gen_random_uuid(), submission_id uuid not null unique, user_id uuid not null,
        program_id text not null, activity_id text not null, attempt integer,
        status text not null default 'pending' check (status in ('pending','extracting','evaluating','completed','failed','needs_human_review')),
        tries integer not null default 0, lease_token uuid, lease_until timestamptz, next_attempt_at timestamptz not null default now(),
        overall_score numeric(4,2), issue_code text, started_at timestamptz, completed_at timestamptz,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now());`);
    await sql.unsafe(readFileSync("drizzle/migrations/0016_recover_interrupted_ai_gradings.sql", "utf8"));
  });
  afterAll(async () => { await sql?.end(); });
  beforeEach(async () => { await sql`delete from public.learning_ai_evaluations`; });

  it("learner closes the page mid-grading: the expired reservation returns to the queue without spending a try", async () => {
    const id = await insert();
    expect((await claim())[0]).toMatchObject({ id, tries: 1 });
    await expire(id); // the run was cut off; nothing wrote a result
    expect(await sql`select public.recover_expired_ai_leases() as n`).toEqual([{ n: 1 }]);
    expect(await row(id)).toMatchObject({ status: "pending", tries: 0, interruptions: 1, issue_code: "interrupted", lease_token: null });
  });

  it("a later visit resumes the same delivery (no new upload) and the try count only reflects real attempts", async () => {
    const id = await insert();
    await claim(); await expire(id);
    const resumed = await claim(sql, id); // recovery + claim in one call, as the learner page does
    expect(resumed[0]).toMatchObject({ id, status: "extracting", tries: 1 });
    expect((await row(id))["interruptions"]).toBe(1);
  });

  it("a reservation that has not expired is never taken by another run", async () => {
    const id = await insert();
    await claim();
    expect(await claim(sql, id)).toHaveLength(0);
    expect((await row(id))["tries"]).toBe(1);
  });

  it("two simultaneous attempts to grade the same delivery: only one gets it", async () => {
    const id = await insert();
    const [a, b] = [connect(), connect()];
    try {
      const results = await Promise.all([claim(a, id), claim(b, id)]);
      expect(results.flat().map(r => r["id"])).toEqual([id]);
    } finally { await a.end(); await b.end(); }
  });

  it("while one run holds the row inside its transaction, a parallel run skips it instead of waiting", async () => {
    const id = await insert();
    const b = connect();
    try {
      await sql.begin(async tx => {
        expect(await claim(tx as never, id)).toHaveLength(1);
        expect(await claim(b, id)).toHaveLength(0);
      });
    } finally { await b.end(); }
  });

  it("never stays 'em processamento' forever: after 5 interruptions it goes to the team as failed", async () => {
    const id = await insert();
    for (let i = 0; i < 5; i++) { expect(await claim(sql, id)).toHaveLength(1); await expire(id); await sql`select public.recover_expired_ai_leases()`; }
    expect(await row(id)).toMatchObject({ status: "failed", issue_code: "processing_timeout", interruptions: 5 });
    expect(await claim(sql, id)).toHaveLength(0);
  });

  it("completed evaluations are untouched by recovery and never claimed again", async () => {
    const id = await insert({ status: "completed", tries: 1, overall_score: 8.1 });
    await sql`select public.recover_expired_ai_leases()`;
    expect(await claim(sql, id)).toHaveLength(0);
    expect(await row(id)).toMatchObject({ status: "completed", tries: 1, overall_score: "8.10" });
  });

  it("only administrators can reprocess, and reprocessing clears the interruption count", async () => {
    const id = await insert({ status: "failed", tries: 3, interruptions: 5, issue_code: "processing_timeout" });
    await expect(sql`select public.requeue_learning_ai_evaluation(${id})`).rejects.toThrow(/administração/);
    await sql.begin(async tx => {
      await tx`select set_config('test.admin', 'on', true)`;
      await tx`select public.requeue_learning_ai_evaluation(${id})`;
    });
    expect(await row(id)).toMatchObject({ status: "pending", tries: 0, interruptions: 0, issue_code: null });
  });
});

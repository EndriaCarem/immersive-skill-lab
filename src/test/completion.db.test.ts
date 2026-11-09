import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";
const host = process.env['COMPLETION_TEST_PG'];
describe.skipIf(!host)("completion database authorization and persistence", () => {
  const sql = postgres({ host, port: 6545, user: "postgres", database: "postgres", max: 1, onnotice: () => undefined });
  const user = "11111111-1111-4111-8111-111111111111";
  const order = "22222222-2222-4222-8222-222222222222";
  const enrollment = "33333333-3333-4333-8333-333333333333";
  beforeAll(async () => {
    await sql.unsafe(`create schema auth; create role anon; create role authenticated; create role service_role;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql as $f$ select '${user}'::uuid $f$;
      create function public.has_role(uuid,text) returns boolean language sql as $f$ select current_setting('test.admin',true)='on' $f$;
      create table public.profiles(id uuid,full_name text);
      create table public.learning_programs(id text primary key,content jsonb);
      create table public.commerce_orders(id uuid,total_cents integer,status text);
      create table public.commerce_enrollments(id uuid primary key,user_id uuid,product_id text,status text,expires_at timestamptz,enrolled_at timestamptz,order_id uuid);
      create table public.learning_submissions(id uuid primary key,user_id uuid,program_id text,activity_id text,grades jsonb,voided_at timestamptz,human_reviews jsonb default '[]',reviewed_at timestamptz);
      create table public.learning_ai_evaluations(submission_id uuid,status text,overall_score numeric);
      create schema storage;
      create table storage.objects(name text,bucket_id text);
      create function storage.foldername(text) returns text[] language sql as $f$ select string_to_array($1,'/') $f$;
      create table public.learning_activity_staff(video_path text,video_poster_path text);
      create table public.learning_activity_materials(file_path text);
      grant usage on schema storage,public,auth to authenticated;
      grant select on storage.objects,public.commerce_enrollments,public.learning_activity_staff to authenticated;
      alter table storage.objects enable row level security;
      create policy activity_media_enrolled_read on storage.objects for select to authenticated using(true);
    `);
    await sql.unsafe(readFileSync("drizzle/migrations/0019_completion_certificates_and_account_terms.sql", "utf8"));
    await sql.unsafe(readFileSync("drizzle/migrations/0020_personal_material_originals_private.sql", "utf8"));
  });
  afterAll(() => sql.end());
  beforeEach(async () => {
    await sql.unsafe("truncate public.learning_certificates,public.learning_test_access_log,public.account_legal_acceptances,public.platform_terms,auth.users,public.profiles,public.learning_ai_evaluations,public.learning_submissions,public.commerce_enrollments,public.commerce_orders,public.learning_programs cascade");
    await sql.unsafe("truncate storage.objects,public.learning_activity_staff,public.learning_activity_materials");
    await sql`select set_config('test.admin','on',false)`;
    await sql`insert into public.learning_programs values ('p',${sql.json({ title: "Curso autorizado", activities: [{ id: "a", title: "A" }, { id: "b", title: "B" }] })}::jsonb)`;
    await sql`insert into public.profiles values (${user},'Aluno de Teste')`;
    await sql`insert into public.commerce_orders values (${order},0,'free')`;
    await sql`insert into public.commerce_enrollments values (${enrollment},${user},'p','active',null,'2026-11-09T12:00:00Z',${order})`;
  });
  const add = async (a: string, score: number, pending = false) => {
    const id = crypto.randomUUID();
    await sql`insert into public.learning_submissions(id,user_id,program_id,activity_id,human_reviews) values (${id},${user},'p',${a},${sql.json(pending ? ["request"] : [])}::jsonb)`;
    await sql`insert into public.learning_ai_evaluations values (${id},'completed',${score})`;
    return id;
  };
  const issue = () => sql`select public.issue_learning_certificate(${user},'p') code`;
  it("persists and publicly verifies a real certificate using best scores >=5", async () => {
    await add("a",4); await add("a",5); await add("b",8);
    const [issued] = await issue(); const code = issued?.['code'];
    expect(code).toMatch(/^[a-f0-9]{32}$/);
    const [publicRow] = await sql`select * from public.verify_learning_certificate(${code})`;
    expect(publicRow?.['student_name']).toBe("Aluno de Teste"); expect(Number(publicRow?.['grade'])).toBe(6.5);
    expect((await issue())[0]?.['code']).toBe(code);
  });
  it("rejects missing or below-5 activities despite high course average", async () => {
    await add("a",10); await expect(issue()).rejects.toThrow(/mínima 5/);
    await add("b",4); await expect(issue()).rejects.toThrow(/mínima 5/);
  });
  it("blocks issuance during pending human review even after second delivery", async () => {
    const id = await add("a",8,true); await add("a",9); await add("b",8);
    await expect(issue()).rejects.toThrow(/revisão humana/);
    await sql`update public.learning_submissions set reviewed_at=now(),grades='[{"score":10}]'::jsonb where id=${id}`;
    await issue(); expect(Number((await sql`select grade from public.learning_certificates`)[0]?.['grade'])).toBe(9);
  });
  it("ignores voided delivery and rejects inactive enrollment", async () => {
    const id = await add("a",9); await add("b",9);
    await sql`update public.learning_submissions set voided_at=now() where id=${id}`;
    await expect(issue()).rejects.toThrow(/mínima 5/);
    await sql`update public.commerce_enrollments set expires_at='2020-01-01'`;
    await expect(issue()).rejects.toThrow(/Matrícula inativa/);
  });
  it("direct authenticated role cannot invoke privileged issuance", async () => {
    await sql.unsafe("set role authenticated");
    try { await expect(issue()).rejects.toThrow(/permission denied/); } finally { await sql.unsafe("reset role"); }
  });
  it("saves explicit six-month test expiry and logs authorization", async () => {
    const [row] = await sql`select public.configure_learning_test_access(${enrollment},'Turma autorizada') deadline`;
    expect(new Date(row?.['deadline']).toISOString()).toBe("2027-05-09T12:00:00.000Z");
    expect((await sql`select reason from public.learning_test_access_log`)[0]?.['reason']).toBe("Turma autorizada");
  });
  it("refuses paid enrollments and non-admin test expiry writes", async () => {
    await sql`update public.commerce_orders set total_cents=100,status='paid'`;
    await expect(sql`select public.configure_learning_test_access(${enrollment},'Turma autorizada')`).rejects.toThrow(/pagas/);
    await sql`select set_config('test.admin','off',false)`;
    await expect(sql`select public.configure_learning_test_access(${enrollment},'Turma autorizada')`).rejects.toThrow(/administração/);
  });
  it("signup acceptance is atomic and cannot omit published terms", async () => {
    const [term] = await sql`insert into public.platform_terms(version,body) values ('v1',${"Texto aprovado ".repeat(8)}) returning id`;
    await expect(sql`insert into auth.users values (${user},'{}')`).rejects.toThrow(/Aceite/);
    expect((await sql`select count(*) n from auth.users`)[0]?.['n']).toBe("0");
    await sql`insert into auth.users values (${user},${sql.json({ platform_terms_id: term?.['id'] })}::jsonb)`;
    expect((await sql`select terms_id from public.account_legal_acceptances`)[0]?.['terms_id']).toBe(term?.['id']);
  });
  it("learner cannot read original material directly, while authorized course video remains readable", async () => {
    await sql`insert into storage.objects values ('p/a/original.pdf','activity-media'),('p/a/video.mp4','activity-media')`;
    await sql`insert into public.learning_activity_materials values ('p/a/original.pdf')`;
    await sql`insert into public.learning_activity_staff values ('p/a/video.mp4',null)`;
    await sql.unsafe("set role authenticated");
    try { expect((await sql`select name from storage.objects`).map(r => r['name'])).toEqual(["p/a/video.mp4"]); }
    finally { await sql.unsafe("reset role"); }
    await sql`update public.commerce_enrollments set expires_at='2020-01-01'`;
    await sql.unsafe("set role authenticated");
    try { expect((await sql`select name from storage.objects`).length).toBe(0); }
    finally { await sql.unsafe("reset role"); }
  });
});
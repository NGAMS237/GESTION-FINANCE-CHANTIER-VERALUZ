#!/usr/bin/env node
// Copie les 7 tables et les fichiers du bucket `chantier-docs` de Supabase vers Convex.
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_KEY=<clé anon ou service_role> \
//     node scripts/import-supabase.mjs [--prod]
//
// Relançable : les lignes déjà importées (legacy_id) sont ignorées.
// Le déploiement Convex visé est celui de `npx convex run` (CONVEX_DEPLOY_KEY ou .env.local).
import { execFileSync } from "node:child_process";

const { SUPABASE_URL, SUPABASE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Définir SUPABASE_URL et SUPABASE_KEY");
  process.exit(1);
}
const convexFlags = process.argv.includes("--prod") ? ["--prod"] : [];
const BUCKET = "chantier-docs";
// Ordre imposé par les clés étrangères.
const TABLES = ["projects", "project_categories", "project_phases", "project_suppliers",
  "project_quotes", "project_payments", "project_documents"];
// Lots courts : les arguments passent sur la ligne de commande.
const BATCH = 50;

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=id`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`${table} : HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

function convexRun(fn, args) {
  const out = execFileSync("npx", ["convex", "run", ...convexFlags, fn, JSON.stringify(args)],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 64 * 1024 * 1024 }).trim();
  try { return JSON.parse(out); } catch { return out; }
}

const source = {};
for (const table of TABLES) {
  const rows = await fetchAll(table);
  source[table] = rows;
  let inserted = 0, skipped = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const r = convexRun("migration:importRows", { table, rows: rows.slice(i, i + BATCH) });
    inserted += r.inserted; skipped += r.skipped;
  }
  console.log(`${table.padEnd(20)} ${rows.length} lignes — ${inserted} importées, ${skipped} déjà présentes`);
}

let files = 0;
for (const doc of source.project_documents) {
  if (!doc.file_path) continue;
  const path = doc.file_path.split("/").map(encodeURIComponent).join("/");
  convexRun("migration:importFile", { legacyId: String(doc.id), url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}` });
  files++;
}
console.log(`fichiers             ${files} traités`);

// Contrôle : totaux par projet, Supabase contre Convex.
const after = convexRun("migration:totals", {});
const quotesOf = (pid) => {
  const cats = new Set(source.project_categories.filter((c) => c.project_id === pid).map((c) => c.id));
  const phases = new Set(source.project_phases.filter((p) => cats.has(p.category_id)).map((p) => p.id));
  return source.project_quotes.filter((q) => phases.has(q.phase_id));
};
let ok = true;
for (const p of source.projects) {
  const quotes = quotesOf(p.id);
  const qids = new Set(quotes.map((q) => q.id));
  const pays = source.project_payments.filter((x) => qids.has(x.quote_id));
  const before = {
    budget: Number(p.budget) || 0,
    quotes: quotes.length,
    engage: quotes.reduce((s, q) => s + Number(q.amount || 0), 0),
    paid: pays.reduce((s, x) => s + Number(x.amount || 0), 0),
    payments: pays.length,
    documents: source.project_documents.filter((d) => d.project_id === p.id).length,
  };
  const got = after[String(p.id)];
  const same = got && Object.keys(before).every((k) => before[k] === got[k]);
  ok &&= !!same;
  console.log(`${same ? "✅" : "❌"} ${p.name} : Supabase ${JSON.stringify(before)} / Convex ${JSON.stringify(got)}`);
}
process.exit(ok ? 0 : 1);

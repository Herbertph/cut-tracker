/**
 * Tiny persistence server for the cut tracker.
 *
 * Storage is picked automatically at boot:
 *   - DATABASE_URL present  -> Postgres (Railway injects this when a Postgres
 *                              database is attached to the project)
 *   - otherwise             -> a JSON file under ./data, which is enough to run
 *                              locally with `npm start`
 *
 * The whole tracker state is one JSON document. There is exactly one user, so
 * rows-per-day would buy nothing but ceremony.
 */

import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PIN = process.env.APP_PIN || null;   // optional; see README
const EMPTY = { version: 1, days: {}, lifts: {}, meas: {} };

/* ---------- storage adapters ---------- */

async function postgresStore(url) {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false }
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tracker_state (
      id         text PRIMARY KEY,
      data       jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  return {
    kind: "postgres",
    async read() {
      const r = await pool.query(`SELECT data FROM tracker_state WHERE id = 'default'`);
      return r.rows[0]?.data ?? EMPTY;
    },
    async write(data) {
      await pool.query(
        `INSERT INTO tracker_state (id, data) VALUES ('default', $1)
         ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = now()`,
        [data]
      );
    }
  };
}

async function fileStore() {
  const dir = process.env.DATA_DIR || path.join(__dirname, "data");
  const file = path.join(dir, "state.json");
  await fs.mkdir(dir, { recursive: true });
  return {
    kind: `file (${file})`,
    async read() {
      try { return JSON.parse(await fs.readFile(file, "utf8")); }
      catch { return EMPTY; }
    },
    async write(data) {
      // write-then-rename, so a crash mid-write can't leave a truncated file
      const tmp = file + ".tmp";
      await fs.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.rename(tmp, file);
    }
  };
}

const store = process.env.DATABASE_URL
  ? await postgresStore(process.env.DATABASE_URL)
  : await fileStore();

/* ---------- app ---------- */

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

// Optional shared PIN. Without APP_PIN set, the API is open — fine for a URL
// nobody else knows, but see the README before sharing the link.
app.use("/api", (req, res, next) => {
  if (!PIN) return next();
  if (req.get("x-app-pin") === PIN) return next();
  res.status(401).json({ error: "pin required" });
});

app.get("/api/state", async (_req, res) => {
  try { res.json(await store.read()); }
  catch (err) { console.error(err); res.status(500).json({ error: "read failed" }); }
});

app.put("/api/state", async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "expected a state object" });
  }
  try {
    await store.write({
      version: 1,
      days:  body.days  || {},
      lifts: body.lifts || {},
      meas:  body.meas  || {}
    });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "write failed" }); }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, storage: store.kind }));

app.listen(PORT, () => console.log(`tracker on :${PORT} — storage: ${store.kind}`));

# Cut Tracker

Personal fat-loss and training tracker. Single-user, no accounts, no build step.

## Deploying on Railway

1. Push this folder to a GitHub repo.
2. Railway → **New Project** → **Deploy from GitHub repo** → pick it.
3. In the same project, **New** → **Database** → **Add PostgreSQL**.
4. Open the app service → **Variables** → **Add Variable Reference** → `DATABASE_URL`.
5. Redeploy. Done.

Nothing else to configure. Railway sets `PORT`, the server reads it, and the
table is created on first boot.

Skipping step 3–4 also works: without `DATABASE_URL` the server writes to
`./data/state.json`. Fine locally, but on Railway that file is wiped on every
deploy, so attach the database.

## Running locally

```
npm install
npm start          # http://localhost:3000, stores in ./data/state.json
```

## Optional PIN

The API is open by default — anyone with the URL can read and write. For a URL
nobody knows, that is usually acceptable. To lock it, set `APP_PIN` in Railway
variables; requests then need an `x-app-pin` header. The current front end does
not send one, so only set this if you also patch the two `fetch` calls in
`public/index.html`.

## API

| Method | Path           | Purpose                        |
| ------ | -------------- | ------------------------------ |
| GET    | `/api/state`   | Read the whole tracker state   |
| PUT    | `/api/state`   | Replace the whole state        |
| GET    | `/api/health`  | Liveness plus active storage   |

State shape:

```json
{
  "version": 1,
  "days":  { "2026-08-17": { "w": 110.2, "train": true, "kcal": true } },
  "lifts": { "2026-09-14": { "r": "A", "s": { "a1": [[24, 10], [24, 9]] } } },
  "meas":  { "2026-08-17": { "waist": 112, "shoulder": 128, "neck": 42 } }
}
```

## How the client stores data

The browser keeps a mirror in `localStorage` so the page opens instantly and
keeps working with no signal. Every change writes locally first, then pushes to
the server after a short debounce. The status line in the **Dados** section
shows which of the two is current.

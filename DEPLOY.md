# Deploying to Railway

Start to finish: about 10 minutes. You need a GitHub account and a Railway
account. Nothing has to be installed on your machine except git.

---

## Step 1 — Unzip

Unzip `cut-tracker.zip`. You should see exactly this:

```
cut-tracker/
├── public/
│   └── index.html
├── server.js
├── package.json
├── README.md
├── DEPLOY.md
└── .gitignore
```

There is no `node_modules` folder and there should not be. Railway installs
dependencies itself.

---

## Step 2 — Push to GitHub

Create an empty repository on GitHub. Do **not** let GitHub add a README,
a `.gitignore`, or a license — the repo must start empty, otherwise the first
push is rejected.

Then, from inside the `cut-tracker` folder:

```bash
git init
git add .
git commit -m "Cut tracker"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/cut-tracker.git
git push -u origin main
```

Replace `YOUR-USERNAME` and the repo name with yours.

**Make the repo private.** The tracker has no login, and a public repo makes it
trivial to find the deployed URL.

---

## Step 3 — Create the Railway project

1. Go to [railway.app](https://railway.app) and open your dashboard.
2. Click **New Project**.
3. Choose **Deploy from GitHub repo**.
4. If Railway has not seen your repos before, it asks for GitHub access —
   grant it, and give it access to this repo specifically.
5. Pick `cut-tracker`.

Railway starts building immediately. It detects Node from `package.json`, runs
`npm install`, then `npm start`. The first build takes 1–2 minutes.

**Expected result:** the deployment goes green. If you open the logs you should
see a line like:

```
tracker on :8080 — storage: file (/app/data/state.json)
```

`file` is expected at this point. The next step fixes it.

---

## Step 4 — Add the database

This step is not optional. Railway rebuilds the container on every deploy, and
that wipes the JSON file — every weight you logged would disappear the next
time you push a change.

1. Inside the same project, click **New** (or the **+** in the canvas).
2. Choose **Database**.
3. Choose **Add PostgreSQL**.

Railway provisions it in a few seconds. You now have two boxes in the project:
your app and the database. They are **not** connected yet.

---

## Step 5 — Connect the database to the app

1. Click your **app** service (not the database).
2. Open the **Variables** tab.
3. Click **New Variable** → **Add Reference** (some versions label it
   *Variable Reference*).
4. Select the Postgres service, then select **`DATABASE_URL`**.
5. Click **Add**, then **Deploy** / **Apply changes** if prompted.

The app redeploys. This time the log should read:

```
tracker on :8080 — storage: postgres
```

**If it still says `file`, the reference did not get attached.** Go back to
Variables and confirm `DATABASE_URL` is listed there on the app service.

---

## Step 6 — Get your URL

1. On the app service, open **Settings** → **Networking**.
2. Under **Public Networking**, click **Generate Domain**.
3. Port: if it asks, enter **8080**. (The server reads Railway's `PORT`, so
   whatever Railway proposes is correct.)

You get something like `cut-tracker-production.up.railway.app`. Open it.

---

## Step 7 — Verify it actually persists

Do this now, not in three weeks:

1. Open the URL, type a weight, tick a checkbox.
2. Confirm the **Dados** section says `salvo no servidor` in green.
3. Visit `your-url/api/health` — it must say `"storage":"postgres"`.
4. Open the URL on a different device, or in a private window. Your data
   should be there.

Point 4 is the real test. If the second device shows an empty tracker, data is
still living in the browser and Step 5 did not take.

---

## Step 8 — Add it to your phone's home screen

**iPhone:** open the URL in Safari → Share → *Add to Home Screen*.
**Android:** open in Chrome → menu → *Add to Home screen*.

It gets an icon and opens without browser chrome. You will log a weight every
morning for eight months — the two taps you save are worth it.

---

## Things worth knowing

**The URL is public and there is no password.** Anyone with the link can read
and edit. For a random Railway subdomain nobody knows, that is normally fine.
To lock it, `server.js` already supports an `APP_PIN` environment variable —
but the front end does not send the header yet, so ask before enabling it.

**Cost.** One small Node service plus a Postgres instance sits comfortably
inside Railway's usage-based pricing for a personal app. Check your project's
usage tab after the first week if you want to be sure.

**Deploying a change.** Push to `main` and Railway redeploys automatically.
Your data lives in Postgres, so it survives every deploy.

**Backups.** The **Exportar JSON** button downloads everything. Do it every
month or two and keep the file somewhere. Databases are safe until they aren't.

---

## If something breaks

| Symptom | Cause | Fix |
| --- | --- | --- |
| Build fails immediately | `node_modules` got committed | Delete it, confirm `.gitignore` is present, commit and push again |
| Page loads, "offline" in yellow | The API is unreachable | Check the deploy logs for a crash |
| `/api/health` says `file` | `DATABASE_URL` not attached | Redo Step 5 |
| Data vanishes after a deploy | Same as above | Redo Step 5 |
| "Application failed to respond" | The service crashed on boot | Read the logs; the error is usually on the last line |

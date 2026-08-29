# Backups and data security

Everything here is free at this gym's data size. The whole database currently
fits in a 12 KB compressed file.

## The one-minute version

```bash
cd Backend
npm run backup
```

Run that **before every migration, seed, or risky deploy**. It is the single
highest-value habit in this document, because the most likely way this gym
loses data is not a hacker — it is a script doing exactly what it was told.

---

## What is actually at risk

| Collection | Why it matters |
|---|---|
| `invoices` | The record of who paid what. Financial and tax evidence |
| `subscriptions` | Who is allowed to walk in, and until when |
| `users` | The member list — and for WhatsApp members with no email, the **only** copy of their phone number |

Losing members is painful. Losing invoices is a tax problem.

## What each defence actually protects against

Backups are not one thing. These fail in different ways, which is why the plan
below uses more than one.

| What goes wrong | Likelihood | Atlas snapshot | Off-site copy |
|---|---|---|---|
| Someone deletes the wrong thing | **High** | Yes | Yes |
| A bad migration or deploy | **High** | Only if taken *before* | Yes |
| Atlas account compromised | Low | **No** — snapshots die with the account | **Yes** |
| Atlas region outage | Very low | Already handled by replication | Yes |

The third row is the reason an off-site copy exists at all. Atlas's own backups
live inside the Atlas account they are protecting.

---

## The free plan

### 1. Manual dumps before risky changes — free, do this today

```bash
cd Backend
npm run backup                 # writes to Backend/backups/
```

Covers the highest-probability failure. Costs nothing and takes a second.

### 2. Atlas built-in backups — free on paid tiers, absent on M0

Check **Atlas → your cluster → Backup**.

- **M0 (free tier): there are no backups. None.** If this is your tier, step 3
  is not optional, it is your only line of defence.
- **Flex / M2–M5:** daily snapshots with limited retention.
- **M10+:** continuous backup with point-in-time restore.

Turn it on if the tier offers it. It is the fastest way to undo a same-day
mistake.

### 3. Scheduled off-site copy — free, **implemented**

`.github/workflows/backup-database.yml` runs `npm run backup` every night at
02:30 UTC and uploads the file to Backblaze B2. It is **dormant until the five
secrets below exist** — without them the job runs and fails, which is the
correct behaviour: a backup job that appears to work is worse than one that
visibly does not.

**Where the file lands.** Object storage, not a folder and not a CI artifact.
**Backblaze B2** and **Cloudflare R2** both give 10 GB free permanently — far
beyond what this database will need for years.

> **This repository is public.** That is why the workflow uploads to B2 instead
> of using `actions/upload-artifact`, which would be the simpler choice.
> Artifacts on a public repo are downloadable by anyone, and a dump contains
> every member's phone number and every invoice. Do not swap it for artifacts
> unless the repo is made private first.

The property that matters is one people skip: create an application key that
can **write but not delete**. If the server is ever compromised, an attacker can
encrypt the live database but cannot erase the backup history. A key with
delete permission gives that away for nothing. Retention is therefore a
**bucket lifecycle rule in the B2 console**, not something the workflow does —
pruning from CI would need exactly the delete permission being withheld.

**Setup, once:**

1. Backblaze → create a bucket, **private**, e.g. `primex-gym-backups`.
2. Application Keys → add a key limited to that bucket, capabilities
   `listBuckets`, `listFiles`, `readFiles`, `writeFiles` — **not** `deleteFiles`.
3. Note the S3 endpoint shown on the bucket, e.g.
   `https://s3.us-west-004.backblazeb2.com`.
4. GitHub → Settings → Secrets and variables → Actions, add:
   `MONGODB_URI`, `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET`, `B2_ENDPOINT`.
5. Actions tab → Backup database → **Run workflow** to prove it works. Do not
   wait for the first scheduled run to find out.
6. Bucket → Lifecycle Settings → keep the last 30 days.

Secrets are never passed to workflows triggered by forked pull requests, so the
connection string is not exposed to drive-by PRs. It *is* readable by anyone
with admin on the repository — an accepted trade, because the alternative is no
scheduled backups at all.

**Alternatives, if you would rather not put the URI in GitHub Secrets:**

- **Render Cron Job** — the backend already runs on Render and already holds
  `MONGODB_URI`, so this adds *no new place* for the password to live. Render
  Cron is a paid service type, so it costs a little.
- **A scheduled task on your own machine** — free, adds no secret anywhere new,
  but only runs when the machine is on. Better than nothing, worse than either
  above.

### 4. Test a restore — free, and the step everyone skips

```bash
# Point at a scratch database, never the live one
MONGODB_URI="mongodb+srv://.../gym1-restoretest?..." \
  node scripts/restore-db.js backups/<file>.json.gz --confirm
```

An untested backup is a guess. The moment you need it is the worst possible
time to find out the file is empty or the command is wrong.

This has been tested once already: a full round trip verified that ObjectIds
and Dates survive as real types, and that the partial-unique indexes on `email`,
`phoneNormalized` and `referenceCode` come back intact. That last point is not
cosmetic — restoring documents without those indexes would silently allow
duplicate members.

---

## Restoring

The restore script defaults to **doing nothing**. That is deliberate: it is
built to be run on a bad day by someone under pressure.

```bash
node scripts/restore-db.js <file>                     # dry run, shows the plan
node scripts/restore-db.js <file> --confirm           # only into empty collections
node scripts/restore-db.js <file> --confirm --drop    # replaces data. Destructive
```

It refuses to overwrite a collection that already holds documents unless you
say `--drop` explicitly, so the common accident — reaching for a restore to
recover one record and flattening a week of good data — cannot happen silently.

---

## Securing the data, beyond backups

Free, and worth doing before real members exist.

1. **Rotate the database password.** The current one has been pasted into chat
   and sits in plaintext in `Backend/.env`. Atlas → Database Access → Edit →
   Edit Password. Update `Backend/.env` and the Render environment variable.

2. **Atlas → Network Access is `0.0.0.0/0`, and on Render that is correct.**
   Render's free and Starter plans give a service no stable outbound IP — they
   use shared regional ranges that change on deploy and are shared with other
   Render tenants, so allowlisting them would both break constantly and admit
   every other customer in the region. Dedicated IPs need a **Pro** workspace
   plus a per-IP-set monthly fee, an order of magnitude past the $7 Starter
   plan. Do not treat `0.0.0.0/0` as a to-do item here; it means "anyone may
   attempt a TLS handshake and then must authenticate", which is why items 1
   and 3 carry the real weight.

3. **Check the database user's role.** It should be `readWrite` on `gym1` only
   — not `atlasAdmin`. A leaked application password should not be able to drop
   databases or read other clusters.

4. **Keep secrets out of git.** Already correct: `.env` is ignored and has never
   been committed. `Backend/backups/` is ignored too, because dumps contain real
   member data.

5. **Turn on Atlas two-factor authentication.** The Atlas account is the master
   key to everything above.

## What is in a backup file

One gzipped Extended JSON file containing every document, plus every index
definition, plus metadata recording which database it came from and when.

Extended JSON rather than plain JSON is load-bearing: a plain `JSON.stringify`
would quietly turn every `_id` and every date into a string, and the backup
would look fine until the day it was restored.

`ctaclicks` is skipped — anonymous click telemetry that expires itself and is
not a business record.

# PrimeX

A full-stack membership platform for a multi-branch gym — branches, membership
plans, class scheduling and booking, a member account area, and an admin
dashboard, with a Paymob-backed join and payment flow.

The codebase started as an e-commerce storefront for a clothing brand. That
code is still here (see *Dormant shop* below) but is switched off and not part
of the gym product.

## Stack

**Backend** — NestJS 10, MongoDB (Mongoose), JWT auth in httpOnly cookies with
per-device refresh-token rotation, Paymob card payments, Nodemailer/Brevo, Zod
validation, Swagger.

**Frontend** — Next.js 16 (App Router, Turbopack), React 19, TanStack Query,
Tailwind CSS v4, shadcn/ui.

## Features

- Multi-branch locations with hours, facilities, geo-tagged local-SEO pages,
  and per-branch class access
- Membership plans with class-credit or unlimited access, a single-branch or
  all-branch tier, freeze days, and guest passes
- A dedicated join funnel — choose a plan and branch, pay by card (Paymob) or
  cash at the desk — separate from and unrelated to the dormant shop's cart
- Class scheduling from recurring weekly rules, with atomic no-oversell
  booking, credit consumption/refund, and a public timetable
- Class reviews, verified by an attended booking rather than a purchase
- Member account area: membership status, upcoming/past classes, payment
  history, profile and notification settings
- Admin dashboard: gym KPIs, branches, plans, trainers, class types and
  schedule, members with full subscription/payment/booking history, manual
  cash payments, website content editing, contact-enquiry inbox, audit log
- Accounts: email/password with OTP verification, Google OAuth, password reset

### Dormant shop

`products/`, `cart/`, `orders/`, `addresses/`, `wishlist/`, `back-in-stock/`
and the storefront pages under `Frontend/src/app` still exist and their tests
still run, but every route into them — frontend and backend — is gated behind
`SHOP_ENABLED=false` on both sides (see `Frontend/src/lib/features.ts` and
`Backend/src/config/env.validation.ts`) — the app 404s them and nothing links
to them, and their crons (`cart.scheduler.ts`, `orders.scheduler.ts`) are
no-ops. Reviving the shop is a flag flip plus real inventory and photography,
not a rebuild.

### Showcase mode

The site currently sells nothing online: membership sales (`join/`,
`invoices/`, `subscriptions/`, `payment/`), the class timetable (`classes/`,
`bookings/`) and public member accounts are all gated the same way, behind
`MEMBERSHIP_SALES_ENABLED`, `CLASS_BOOKING_ENABLED` and `MEMBER_ACCOUNTS_ENABLED`
respectively. Memberships and class signups are arranged with the gym team over
WhatsApp instead — see `Frontend/src/lib/whatsapp-messages.ts` and the
`WhatsAppCta` component. `/login` stays reachable regardless, since staff use
it to reach `/admin`. Flipping all three flags back on and restarting both
apps restores the full member-facing flow.

## Prerequisites

- Node.js 20+
- MongoDB running locally (or a connection string to a hosted instance)

## Setup

Install dependencies for each app separately — this is not a monorepo, and there
is no root package manifest.

```bash
cd Backend && npm install
cd ../Frontend && npm install
```

### Backend environment

Copy the example file and fill it in:

```bash
cd Backend && cp .env.example .env
```

`MONGODB_URI` and `JWT_SECRET` are required — `JWT_SECRET` must be at least 32
characters. Generate one with:

```bash
openssl rand -base64 48
```

Email, Google OAuth, and Paymob variables are optional; card checkout stays
disabled unless all four `PAYMOB_*` values are set. The server validates its
environment on boot and refuses to start with an invalid config.

### Frontend environment

Create `Frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

### Seed the database

```bash
cd Backend
npm run seed:gym
```

Idempotent — every document is matched on its slug and updated in place, so
re-running refreshes the data rather than duplicating it. Pass `--fresh` to
delete the gym collections first, which is what you want after a schema change
that leaves stale fields. It deliberately never touches users, subscriptions,
invoices or bookings — anything representing a real person or a real payment.

Seeds three Cairo branches, five membership plans plus the single-session
trial pass, ten class types, six trainers and six testimonials.

`npm run seed:categories` / `npm run seed:products` reseed the dormant shop
and are not part of the gym setup.

## Running

Start the backend first — the frontend's initial requests will fail until the API
is up.

```bash
cd Backend && npm run start:dev    # http://localhost:3000
```

```bash
cd Frontend && npm run dev         # http://localhost:3001
```

Swagger docs are served at `http://localhost:3000/api` in non-production
environments only.

## Tests

```bash
cd Backend && npm test
```

## Deployment

The two halves deploy to different places, for a reason worth stating: the
backend runs in-process cron jobs (`orders.scheduler.ts` releases stock from
abandoned card checkouts every minute) which need a host that keeps a process
alive. A serverless platform would never run them, and inventory reserved by an
abandoned checkout would never come back.

- **Frontend → Vercel.** Root directory `Frontend`.
- **Backend → Render.** See `render.yaml`; it deploys `Backend` as a web service.
- **Database → MongoDB Atlas.** A cloud backend cannot reach a database on your
  laptop, so local MongoDB is development-only.

### Moving the database to Atlas

Create a free M0 cluster, add a database user, and allow network access. Then
copy the local data up:

```bash
cd Backend
SOURCE_URI="mongodb://localhost:27017/primex" \
TARGET_URI="mongodb+srv://USER:PASS@CLUSTER.mongodb.net/primex" \
node scripts/migrate-database.js
```

Re-running is safe — documents are matched on `_id` and replaced. Pass `--drop`
to make the target mirror the source exactly. Indexes are not copied; the app
builds them from its Mongoose schemas on first start.

### Environment variables

On Render (`render.yaml` lists the rest; these are the ones marked `sync:false`):

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | the Atlas connection string |
| `JWT_SECRET` | 32+ chars — `openssl rand -base64 48` |
| `FRONTEND_URL` | the Vercel site URL; comma-separate several to allow preview domains |
| `BREVO_API_KEY` | see *Email in production* below |
| `MAIL_FROM_ADDRESS` | the sender address verified with Brevo |

On Vercel:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | the Render service URL |
| `NEXT_PUBLIC_SITE_URL` | the Vercel site URL |

`FRONTEND_URL` and `NEXT_PUBLIC_API_URL` point at each other. Getting either
wrong shows up as a CORS error in the browser rather than a failed build.

### Email in production

Gmail over SMTP is fine locally and does not work on a managed host: free Render
instances block outbound traffic on ports 25, 465 and 587, so mail silently goes
nowhere while everything looks healthy. `EmailService` therefore has two
transports and picks whichever is configured, preferring Brevo:

| Transport | When | Configured by |
| --- | --- | --- |
| Brevo HTTP API | production | `BREVO_API_KEY`, `MAIL_FROM_ADDRESS` |
| Gmail SMTP | local development | `EMAIL_USER`, `EMAIL_PASSWORD` |

Brevo verifies a **single sender address**, not a whole domain, so this works
before you own a brand domain — verify the address under *Senders* and use it as
`MAIL_FROM_ADDRESS`. The free tier allows 300 messages a day.

Whichever transport is active is logged at startup, along with whether it could
be reached, so "no email arrived" is answerable from the logs rather than by
guesswork.

### Why the cookies change in production

Auth cookies are `SameSite=Lax` in development, where the site and API share
`localhost` and are therefore same-site. Deployed they sit on different domains,
which makes every request cross-site, and a Lax cookie is not sent on those —
login would appear to succeed and every request after it would arrive signed
out. `AuthController` switches to `SameSite=None; Secure` when `NODE_ENV` is
`production`, which browsers only accept over HTTPS. Both hosts serve HTTPS, so
this works, but it does mean the API cannot be tested over plain HTTP in
production mode.

## Notes

Photography is served by the frontend itself out of `Frontend/public/images`
as root-relative paths stored directly on the documents that use them
(branches, trainers, class types) — no remote image host, no `remotePatterns`
entry, no upload pipeline. That was a deliberate fix: this repo used to store
`http://localhost:3001/...` image URLs, which resolved in production to the
visitor's own machine. Moving a gym to real photo uploads later means adding a
storage host to `next.config.ts`'s `remotePatterns`, not reviving that pattern.

`Backend/scripts/check-image-refs.js` cross-checks every image path stored in
the database against the files actually committed under `Frontend/public` —
run it before deploying. A path saved through the admin panel whose file was
never committed looks fine locally and renders broken the moment it ships,
since the database is shared across environments but the files ride along
with whichever commit is deployed.

`Frontend/image-source/` holds the unoptimised originals the files under
`Frontend/public/images` were produced from. It is deliberately **not**
committed — the web-ready copies are what the site serves, and the sources are
several megabytes each. Keep it locally if you have it; nothing at runtime
reads from it.

## Troubleshooting

**Images or pages fail to load after an abrupt shutdown.** If the dev server was
killed rather than stopped, Next.js's build cache can be left locked, producing
`EPERM: operation not permitted` rename errors on the next start. Delete
`Frontend/.next` and start again.

**The site loads but nothing works, and half the homepage is missing.** Check
the address bar: Next serves `/_next/*` only to the origin the dev server was
addressed by, and the API's CORS allowlist is pinned to `FRONTEND_URL`. Opening
the site as `127.0.0.1:3001` rather than `localhost:3001` fails both checks —
the HTML renders, no JavaScript loads, and every API call is blocked. Use
`localhost`.

**Atlas connections hang forever, in Compass and in the app.** A
`mongodb+srv://` string needs two DNS lookups: an SRV record for the server
list and a TXT record for the connection options. Some home routers and ISP
resolvers answer the first and silently drop the second, which surfaces as
`queryTxt ETIMEOUT` or a spinner that never resolves. Either set your DNS
servers to `1.1.1.1` / `8.8.8.8`, or use the non-SRV connection string Atlas
offers under "Connect → Drivers → older version", which lists the hosts
directly and needs no TXT lookup.

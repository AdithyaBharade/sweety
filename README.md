# 🩸 Sweety – Blood Glucose Tracker

Sweety is a small web app where a diabetes patient records up to **4 blood glucose readings a day**
and views **daily, month-to-date and previous-month reports**.

| Layer    | Tech |
| -------- | ---- |
| Backend  | Node.js, Express 5, Prisma ORM, PostgreSQL, JWT, bcrypt (`bcryptjs`) |
| Frontend | Next.js 15 (App Router, TypeScript), shadcn/ui + Tailwind CSS v4, Axios, AG Grid (tables), Recharts (chart) |
| Tests    | Jest + Supertest (API), Vitest + React Testing Library (reading form) |

> Built for the Kenpath *Junior Full Stack Developer – JavaScript & AI* assignment.
> The brief asked for "MERN + PostgreSQL"; I read that as **Express + React + Node with PostgreSQL**
> as the database (no MongoDB), with **Next.js** as the React framework.

---

## Features

**Required**
- Sign up / log in (name, email, password). Passwords are hashed with bcrypt; a JWT is returned.
- Every reading query is filtered by the logged-in user, so users only ever see their own data.
- Add, view, edit and delete readings (date, time slot, value in mg/dl).
- Validation on **both** the client (instant feedback) and the server (source of truth):

  | Rule | Message |
  | ---- | ------- |
  | Value is required | Please enter a glucose value. |
  | Whole number between 40 and 600 | Value must be between 40 and 600 mg/dl. |
  | One reading per slot per day | You already have an After lunch reading for this date. |
  | Max 4 readings per day | You can add only 4 readings per day. |
  | No future dates | Date cannot be in the future. |

- Reports for a selected date: **Daily**, **Month-to-date** and **Previous month**, each with
  highest, lowest, average (1 decimal) and count, plus a friendly empty state. The daily report
  lists each reading with its slot.

**Bonus tasks done**
- ✅ Pagination: `GET /api/readings?page=1&limit=20`
- ✅ Chart: line chart of this month's readings, one line per slot (Recharts)
- ✅ Docker: `docker-compose.yml` that starts PostgreSQL (app + test databases)
- ✅ Frontend tests: React Testing Library tests for the reading form

---

## Project structure

```
sweety/
├── docker-compose.yml         # PostgreSQL for local dev
├── server/                    # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma      # User, Reading, Slot enum
│   │   ├── migrations/
│   │   └── seed.js            # demo user + ~2 months of readings
│   ├── src/
│   │   ├── app.js             # express app (used by server.js and tests)
│   │   ├── server.js
│   │   ├── routes/            # auth, readings, reports
│   │   ├── services/          # business rules + DB access
│   │   ├── middleware/        # JWT auth, error handler
│   │   └── utils/             # validation, dates, stats, slots
│   └── tests/
│       ├── unit/              # validation, date ranges, stats (no DB needed)
│       └── integration/       # real HTTP + real test DB (supertest)
└── client/                    # Next.js frontend
    └── src/
        ├── app/               # pages: login, register, dashboard, reports
        ├── components/        # ReadingForm, ReadingsGrid (AG Grid), ReportCard, MonthChart
        │   └── ui/            # shadcn/ui components (button, card, input, alert-dialog, ...)
        └── lib/               # axios client, auth context, validation, types
```

---

## Getting started

### Prerequisites
- Node.js 20+ (developed on Node 22)
- PostgreSQL 14+ — either installed locally **or** via Docker

### 1. Install

```bash
git clone <this-repo-url> sweety
cd sweety
cd server && npm install
cd ../client && npm install
```

### 2. Set up the database

**Option A – Docker (easiest)**

```bash
# from the project root
docker compose up -d
```

This starts Postgres on `localhost:5432` with user/password `sweety`/`sweety` and creates two
databases: `sweety` and `sweety_test`. These match `server/.env.example`.

**Option B – a hosted database (e.g. Neon)**

Put the **pooled** connection string (host contains `-pooler`) in `DATABASE_URL` and the
**direct** one (same host without `-pooler`) in `DIRECT_URL`. Prisma migrations need the direct
connection; the app uses the pooled one.

**Option C – your own PostgreSQL**

```bash
createdb sweety
createdb sweety_test   # only needed for the integration tests
```

Then update `DATABASE_URL`, `DIRECT_URL` and `TEST_DATABASE_URL` in `server/.env` with your user and password.

**Create the tables and the demo data:**

```bash
cd server
cp .env.example .env        # then edit if needed
npx prisma migrate deploy   # creates tables from prisma/migrations
npm run db:seed             # demo user + sample readings
```

Demo login: **`demo@sweety.app` / `demo1234`**

### 3. Run the API

```bash
cd server
npm run dev        # http://localhost:4000  (auto-restarts on changes)
# or: npm start
```

### 4. Run the client

```bash
cd client
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

### 5. Run the tests

```bash
# API: unit tests (no database needed)
cd server && npm run test:unit

# API: everything incl. integration tests.
# Uses TEST_DATABASE_URL - this database is WIPED on every run.
# Integration tests are skipped automatically if TEST_DATABASE_URL is not set.
npm test

# Client: React Testing Library tests for the reading form
cd ../client && npm test
```

---

## Environment variables

`server/.env.example`

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | Postgres connection string for the app (pooled on Neon) |
| `DIRECT_URL` | Direct (non-pooled) connection used by `prisma migrate` - same as `DATABASE_URL` locally |
| `TEST_DATABASE_URL` | Separate Postgres DB for integration tests (wiped each run) |
| `PORT` | API port (default 4000) |
| `JWT_SECRET` | Secret used to sign login tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_ORIGIN` | Frontend URL allowed by CORS |
| `APP_TIMEZONE` | Time zone used to decide "today" for the future-date rule (default `Asia/Kolkata`) |

`client/.env.example`

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_API_URL` | Base URL of the API, e.g. `http://localhost:4000/api` |

---

## API

All endpoints except register/login need `Authorization: Bearer <token>`.
Errors always look like `{ "error": "message", "field": "value" }` (`field` is optional).

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/auth/register` | `{ name, email, password }` → `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | Current user |
| GET | `/api/readings?page=1&limit=20&from=&to=` | Paginated readings, newest first |
| POST | `/api/readings` | `{ date: "YYYY-MM-DD", slot, value }` |
| PUT | `/api/readings/:id` | Same body as POST |
| DELETE | `/api/readings/:id` | 204 on success |
| GET | `/api/reports?date=YYYY-MM-DD` | `{ daily, monthToDate, previousMonth }` |

Slots: `MORNING_FASTING`, `AFTER_BREAKFAST`, `AFTER_LUNCH`, `AFTER_DINNER`.

---

## Notes

### Design decisions
- **Dates are stored as a Postgres `DATE`, not a timestamp.** A reading belongs to a calendar
  day, not an instant. The API sends and receives plain `YYYY-MM-DD` strings, which avoids
  time-zone bugs where a reading moves to the previous day.
- **The database enforces the per-day rules too.** There is a unique index on
  `(user_id, date, slot)`. With only 4 slots, that also means at most 4 readings a day.
  The service checks first so it can return a friendly message. If two requests race, the index
  still rejects the duplicate, and the error is turned into the same friendly message.
- **Reports are calculated in Postgres** with Prisma `aggregate` (`MAX`, `MIN`, `AVG`, `COUNT`),
  then the average is rounded to 1 decimal.
- **Ownership checks return 404, not 403**, so a user can't find out which reading IDs exist.
- **Login errors are generic** ("Invalid email or password.") so emails can't be probed.
- Validation lives in small pure functions, so it is easy to unit-test without a database.

### Assumptions
- "Today" for the *future date* rule uses the server's `APP_TIMEZONE` (default India time). The
  client also blocks future dates using the browser's local date.
- Values must be **whole numbers**. A decimal such as `120.5` is rejected with "Value must be a
  whole number." The spec's example message is used when the value is out of range.
- When a day already has 4 readings, "You can add only 4 readings per day." is shown instead of
  the duplicate-slot message, because it explains the problem better.
- The reports date can be any past date or today (not a future date). The "previous month" is
  always the calendar month before the selected date, so in January it is December of the year
  before.
- Editing a reading can change its date or slot. The same rules apply, and the reading being
  edited does not count against itself.
- I used `bcryptjs` (a pure-JS implementation of bcrypt with the same hash format) so that
  install never needs native build tools.
- The JWT is kept in `localStorage` to keep the app simple. See improvements below.

### What I'd improve with more time
- Store the token in an **httpOnly cookie** (safer against XSS) and add refresh tokens.
- Rate-limit the login and register endpoints, and add `helmet` security headers.
- Share the validation rules between client and server (one package, or a schema library like
  zod) instead of keeping two copies in sync.
- Redis caching of reports, a BullMQ reminder job and a doctor role (the remaining bonus tasks).
- Let users mark readings as "before/after meal" notes, and export reports to PDF/CSV.
- End-to-end tests with Playwright, plus CI (GitHub Actions) running all test suites.
- Better accessibility testing and a dark mode.

---

## Screenshots

_Add screenshots / a short recording here:_ `docs/login.png`, `docs/dashboard.png`, `docs/reports.png`

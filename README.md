# Calorie Tracker

**English** · [Português](README.pt.md)

Snap a photo of your meal and get its calories and macros. Gemini identifies the foods and estimates their weight; nutrition data comes from the Portuguese Food Composition Table (INSA), USDA FoodData Central and Open Food Facts (barcodes).

A web app (Next.js) and a mobile app (Expo) on top of the same API (NestJS + Postgres). The interface is available in English and Portuguese.

![Demo: meal photo → foods identified → meal saved](docs/media/demo.gif)

<sub>Higher quality video: [docs/media/demo.mp4](docs/media/demo.mp4). Screenshots use a demo account with fictitious data (interface shown in Portuguese).</sub>

| Photo analysis | Daily summary |
| --- | --- |
| ![Photo analysis: identified foods, grams and macros](docs/media/analise.png) | ![Daily summary: calories, macros, meals, water, history and weight](docs/media/painel-claro.png) |

| Dark theme | Phone |
| --- | --- |
| ![Daily summary in dark theme](docs/media/painel-escuro.png) | <img src="docs/media/telemovel.png" alt="Phone layout" width="300"> |

## Structure

| Folder | What |
| --- | --- |
| `apps/api` | NestJS 12 API (TypeORM + Postgres, Gemini, USDA, OFF) |
| `apps/web` | Next.js 16 + Tailwind + shadcn/ui |
| `apps/mobile` | Expo SDK 58 app (Expo Router), Android and iOS |
| `packages/db` | Shared TypeORM entities |
| `packages/shared` | Zod schemas, API types and macro calculations (used by the API, web and mobile) |

## Getting started

Requirements: Node 24+, pnpm 11 (`corepack enable`) and Docker.

```sh
pnpm install
cp .env.example .env                       # set GEMINI_API_KEY (and USDA_API_KEY)
cp apps/web/.env.example apps/web/.env.local
pnpm db:up                                 # Postgres on localhost:5434
pnpm dev                                   # API on :3001, web on :3000
```

Migrations run automatically when the API starts. Open http://localhost:3000 and create an account.

> **Data from before login:** the first account created takes ownership of any meals, goals and corrections already in the database.

### Mobile app

```sh
cp apps/mobile/.env.example apps/mobile/.env   # EXPO_PUBLIC_API_URL = your PC's LAN IP, e.g. http://192.168.0.33:3001
cd apps/mobile && npx expo start               # open in Expo Go or a development build
```

The app uses the same account as the web. The session token is kept in SecureStore (Keychain/Keystore) and sent as an `Authorization: Bearer` header. Outside development mode the app requires the API to use HTTPS, and the production build blocks plain HTTP traffic on Android. The `preview` profile in `eas.json` makes an exception for testing on your local network.

## Portuguese food table (INSA)

Search and photo analysis look in the **INSA Food Composition Table** first (broa, bacalhau, francesinha, pastel de nata…) and only then in USDA. The data is not included in the repository (INSA copyright); import it like this:

1. Download the Excel file from <https://portfir.insa.min-saude.pt/> (e.g. `insa_tca.xlsx`).
2. `pnpm --filter api import:insa "C:\Users\<you>\Downloads\insa_tca.xlsx"` (the real path of the file you downloaded)

You can run it again when a new version is released: existing foods are updated. The terms of use require the source to be shown visibly. The web and the app already show the citation (`INSA_ATTRIBUTION` in `packages/shared`); if you switch table versions, update the text there.

## Features

- **Photo → macros:** Gemini identifies the foods (with Portuguese and English names), their weight and its confidence. Composite dishes (francesinha, lasagne…) count as a single item, without repeating their ingredients. Each item shows the identified name and, below it, the database food used for the macros; low-confidence items are flagged for review. Correcting a food teaches the app for next time. Photos are resized to 1024 px before upload.
- **Search:** words in any order, accent-insensitive and typo-tolerant (`pg_trgm` + `unaccent` in Postgres).
- **Barcodes:** packaged products via Open Food Facts.
- **Saved meals:** swap a food or fix the grams; macros are recalculated on the server.
- **Water:** glasses and bottles, a daily goal and progress for the day.
- **Weight:** one entry per day and a chart of the last 90 days.

## Tests

```sh
pnpm test          # unit tests
pnpm test:e2e      # full API against the calorie_tracker_test database
```

The e2e tests never use the development database: they use `TEST_DATABASE_URL` or `DATABASE_URL` with `_test` in the database name, and refuse to run against any other. Create it once with:

```sh
docker compose exec postgres createdb -U calorie calorie_tracker_test
```

## Migrations

```sh
pnpm --filter api migration:generate src/migrations/MigrationName
```

Then add the generated class to the `migrations` list in `apps/api/src/data-source.ts`.

## Security

- **Login** with email and password. Passwords are hashed with scrypt (OWASP parameters); the session is a random token in an `httpOnly` + `SameSite=Lax` cookie (`__Host-` + `Secure` in production), and only the token's SHA-256 is stored in the database. Logging out invalidates the session on the server.
- **Password recovery** by email (Resend). The link carries the token in the fragment (`#token=`), expires in 30 minutes, works only once and only the latest one is valid. The "forgot password" response is always the same whether the account exists or not, and changing the password ends all open sessions. Without `RESEND_API_KEY`, the link is printed in the API terminal during development.
- **Every route requires a session** (global guard), except `/auth/login`, `/auth/register` and `/health`. Meals, goals and food corrections belong to each user. Requesting someone else's data returns 404.
- **Nutrition values always come from the server:** the API ignores any macros sent by the client and uses the USDA/OFF/INSA values stored in the database.
- **Rate limiting:** 120 requests/min per IP; 5/min on login and registration; 10/min on photo analysis (each one uses Gemini quota).
- **CSRF:** data-changing requests are only accepted from `WEB_ORIGIN` (Fetch Metadata). CORS with credentials only for that origin.
- **Headers:** helmet-style security headers on the API; CSP, `X-Frame-Options`, `nosniff` and HSTS (in production) on the web.

### Before going online

1. `NODE_ENV=production` (enables `Secure` cookies) and HTTPS on both the web and the API.
2. The web and the API must be on the **same site** (e.g. `app.example.com` and `api.example.com`), otherwise the browser won't send the `SameSite=Lax` cookie.
3. After creating your account, set `ALLOW_REGISTRATION=false` if you don't want other people signing up (and using your Gemini quota).
4. Behind a proxy (nginx, Caddy, etc.), set `TRUST_PROXY=1` so the rate limiter sees the real IP.
5. Change `POSTGRES_PASSWORD` and don't expose the Postgres port.
6. Set `RESEND_API_KEY` and a `MAIL_FROM` with a domain verified in Resend, otherwise password recovery won't send emails.

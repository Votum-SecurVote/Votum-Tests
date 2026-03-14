# Votum-Tests

End-to-end, Regression and smoke test suite for the **Votum SecureVote** platform.  
Tests are written in **Playwright + JavaScript (ESM)** and hit real running services .

---

## Prerequisites

| Tool        | Version  |
|-------------|----------|
| Node.js     | ≥ 18     |
| Docker      | ≥ 24     |
| docker-compose | ≥ 2   |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if your local ports or credentials differ
```

### 3. Start services

```bash
npm run docker:up
# or: docker-compose up -d
```

Wait ~15 seconds for the backend to connect to PostgreSQL and finish startup.

---

## Running Tests

| Command                    | What it runs                          |
|----------------------------|---------------------------------------|
| `npm test`                 | All tests                             |
| `npm run test:smoke`       | Smoke tests only (`@smoke`)           |
| `npm run test:e2e`         | All E2E tests (`@e2e`)                |
| `npm run test:regression`  | All smoke + E2E tests                 |
| `npm run test:auth`        | Auth tests only (`@auth`)             |
| `npm run test:voting`      | Voting tests only (`@voting`)         |
| `npm run test:admin`       | Admin tests only (`@admin`)           |
| `npm run test:registration`| Registration tests only (`@registration`) |
| `npm run test:report`      | Open the last HTML report             |

### Recommended first run

```bash
# 1. Bring up the stack
npm run docker:up

# 2. (Optional) wait for backend health
sleep 15

# 3. Run smoke tests first — confirm backend is reachable
npm run test:smoke

# 4. Run full suite
npm test
```

---

## Stopping Services

```bash
npm run docker:down
# or: docker-compose down
```

To also remove the PostgreSQL volume:

```bash
docker-compose down -v
```

---

## Notes

- Tests run **sequentially** (`workers: 1`) to prevent DB race conditions.  
- Each test suite uses `beforeAll`/`afterAll` to seed and clean data via `db-seeder.js`.  
- The `db-seeder.js` connects directly to PostgreSQL — ensure `DB_*` env vars match `docker-compose.yml`.  
- Frontend services (`votum-admin`, `votum-kiosk`, `votum-userreg`) are commented out in `docker-compose.yml` and will be enabled once their images are built.

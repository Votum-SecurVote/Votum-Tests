# Votum-Tests

End-to-end and smoke test suite for the **Votum SecureVote** platform.  
Tests are written in **Playwright + JavaScript (ESM)** and hit real running services — no mocking.

---

## Architecture

```
Votum-Tests/
├── docker-compose.yml          # PostgreSQL + votum-backend (+ commented-out frontends)
├── playwright.config.js        # Playwright configuration
├── package.json
├── .env.example                # Copy to .env before running
│
├── helpers/
│   ├── api-client.js           # Reusable HTTP client for all API endpoints
│   └── db-seeder.js            # PostgreSQL seeder / cleaner
│
├── fixtures/
│   ├── users.json              # Test user data
│   ├── elections.json          # Test election / candidate data
│   ├── test-photo.jpg          # Placeholder photo for upload tests
│   └── test-aadhaar.pdf        # Placeholder Aadhaar PDF for upload tests
│
├── docker/
│   └── init-db.sql             # PostgreSQL schema initialisation
│
└── tests/
    ├── smoke/
    │   └── backend-health.spec.js
    └── e2e/
        ├── auth/
        │   ├── admin-login.spec.js
        │   └── user-login.spec.js
        ├── voting/
        │   ├── cast-vote.spec.js
        │   └── results.spec.js
        ├── admin/
        │   ├── create-election.spec.js
        │   └── approve-users.spec.js
        └── registration/
            └── register-user.spec.js
```

---

## Prerequisites

| Tool        | Version  |
|-------------|----------|
| Node.js     | ≥ 18     |
| Docker      | ≥ 24     |
| docker-compose | ≥ 2   |

The backend Docker image **`votum-backend:1.0`** must already be built locally:

```bash
# In the Votum-backend repository:
docker build -t votum-backend:1.0 .
```

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

## Test ID Reference

| ID              | Description                                      |
|-----------------|--------------------------------------------------|
| SMOKE-001–010   | Backend endpoint reachability checks             |
| E2E-AUTH-001    | Admin login → JWT                                |
| E2E-AUTH-002    | Admin login → wrong password → 401              |
| E2E-AUTH-003    | Admin login → unknown email → 401               |
| E2E-AUTH-004    | Admin JWT → access protected endpoint           |
| E2E-AUTH-005    | No token → protected endpoint → 401/403         |
| E2E-AUTH-006    | User login → JWT                                 |
| E2E-AUTH-007    | User login → wrong password → 401               |
| E2E-AUTH-008    | User JWT → GET /api/user/profile                |
| E2E-AUTH-009    | No token → /api/user/profile → 401/403          |
| E2E-AUTH-010    | User token → admin endpoint → 401/403           |
| E2E-VOTE-001    | Kiosk login → JWT                                |
| E2E-VOTE-002    | GET active election                              |
| E2E-VOTE-003    | GET ballots for election                         |
| E2E-VOTE-004    | GET candidates for ballot                        |
| E2E-VOTE-005    | hasVoted → false before voting                  |
| E2E-VOTE-006    | Cast valid vote → 200                           |
| E2E-VOTE-007    | hasVoted → true after voting                    |
| E2E-VOTE-008    | Double vote → 400/409                           |
| E2E-VOTE-009    | Unauthenticated vote → 401/403                  |
| E2E-VOTE-010    | Admin GET election results → 200                |
| E2E-VOTE-011    | Results contain vote count data                 |
| E2E-VOTE-012    | Non-admin cannot access results → 401/403       |
| E2E-VOTE-013    | GET results non-existent election → 404         |
| E2E-ADMIN-001   | Create election → 200/201                       |
| E2E-ADMIN-002   | Add ballot to election                          |
| E2E-ADMIN-003   | Add candidate to ballot                         |
| E2E-ADMIN-004   | Full create flow                                |
| E2E-ADMIN-005   | Create election without auth → 401/403          |
| E2E-ADMIN-006   | Create election missing fields → 400            |
| E2E-ADMIN-007   | GET pending users                               |
| E2E-ADMIN-008   | Approve pending user                            |
| E2E-ADMIN-009   | Approved user not in pending list               |
| E2E-ADMIN-010   | Reject pending user                             |
| E2E-ADMIN-011   | GET pending without token → 401/403             |
| E2E-ADMIN-012   | Approve non-existent user → 404                 |
| E2E-REG-001     | Register new user → 200/201                     |
| E2E-REG-002     | Registered user status is PENDING              |
| E2E-REG-003     | Duplicate email → 400/409                       |
| E2E-REG-004     | Missing required fields → 400                  |
| E2E-REG-005     | Photo optional (200/201 or 400)                 |
| E2E-REG-006     | Duplicate Aadhaar → 400/409                     |

---

## Notes

- Tests run **sequentially** (`workers: 1`) to prevent DB race conditions.  
- Each test suite uses `beforeAll`/`afterAll` to seed and clean data via `db-seeder.js`.  
- The `db-seeder.js` connects directly to PostgreSQL — ensure `DB_*` env vars match `docker-compose.yml`.  
- Frontend services (`votum-admin`, `votum-kiosk`, `votum-userreg`) are commented out in `docker-compose.yml` and will be enabled once their images are built.

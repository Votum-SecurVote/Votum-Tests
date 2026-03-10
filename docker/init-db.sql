-- docker/init-db.sql
-- Initializes the Votum PostgreSQL schema.
-- Mirrors the Spring Boot JPA entities so the database is ready before
-- the backend starts (DDL-auto=update will reconcile on first boot).

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Admins ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
    id         BIGSERIAL    PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    role       VARCHAR(20)  NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL    PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    phone          VARCHAR(15),
    password       VARCHAR(255) NOT NULL,
    aadhaar_number VARCHAR(12)  UNIQUE,
    photo_url      VARCHAR(500),
    aadhaar_pdf_url VARCHAR(500),
    status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    role           VARCHAR(20)  NOT NULL DEFAULT 'USER',
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Elections ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS elections (
    id          BIGSERIAL    PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    start_date  TIMESTAMP    NOT NULL,
    end_date    TIMESTAMP    NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Ballots ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ballots (
    id          BIGSERIAL    PRIMARY KEY,
    election_id BIGINT       NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Candidates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
    id          BIGSERIAL    PRIMARY KEY,
    ballot_id   BIGINT       NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    party       VARCHAR(100),
    description TEXT,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Votes ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ballot_id    BIGINT    NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
    candidate_id BIGINT    NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    voted_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, ballot_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_status        ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_aadhaar       ON users(aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_elections_status    ON elections(status);
CREATE INDEX IF NOT EXISTS idx_ballots_election    ON ballots(election_id);
CREATE INDEX IF NOT EXISTS idx_candidates_ballot   ON candidates(ballot_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_ballot   ON votes(user_id, ballot_id);

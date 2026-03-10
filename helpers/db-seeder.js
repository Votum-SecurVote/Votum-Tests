// helpers/db-seeder.js
// PostgreSQL seeder — seeds baseline data and cleans between tests.
// Connects directly to the test database; never mocks anything.

import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'votumdb',
      user: process.env.DB_USER || 'votum',
      password: process.env.DB_PASSWORD || 'votum_secret',
    });
  }
  return pool;
}

/**
 * Hash aadhaar the same way the backend does: SHA-256 → Base64.
 */
function hashAadhaar(aadhaarNumber) {
  return crypto.createHash('sha256').update(String(aadhaarNumber)).digest('base64');
}

/**
 * Seed the admin user into the admins table.
 * Uses bcrypt to hash the password so Spring Security can verify it.
 */
export async function seedAdmin() {
  const hashedPassword = await bcrypt.hash('Admin@1234', 10);
  await getPool().query(
    `INSERT INTO admins (id, full_name, email, password_hash, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    ['Test Admin', 'admin@votum.test', hashedPassword]
  );
}

/**
 * Seed a voter user with APPROVED status.
 * @param {object} user - { name, email, phone, password, aadhaarNumber }
 * @returns {Promise<object>} the inserted user row
 */
export async function seedApprovedUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const hashedAadhaar  = hashAadhaar(user.aadhaarNumber);
  const result = await getPool().query(
    `INSERT INTO users (id, full_name, email, phone, password_hash, aadhaar_hash, status, role,
                        dob, address, gender, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'APPROVED', 'USER',
             '1990-01-01', '123 Test Street', 'MALE', NOW(), NOW())
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           aadhaar_hash  = EXCLUDED.aadhaar_hash,
           status        = 'APPROVED'
     RETURNING *`,
    [user.name, user.email, user.phone, hashedPassword, hashedAadhaar]
  );
  return result.rows[0];
}

/**
 * Seed a pending voter user.
 * @param {object} user - { name, email, phone, password, aadhaarNumber }
 * @returns {Promise<object>} the inserted user row
 */
export async function seedPendingUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const hashedAadhaar  = hashAadhaar(user.aadhaarNumber);
  const result = await getPool().query(
    `INSERT INTO users (id, full_name, email, phone, password_hash, aadhaar_hash, status, role,
                        dob, address, gender, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'PENDING', 'USER',
             '1990-01-01', '123 Test Street', 'MALE', NOW(), NOW())
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           aadhaar_hash  = EXCLUDED.aadhaar_hash,
           status        = 'PENDING'
     RETURNING *`,
    [user.name, user.email, user.phone, hashedPassword, hashedAadhaar]
  );
  return result.rows[0];
}

/**
 * Seed an election with a ballot and candidates.
 * @param {object} electionData - { title, description, startDate, endDate }
 * @param {object} ballotData   - { title, description }
 * @param {Array}  candidates   - [{ name, party, description }, ...]
 * @returns {Promise<{ election, ballot, candidates }>}
 */
export async function seedElection(electionData, ballotData, candidates = []) {
  const electionResult = await getPool().query(
    `INSERT INTO elections (id, title, description, start_date, end_date, status, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'PUBLISHED', NOW())
     RETURNING *`,
    [electionData.title, electionData.description, electionData.startDate, electionData.endDate]
  );
  const election = electionResult.rows[0];

  const ballotResult = await getPool().query(
    `INSERT INTO ballots (id, election_id, title, description, status, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'ACTIVE', NOW())
     RETURNING *`,
    [election.id, ballotData.title, ballotData.description]
  );
  const ballot = ballotResult.rows[0];

  const seededCandidates = [];
  for (const candidate of candidates) {
    const candResult = await getPool().query(
      `INSERT INTO candidates (id, ballot_id, name, party, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())
       RETURNING *`,
      [ballot.id, candidate.name, candidate.party]
    );
    seededCandidates.push(candResult.rows[0]);
  }

  return { election, ballot, candidates: seededCandidates };
}

/**
 * Clean all test data — truncates in dependency order.
 * Safe to call between tests.
 */
export async function cleanAll() {
  await getPool().query(`
    TRUNCATE TABLE votes, candidates, ballots, elections, users
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Clean only user and vote data (keep elections/ballots intact).
 */
export async function cleanUsers() {
  await getPool().query(`
    TRUNCATE TABLE votes, users
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Close the database pool — call only once, after ALL test suites finish.
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

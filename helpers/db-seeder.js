// helpers/db-seeder.js
// PostgreSQL seeder — seeds baseline data and cleans between tests.
// Connects directly to the test database; never mocks anything.

import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'votumdb',
  user: process.env.DB_USER || 'votum',
  password: process.env.DB_PASSWORD || 'votum_secret',
});

/**
 * Seed the admin user into the admins table.
 * Uses bcrypt to hash the password so Spring Security can verify it.
 */
export async function seedAdmin() {
  const hashedPassword = await bcrypt.hash('Admin@1234', 10);
  await pool.query(
    `INSERT INTO admins (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password`,
    ['Test Admin', 'admin@votum.test', hashedPassword, 'ADMIN']
  );
}

/**
 * Seed a voter user with APPROVED status.
 * @param {object} user - { name, email, phone, password, aadhaarNumber }
 * @returns {Promise<object>} the inserted user row
 */
export async function seedApprovedUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, phone, password, aadhaar_number, status, role)
     VALUES ($1, $2, $3, $4, $5, 'APPROVED', 'USER')
     ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           status   = 'APPROVED'
     RETURNING *`,
    [user.name, user.email, user.phone, hashedPassword, user.aadhaarNumber]
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
  const result = await pool.query(
    `INSERT INTO users (name, email, phone, password, aadhaar_number, status, role)
     VALUES ($1, $2, $3, $4, $5, 'PENDING', 'USER')
     ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           status   = 'PENDING'
     RETURNING *`,
    [user.name, user.email, user.phone, hashedPassword, user.aadhaarNumber]
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
  const electionResult = await pool.query(
    `INSERT INTO elections (title, description, start_date, end_date, status)
     VALUES ($1, $2, $3, $4, 'ACTIVE')
     RETURNING *`,
    [electionData.title, electionData.description, electionData.startDate, electionData.endDate]
  );
  const election = electionResult.rows[0];

  const ballotResult = await pool.query(
    `INSERT INTO ballots (election_id, title, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [election.id, ballotData.title, ballotData.description]
  );
  const ballot = ballotResult.rows[0];

  const seededCandidates = [];
  for (const candidate of candidates) {
    const candResult = await pool.query(
      `INSERT INTO candidates (ballot_id, name, party, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [ballot.id, candidate.name, candidate.party, candidate.description]
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
  await pool.query(`
    TRUNCATE TABLE votes, candidates, ballots, elections, users
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Clean only user and vote data (keep elections/ballots intact).
 */
export async function cleanUsers() {
  await pool.query(`
    TRUNCATE TABLE votes, users
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Close the database pool — call in afterAll hooks.
 */
export async function closePool() {
  await pool.end();
}

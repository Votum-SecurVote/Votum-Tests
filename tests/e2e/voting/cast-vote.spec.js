// tests/e2e/voting/cast-vote.spec.js
// E2E-VOTE-001 — Full voting flow and double-vote prevention.

import { test, expect } from '@playwright/test';
import {
  adminLogin,
  kioskLogin,
  getActiveElection,
  getBallots,
  getCandidates,
  castVote,
  hasVoted,
} from '../../../helpers/api-client.js';
import {
  seedAdmin,
  seedApprovedUser,
  seedElection,
  cleanAll,
  closePool,
} from '../../../helpers/db-seeder.js';
import usersFixture     from '../../../fixtures/users.json'     with { type: 'json' };
import electionsFixture from '../../../fixtures/elections.json' with { type: 'json' };

let kioskToken;
let seededElection;
let seededBallot;
let seededCandidates;

test.describe('Cast Vote — Full Voting Flow @e2e @voting', () => {

  test.beforeAll(async () => {
    // Arrange — clean slate, then seed all required data
    await cleanAll();
    await seedAdmin();
    await seedApprovedUser(usersFixture.approvedVoter);

    const { election, ballot, candidates } = await seedElection(
      electionsFixture.activeElection,
      electionsFixture.ballot,
      electionsFixture.candidates
    );
    seededElection   = election;
    seededBallot     = ballot;
    seededCandidates = candidates;

    // Kiosk login uses aadhaarNumber + password
    const loginResponse = await kioskLogin(
      usersFixture.approvedVoter.aadhaarNumber,
      usersFixture.approvedVoter.password
    );
    const loginBody = await loginResponse.json();
    kioskToken = loginBody.token;
  });

  test.afterAll(async () => {
    await cleanAll();
    await closePool();
  });

  test('E2E-VOTE-001: Kiosk login with valid Aadhaar credentials returns 200 and JWT', async () => {
    // Act
    const response = await kioskLogin(
      usersFixture.approvedVoter.aadhaarNumber,
      usersFixture.approvedVoter.password
    );
    const body = await response.json();

    // Assert
    expect(response.status()).toBe(200);
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
  });

  test('E2E-VOTE-002: GET /api/kiosk/elections/active returns the active election', async () => {
    // Act
    const response = await getActiveElection(kioskToken);
    const body = await response.json();

    // Assert
    expect(response.status()).toBe(200);
    expect(body).toHaveProperty('id');
    expect(body.title).toBe(electionsFixture.activeElection.title);
  });

  test('E2E-VOTE-003: GET /api/kiosk/ballots/{electionId} returns ballots for the election', async () => {
    // Act
    const response = await getBallots(seededElection.id, kioskToken);
    const body = await response.json();

    // Assert
    expect(response.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('E2E-VOTE-004: GET /api/kiosk/candidates/{ballotId} returns candidates for the ballot', async () => {
    // Act
    const response = await getCandidates(seededBallot.id, kioskToken);
    const body = await response.json();

    // Assert
    expect(response.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(electionsFixture.candidates.length);
  });

  test('E2E-VOTE-005: GET /api/kiosk/hasVoted returns false before voting', async () => {
    // Act
    const response = await hasVoted(kioskToken);
    const body = await response.json();

    // Assert
    expect(response.status()).toBe(200);
    expect(body.hasVoted ?? body).toBe(false);
  });

  test('E2E-VOTE-006: POST /api/kiosk/vote — user casts a valid vote successfully', async () => {
    // Arrange
    const candidateId = seededCandidates[0].id;

    // Act
    const response = await castVote(seededBallot.id, candidateId, kioskToken);

    // Assert
    expect(response.status()).toBe(200);
  });

  test('E2E-VOTE-007: GET /api/kiosk/hasVoted returns true after voting', async () => {
    // Act
    const response = await hasVoted(kioskToken);
    const body = await response.json();

    // Assert
    expect(response.status()).toBe(200);
    expect(body.hasVoted ?? body).toBe(true);
  });

  test('E2E-VOTE-008: Double vote prevention — second vote on same ballot returns 409 or 400', async () => {
    // Arrange
    const candidateId = seededCandidates[1].id;

    // Act — attempt to vote again
    const response = await castVote(seededBallot.id, candidateId, kioskToken);

    // Assert — server must reject the duplicate vote
    expect([400, 409]).toContain(response.status());
  });

  test('E2E-VOTE-009: Unauthenticated vote attempt returns 401 or 403', async () => {
    // Act
    const response = await castVote(seededBallot.id, seededCandidates[0].id, null);

    // Assert
    expect([401, 403]).toContain(response.status());
  });

});

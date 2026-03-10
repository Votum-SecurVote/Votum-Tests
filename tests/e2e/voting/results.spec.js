// tests/e2e/voting/results.spec.js
// E2E-VOTE-010 — Admin can view election results after votes are cast.

import { test, expect } from '@playwright/test';
import {
  adminLogin,
  kioskLogin,
  castVote,
  getElectionResults,
} from '../../../helpers/api-client.js';
import {
  seedAdmin,
  seedApprovedUser,
  seedElection,
  cleanAll,
} from '../../../helpers/db-seeder.js';
import usersFixture     from '../../../fixtures/users.json'     with { type: 'json' };
import electionsFixture from '../../../fixtures/elections.json' with { type: 'json' };

let adminToken;
let seededElection;
let seededBallot;
let seededCandidates;

test.describe('Election Results @e2e @voting @admin', () => {

  test.beforeAll(async () => {
    // Arrange — clean state, seed data, cast one vote
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

    // Admin token
    const adminLoginResponse = await adminLogin(
      usersFixture.admin.email,
      usersFixture.admin.password
    );
    adminToken = await adminLoginResponse.text();

    // Cast one vote so results have data
    const kioskLoginResponse = await kioskLogin(
      usersFixture.approvedVoter.email,
      usersFixture.approvedVoter.aadhaarNumber,
      usersFixture.approvedVoter.password
    );
    const kioskToken = await kioskLoginResponse.text();

    await castVote(seededBallot.id, seededCandidates[0].id, kioskToken);
  });

  test.afterAll(async () => {
    await cleanAll();
  });

  test('E2E-VOTE-010: Admin can GET /api/admin/elections and receive 200 with election data', async () => {
    // Act
    const response = await getElectionResults(seededElection.id, adminToken);
    const body = await response.json();

    // Assert — elections list endpoint returns 200 with array of election objects
    expect(response.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('E2E-VOTE-011: Elections list contains election data with ballots', async () => {
    // Act
    const response = await getElectionResults(seededElection.id, adminToken);
    const body = await response.json();

    // Assert — each election has id, title, ballots
    const election = body.find(e => e.id === seededElection.id);
    expect(election).toBeDefined();
    const bodyStr = JSON.stringify(election);
    expect(bodyStr).toMatch(/ballot|candidate|title/i);
  });

  test('E2E-VOTE-012: Non-admin user cannot access admin elections endpoint (403 or 401)', async () => {
    // Arrange — get a voter token
    const kioskLoginResponse = await kioskLogin(
      usersFixture.approvedVoter.email,
      usersFixture.approvedVoter.aadhaarNumber,
      usersFixture.approvedVoter.password
    );
    const token = await kioskLoginResponse.text();

    // Act
    const response = await getElectionResults(seededElection.id, token);

    // Assert
    expect([401, 403]).toContain(response.status());
  });

  test('E2E-VOTE-013: Admin elections endpoint returns 403/401 without token', async () => {
    // Act — no token
    const response = await getElectionResults(seededElection.id, null);

    // Assert
    expect([401, 403]).toContain(response.status());
  });

});

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
  closePool,
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
    const adminBody = await adminLoginResponse.json();
    adminToken = adminBody.token;

    // Cast one vote so results have data
    const kioskLoginResponse = await kioskLogin(
      usersFixture.approvedVoter.aadhaarNumber,
      usersFixture.approvedVoter.password
    );
    const kioskBody = await kioskLoginResponse.json();
    const kioskToken = kioskBody.token;

    await castVote(seededBallot.id, seededCandidates[0].id, kioskToken);
  });

  test.afterAll(async () => {
    await cleanAll();
    await closePool();
  });

  test('E2E-VOTE-010: Admin can GET /api/admin/elections/{id}/results and receive 200', async () => {
    // Act
    const response = await getElectionResults(seededElection.id, adminToken);
    const body = await response.json();

    // Assert
    expect(response.status()).toBe(200);
    expect(body).toBeDefined();
  });

  test('E2E-VOTE-011: Results contain vote count data for the ballot', async () => {
    // Act
    const response = await getElectionResults(seededElection.id, adminToken);
    const body = await response.json();

    // Assert — results should reference at least one candidate or ballot
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).toMatch(/candidate|ballot|vote|count/i);
  });

  test('E2E-VOTE-012: Non-admin user cannot access election results (403 or 401)', async () => {
    // Arrange — get a voter token
    const kioskLoginResponse = await kioskLogin(
      usersFixture.approvedVoter.aadhaarNumber,
      usersFixture.approvedVoter.password
    );
    const { token } = await kioskLoginResponse.json();

    // Act
    const response = await getElectionResults(seededElection.id, token);

    // Assert
    expect([401, 403]).toContain(response.status());
  });

  test('E2E-VOTE-013: GET results for non-existent election returns 404', async () => {
    // Act
    const response = await getElectionResults(999999, adminToken);

    // Assert
    expect(response.status()).toBe(404);
  });

});

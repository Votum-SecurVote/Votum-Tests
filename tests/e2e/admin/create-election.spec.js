// tests/e2e/admin/create-election.spec.js
// E2E-ADMIN-001 — Admin creates election, adds ballot, adds candidate.

import { test, expect } from '@playwright/test';
import {
  adminLogin,
  createElection,
  createBallot,
  addCandidate,
} from '../../../helpers/api-client.js';
import {
  seedAdmin,
  cleanAll,
  closePool,
} from '../../../helpers/db-seeder.js';
import usersFixture     from '../../../fixtures/users.json'     with { type: 'json' };
import electionsFixture from '../../../fixtures/elections.json' with { type: 'json' };

let adminToken;

test.describe('Create Election @e2e @admin', () => {

  test.beforeAll(async () => {
    // Arrange
    await cleanAll();
    await seedAdmin();

    const response = await adminLogin(
      usersFixture.admin.email,
      usersFixture.admin.password
    );
    const body = await response.json();
    adminToken = body.token;
  });

  test.afterAll(async () => {
    await cleanAll();
    await closePool();
  });

  test('E2E-ADMIN-001: Admin can create a new election — returns 200 or 201 with election data', async () => {
    // Act
    const response = await createElection(electionsFixture.newElection, adminToken);
    const body = await response.json();

    // Assert
    expect([200, 201]).toContain(response.status());
    expect(body).toHaveProperty('id');
    expect(body.title).toBe(electionsFixture.newElection.title);
  });

  test('E2E-ADMIN-002: Admin can add a ballot to the created election', async () => {
    // Arrange — create election first
    const electionResponse = await createElection(electionsFixture.newElection, adminToken);
    const election = await electionResponse.json();

    // Act
    const response = await createBallot(election.id, electionsFixture.newBallot, adminToken);
    const body = await response.json();

    // Assert
    expect([200, 201]).toContain(response.status());
    expect(body).toHaveProperty('id');
    expect(body.title).toBe(electionsFixture.newBallot.title);
  });

  test('E2E-ADMIN-003: Admin can add a candidate to the created ballot', async () => {
    // Arrange — create election and ballot
    const electionResponse = await createElection(electionsFixture.newElection, adminToken);
    const election = await electionResponse.json();
    const ballotResponse = await createBallot(election.id, electionsFixture.newBallot, adminToken);
    const ballot = await ballotResponse.json();

    // Act
    const response = await addCandidate(ballot.id, electionsFixture.newCandidate, adminToken);
    const body = await response.json();

    // Assert
    expect([200, 201]).toContain(response.status());
    expect(body).toHaveProperty('id');
    expect(body.name).toBe(electionsFixture.newCandidate.name);
  });

  test('E2E-ADMIN-004: Full flow — election → ballot → multiple candidates', async () => {
    // Arrange
    const electionResponse = await createElection(
      { ...electionsFixture.newElection, title: 'Full Flow Election' },
      adminToken
    );
    const election = await electionResponse.json();

    const ballotResponse = await createBallot(election.id, electionsFixture.newBallot, adminToken);
    const ballot = await ballotResponse.json();

    // Act — add all candidates from fixture
    const candidateResponses = await Promise.all(
      electionsFixture.candidates.map(c => addCandidate(ballot.id, c, adminToken))
    );

    // Assert
    for (const res of candidateResponses) {
      expect([200, 201]).toContain(res.status());
    }
  });

  test('E2E-ADMIN-005: Creating election without auth token returns 401 or 403', async () => {
    // Act
    const response = await createElection(electionsFixture.newElection, null);

    // Assert
    expect([401, 403]).toContain(response.status());
  });

  test('E2E-ADMIN-006: Creating election with missing required fields returns 400', async () => {
    // Act — send incomplete data
    const response = await createElection({ title: '' }, adminToken);

    // Assert
    expect(response.status()).toBe(400);
  });

});

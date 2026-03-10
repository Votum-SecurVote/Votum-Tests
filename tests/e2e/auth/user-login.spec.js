// tests/e2e/auth/user-login.spec.js
// E2E-AUTH-006 — User (voter) login flow.
// Verifies: correct credentials → JWT, protected endpoint access.

import { test, expect } from '@playwright/test';
import { userLogin, getUserProfile } from '../../../helpers/api-client.js';
import {
  seedAdmin,
  seedApprovedUser,
  cleanUsers,
} from '../../../helpers/db-seeder.js';
import usersFixture from '../../../fixtures/users.json' with { type: 'json' };

test.describe('User Login @e2e @auth', () => {

  test.beforeAll(async () => {
    // Arrange — seed an approved voter so login can succeed
    await seedAdmin();
    await cleanUsers();
    await seedApprovedUser(usersFixture.approvedVoter);
  });

  test.afterAll(async () => {
    await cleanUsers();
  });

  test('E2E-AUTH-006: User login with valid credentials returns 200 and JWT', async () => {
    // Act
    const response = await userLogin(
      usersFixture.approvedVoter.email,
      usersFixture.approvedVoter.password
    );
    const token = await response.text();

    // Assert
    expect(response.status()).toBe(200);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
    expect(token.split('.').length).toBe(3);
  });

  test('E2E-AUTH-007: User login with wrong password returns 4xx', async () => {
    // Act
    const response = await userLogin(usersFixture.approvedVoter.email, 'BadPassword!');

    // Assert — backend returns 400 for bad credentials
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('E2E-AUTH-008: Approved user JWT can access GET /api/user/profile', async () => {
    // Arrange
    const loginResponse = await userLogin(
      usersFixture.approvedVoter.email,
      usersFixture.approvedVoter.password
    );
    const token = await loginResponse.text();

    // Act
    const profileResponse = await getUserProfile(token);
    const profile = await profileResponse.json();

    // Assert
    expect(profileResponse.status()).toBe(200);
    expect(profile).toHaveProperty('email', usersFixture.approvedVoter.email);
  });

  test('E2E-AUTH-009: Accessing /api/user/profile without token returns 401 or 403', async () => {
    // Act
    const response = await getUserProfile(null);

    // Assert
    expect([401, 403]).toContain(response.status());
  });

  test('E2E-AUTH-010: User token cannot access admin-only endpoint', async () => {
    // Arrange
    const loginResponse = await userLogin(
      usersFixture.approvedVoter.email,
      usersFixture.approvedVoter.password
    );
    const token = await loginResponse.text();

    // Act
    const response = await fetch(
      `${process.env.BASE_URL || 'http://localhost:8080'}/api/admin/users/pending`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Assert — user should be forbidden from admin endpoints
    expect([401, 403]).toContain(response.status);
  });

});

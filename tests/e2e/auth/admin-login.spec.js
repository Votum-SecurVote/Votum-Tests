// tests/e2e/auth/admin-login.spec.js
// E2E-AUTH-001 — Admin login flow.
// Verifies: correct credentials → JWT, wrong credentials → 4xx.

import { test, expect } from '@playwright/test';
import { adminLogin } from '../../../helpers/api-client.js';
import { seedAdmin } from '../../../helpers/db-seeder.js';
import adminFixture from '../../../fixtures/users.json' with { type: 'json' };

test.describe('Admin Login @e2e @auth @admin', () => {

  test.beforeAll(async () => {
    // Arrange — ensure admin user exists in the database
    await seedAdmin();
  });

  test('E2E-AUTH-001: Admin login with valid credentials returns 200 and JWT token', async () => {
    // Act
    const response = await adminLogin(adminFixture.admin.email, adminFixture.admin.password);
    const token = await response.text();

    // Assert
    expect(response.status()).toBe(200);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
    // JWT has 3 dot-separated base64 segments
    expect(token.split('.').length).toBe(3);
  });

  test('E2E-AUTH-002: Admin login with wrong password returns 4xx', async () => {
    // Act
    const response = await adminLogin(adminFixture.admin.email, 'WrongPassword!');

    // Assert — backend returns 400 for bad credentials
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('E2E-AUTH-003: Admin login with non-existent email returns 4xx', async () => {
    // Act
    const response = await adminLogin('ghost@votum.test', 'SomePassword!');

    // Assert
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('E2E-AUTH-004: Admin JWT token can access protected endpoint GET /api/admin/pending-users', async () => {
    // Arrange
    const loginResponse = await adminLogin(adminFixture.admin.email, adminFixture.admin.password);
    const token = await loginResponse.text();

    // Act
    const protectedResponse = await fetch(
      `${process.env.BASE_URL || 'http://localhost:8080'}/api/admin/pending-users`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Assert
    expect(protectedResponse.status).toBe(200);
  });

  test('E2E-AUTH-005: Request to protected admin endpoint without token returns 401 or 403', async () => {
    // Act — no Authorization header
    const response = await fetch(
      `${process.env.BASE_URL || 'http://localhost:8080'}/api/admin/pending-users`
    );

    // Assert
    expect([401, 403]).toContain(response.status);
  });

});

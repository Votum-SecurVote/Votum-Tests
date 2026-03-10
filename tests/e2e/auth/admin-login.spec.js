// tests/e2e/auth/admin-login.spec.js
// E2E-AUTH-001 — Admin login flow.
// Verifies: correct credentials → JWT, wrong password → 401.

import { test, expect } from '@playwright/test';
import { adminLogin } from '../../../helpers/api-client.js';
import { seedAdmin, closePool } from '../../../helpers/db-seeder.js';
import adminFixture from '../../../fixtures/users.json' with { type: 'json' };

test.describe('Admin Login @e2e @auth @admin', () => {

  test.beforeAll(async () => {
    // Arrange — ensure admin user exists in the database
    await seedAdmin();
  });

  test.afterAll(async () => {
    await closePool();
  });

  test('E2E-AUTH-001: Admin login with valid credentials returns 200 and JWT token', async () => {
    // Act
    const response = await adminLogin(adminFixture.admin.email, adminFixture.admin.password);
    const body = await response.json();

    // Assert
    expect(response.status()).toBe(200);
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(10);
  });

  test('E2E-AUTH-002: Admin login with wrong password returns 401', async () => {
    // Act
    const response = await adminLogin(adminFixture.admin.email, 'WrongPassword!');
    
    // Assert
    expect(response.status()).toBe(401);
  });

  test('E2E-AUTH-003: Admin login with non-existent email returns 401', async () => {
    // Act
    const response = await adminLogin('ghost@votum.test', 'SomePassword!');

    // Assert
    expect(response.status()).toBe(401);
  });

  test('E2E-AUTH-004: Admin JWT token can access protected endpoint GET /api/admin/users/pending', async () => {
    // Arrange
    const loginResponse = await adminLogin(adminFixture.admin.email, adminFixture.admin.password);
    const { token } = await loginResponse.json();

    // Act
    const protectedResponse = await fetch(
      `${process.env.BASE_URL || 'http://localhost:8080'}/api/admin/users/pending`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Assert — 200 means the token is valid and the admin role is recognized
    expect(protectedResponse.status).toBe(200);
  });

  test('E2E-AUTH-005: Request to protected admin endpoint without token returns 401 or 403', async () => {
    // Act — no Authorization header
    const response = await fetch(
      `${process.env.BASE_URL || 'http://localhost:8080'}/api/admin/users/pending`
    );

    // Assert
    expect([401, 403]).toContain(response.status);
  });

});

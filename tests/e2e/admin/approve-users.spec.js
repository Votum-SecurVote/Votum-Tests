// tests/e2e/admin/approve-users.spec.js
// E2E-ADMIN-007 — Admin approves and rejects pending users.

import { test, expect } from '@playwright/test';
import {
  adminLogin,
  getPendingUsers,
  approveUser,
  rejectUser,
} from '../../../helpers/api-client.js';
import {
  seedAdmin,
  seedPendingUser,
  cleanUsers,
} from '../../../helpers/db-seeder.js';
import usersFixture from '../../../fixtures/users.json' with { type: 'json' };

let adminToken;
let pendingUserId;
let rejectUserId;

test.describe('Approve and Reject Users @e2e @admin', () => {

  test.beforeAll(async () => {
    await cleanUsers();
    await seedAdmin();

    const pendingUser = await seedPendingUser(usersFixture.pendingVoter);
    pendingUserId = pendingUser.id;

    const rejectCandidate = {
      ...usersFixture.newRegistrant,
      email: 'toreject@votum.test',
      aadhaarNumber: '999988887777',
    };
    const rejectUser2 = await seedPendingUser(rejectCandidate);
    rejectUserId = rejectUser2.id;

    const response = await adminLogin(
      usersFixture.admin.email,
      usersFixture.admin.password
    );
    adminToken = await response.text();
  });

  test.afterAll(async () => {
    await cleanUsers();
  });

  test('E2E-ADMIN-007: GET /api/admin/pending-users returns list of pending users', async () => {
    const response = await getPendingUsers(adminToken);
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    const pendingStatuses = body.map(u => (u.status || '').toUpperCase());
    expect(pendingStatuses.every(s => s === 'PENDING')).toBe(true);
  });

  test('E2E-ADMIN-008: Admin can approve a pending user — returns 200', async () => {
    const response = await approveUser(pendingUserId, adminToken);
    expect(response.status()).toBe(200);
  });

  test('E2E-ADMIN-009: Approved user no longer appears in pending list', async () => {
    const response = await getPendingUsers(adminToken);
    const body = await response.json();
    const ids = body.map(u => u.userId || u.id);
    expect(ids).not.toContain(pendingUserId);
  });

  test('E2E-ADMIN-010: Admin can reject a pending user — returns 200', async () => {
    const response = await rejectUser(rejectUserId, adminToken);
    expect(response.status()).toBe(200);
  });

  test('E2E-ADMIN-011: GET pending users without token returns 401 or 403', async () => {
    const response = await getPendingUsers(null);
    expect([401, 403]).toContain(response.status());
  });

  test('E2E-ADMIN-012: Approve non-existent user returns 4xx error', async () => {
    const response = await approveUser('00000000-0000-0000-0000-000000000000', adminToken);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

});

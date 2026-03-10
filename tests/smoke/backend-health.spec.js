// tests/smoke/backend-health.spec.js
// SMOKE-001 — Verify the backend is running and all endpoints are reachable.
// These tests do NOT require auth tokens; they only check HTTP reachability.

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Backend Health Checks @smoke', () => {

  test('SMOKE-001: Backend root is reachable (TCP)', async ({ request }) => {
    // Any response (even 404) from the server means it is up
    const response = await request.get(`${BASE}/`);
    expect(response.status()).not.toBe(0);
  });

  test('SMOKE-002: POST /api/auth/login returns 400 or 401 (not 5xx)', async ({ request }) => {
    const response = await request.post(`${BASE}/api/auth/login`, {
      data: {},
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('SMOKE-003: POST /api/auth/register endpoint is reachable', async ({ request }) => {
    const response = await request.post(`${BASE}/api/auth/register`, {
      data: {},
    });
    // 400 = validation error from server (endpoint exists), not 404 or 5xx
    expect(response.status()).not.toBe(404);
    expect(response.status()).toBeLessThan(500);
  });

  test('SMOKE-004: POST /api/admin/login endpoint is reachable', async ({ request }) => {
    const response = await request.post(`${BASE}/api/admin/login`, {
      data: {},
    });
    expect(response.status()).not.toBe(404);
    expect(response.status()).toBeLessThan(500);
  });

  test('SMOKE-005: GET /api/admin/users/pending requires auth (401 or 403)', async ({ request }) => {
    const response = await request.get(`${BASE}/api/admin/users/pending`);
    expect([401, 403]).toContain(response.status());
  });

  test('SMOKE-006: POST /api/kiosk/login endpoint is reachable', async ({ request }) => {
    const response = await request.post(`${BASE}/api/kiosk/login`, {
      data: {},
    });
    expect(response.status()).not.toBe(404);
    expect(response.status()).toBeLessThan(500);
  });

  test('SMOKE-007: GET /api/kiosk/elections/active requires auth (401 or 403)', async ({ request }) => {
    const response = await request.get(`${BASE}/api/kiosk/elections/active`);
    expect([401, 403]).toContain(response.status());
  });

  test('SMOKE-008: GET /api/user/profile requires auth (401 or 403)', async ({ request }) => {
    const response = await request.get(`${BASE}/api/user/profile`);
    expect([401, 403]).toContain(response.status());
  });

  test('SMOKE-009: GET /api/admin/elections/1/results requires auth (401 or 403)', async ({ request }) => {
    const response = await request.get(`${BASE}/api/admin/elections/1/results`);
    expect([401, 403]).toContain(response.status());
  });

  test('SMOKE-010: GET /api/kiosk/hasVoted requires auth (401 or 403)', async ({ request }) => {
    const response = await request.get(`${BASE}/api/kiosk/hasVoted`);
    expect([401, 403]).toContain(response.status());
  });

});

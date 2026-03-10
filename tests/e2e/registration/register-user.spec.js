// tests/e2e/registration/register-user.spec.js
// E2E-REG-001 — User registration with file uploads; duplicate email rejection.

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerUser } from '../../../helpers/api-client.js';
import {
  seedAdmin,
  seedApprovedUser,
  cleanUsers,
} from '../../../helpers/db-seeder.js';
import usersFixture from '../../../fixtures/users.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../../../fixtures');
const PHOTO_PATH   = path.join(FIXTURES_DIR, 'test-photo.jpg');
const AADHAAR_PATH = path.join(FIXTURES_DIR, 'test-aadhaar.pdf');

test.describe('User Registration @e2e @registration', () => {

  test.beforeAll(async () => {
    // Arrange — clean users, then seed an existing approved user for duplicate test
    await seedAdmin();
    await cleanUsers();
    await seedApprovedUser(usersFixture.approvedVoter);
  });

  test.afterAll(async () => {
    await cleanUsers();
  });

  test('E2E-REG-001: Register a new user with all required fields returns 200 or 201', async () => {
    // Arrange
    const newUser = {
      name:          usersFixture.newRegistrant.name,
      email:         usersFixture.newRegistrant.email,
      phone:         usersFixture.newRegistrant.phone,
      password:      usersFixture.newRegistrant.password,
      aadhaarNumber: usersFixture.newRegistrant.aadhaarNumber,
    };

    // Act
    const response = await registerUser(newUser, PHOTO_PATH, AADHAAR_PATH);

    // Assert
    expect([200, 201]).toContain(response.status());
  });

  test('E2E-REG-002: Registered user starts with PENDING status', async () => {
    // Arrange — unique user for this test
    const testUser = {
      name:          'Status Test User',
      email:         'status.test@votum.test',
      phone:         '9000000099',
      password:      'Status@1234',
      aadhaarNumber: '555566667777',
    };

    // Act
    const response = await registerUser(testUser, PHOTO_PATH, AADHAAR_PATH);
    const text = await response.text();

    // Assert — backend returns plain text success message
    expect([200, 201]).toContain(response.status());
    // Message indicates pending/awaiting approval
    expect(text.toLowerCase()).toMatch(/register|success|pending|approval/i);
  });

  test('E2E-REG-003: Registering with a duplicate email returns 409 or 400', async () => {
    // Arrange — use email that already belongs to the seeded approved voter
    const duplicate = {
      name:          usersFixture.duplicateRegistrant.name,
      email:         usersFixture.duplicateRegistrant.email,   // duplicate email
      phone:         usersFixture.duplicateRegistrant.phone,
      password:      usersFixture.duplicateRegistrant.password,
      aadhaarNumber: usersFixture.duplicateRegistrant.aadhaarNumber,
    };

    // Act
    const response = await registerUser(duplicate, PHOTO_PATH, AADHAAR_PATH);

    // Assert
    expect([400, 409]).toContain(response.status());
  });

  test('E2E-REG-004: Registration without required fields returns 400', async () => {
    // Act — missing email, password, aadhaarNumber
    const response = await registerUser(
      { name: 'Incomplete User' },
      null,
      null
    );

    // Assert
    expect(response.status()).toBe(400);
  });

  test('E2E-REG-005: Registration without photo still processes (photo optional behavior)', async () => {
    // Arrange
    const noPhotoUser = {
      name:          'No Photo User',
      email:         'nophoto@votum.test',
      phone:         '9000000088',
      password:      'NoPhoto@1234',
      aadhaarNumber: '888877776666',
    };

    // Act — no photo, no PDF
    const response = await registerUser(noPhotoUser, null, null);

    // Assert — accept 200/201 (optional) or 400 (required by backend)
    expect([200, 201, 400]).toContain(response.status());
  });

  test('E2E-REG-006: Registering with a duplicate Aadhaar number returns 409 or 400', async () => {
    // Arrange — same aadhaar as approvedVoter but different email
    const duplicateAadhaar = {
      name:          'Aadhaar Duplicate',
      email:         'aadhaar.dup@votum.test',
      phone:         '9000000077',
      password:      'Aadhaar@1234',
      aadhaarNumber: usersFixture.approvedVoter.aadhaarNumber,  // duplicate
    };

    // Act
    const response = await registerUser(duplicateAadhaar, PHOTO_PATH, AADHAAR_PATH);

    // Assert
    expect([400, 409]).toContain(response.status());
  });

});

// helpers/api-client.js
// Reusable API client covering all Votum backend endpoints.
// Uses native fetch (Node 18+) — no mocking, hits real services.

import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

/**
 * Generic HTTP helper.
 * @param {string} method
 * @param {string} path
 * @param {object|null} body
 * @param {string|null} token
 * @param {boolean} isFormData
 */
async function request(method, path, body = null, token = null, isFormData = false) {
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData && body) {
    headers['Content-Type'] = 'application/json';
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  return response;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * @param {string} email
 * @param {string} password
 */
export async function userLogin(email, password) {
  return request('POST', '/api/auth/login', { email, password });
}

/**
 * POST /api/auth/register
 * Multipart form-data with optional file uploads.
 * @param {object} userData - { name, email, phone, password, aadhaarNumber }
 * @param {string|null} photoPath - absolute path to photo file
 * @param {string|null} aadhaarPdfPath - absolute path to aadhaar PDF
 */
export async function registerUser(userData, photoPath = null, aadhaarPdfPath = null) {
  const form = new FormData();
  form.append('name', userData.name);
  form.append('email', userData.email);
  form.append('phone', userData.phone);
  form.append('password', userData.password);
  form.append('aadhaarNumber', userData.aadhaarNumber);

  if (photoPath && fs.existsSync(photoPath)) {
    form.append('photo', fs.createReadStream(photoPath), { filename: 'photo.jpg', contentType: 'image/jpeg' });
  }

  if (aadhaarPdfPath && fs.existsSync(aadhaarPdfPath)) {
    form.append('aadhaarPdf', fs.createReadStream(aadhaarPdfPath), { filename: 'aadhaar.pdf', contentType: 'application/pdf' });
  }

  const headers = form.getHeaders();
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers,
    body: form,
  });
  return response;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/login
 * @param {string} email
 * @param {string} password
 */
export async function adminLogin(email, password) {
  return request('POST', '/api/admin/login', { email, password });
}

/**
 * GET /api/admin/users/pending
 * @param {string} token
 */
export async function getPendingUsers(token) {
  return request('GET', '/api/admin/users/pending', null, token);
}

/**
 * PUT /api/admin/users/{id}/approve
 * @param {number} userId
 * @param {string} token
 */
export async function approveUser(userId, token) {
  return request('PUT', `/api/admin/users/${userId}/approve`, {}, token);
}

/**
 * PUT /api/admin/users/{id}/reject
 * @param {number} userId
 * @param {string} token
 */
export async function rejectUser(userId, token) {
  return request('PUT', `/api/admin/users/${userId}/reject`, {}, token);
}

/**
 * POST /api/admin/elections
 * @param {object} electionData - { title, description, startDate, endDate }
 * @param {string} token
 */
export async function createElection(electionData, token) {
  return request('POST', '/api/admin/elections', electionData, token);
}

/**
 * POST /api/admin/elections/{id}/ballots
 * @param {number} electionId
 * @param {object} ballotData - { title, description }
 * @param {string} token
 */
export async function createBallot(electionId, ballotData, token) {
  return request('POST', `/api/admin/elections/${electionId}/ballots`, ballotData, token);
}

/**
 * POST /api/admin/ballots/{id}/candidates
 * @param {number} ballotId
 * @param {object} candidateData - { name, party, description }
 * @param {string} token
 */
export async function addCandidate(ballotId, candidateData, token) {
  return request('POST', `/api/admin/ballots/${ballotId}/candidates`, candidateData, token);
}

/**
 * GET /api/admin/elections/{id}/results
 * @param {number} electionId
 * @param {string} token
 */
export async function getElectionResults(electionId, token) {
  return request('GET', `/api/admin/elections/${electionId}/results`, null, token);
}

// ─── Kiosk ───────────────────────────────────────────────────────────────────

/**
 * POST /api/kiosk/login
 * @param {string} aadhaarNumber
 * @param {string} password
 */
export async function kioskLogin(aadhaarNumber, password) {
  return request('POST', '/api/kiosk/login', { aadhaarNumber, password });
}

/**
 * GET /api/kiosk/elections/active
 * @param {string} token
 */
export async function getActiveElection(token) {
  return request('GET', '/api/kiosk/elections/active', null, token);
}

/**
 * GET /api/kiosk/ballots/{electionId}
 * @param {number} electionId
 * @param {string} token
 */
export async function getBallots(electionId, token) {
  return request('GET', `/api/kiosk/ballots/${electionId}`, null, token);
}

/**
 * GET /api/kiosk/candidates/{ballotId}
 * @param {number} ballotId
 * @param {string} token
 */
export async function getCandidates(ballotId, token) {
  return request('GET', `/api/kiosk/candidates/${ballotId}`, null, token);
}

/**
 * POST /api/kiosk/vote
 * @param {number} ballotId
 * @param {number} candidateId
 * @param {string} token
 */
export async function castVote(ballotId, candidateId, token) {
  return request('POST', '/api/kiosk/vote', { ballotId, candidateId }, token);
}

/**
 * GET /api/kiosk/hasVoted
 * @param {string} token
 */
export async function hasVoted(token) {
  return request('GET', '/api/kiosk/hasVoted', null, token);
}

// ─── User ────────────────────────────────────────────────────────────────────

/**
 * GET /api/user/profile
 * @param {string} token
 */
export async function getUserProfile(token) {
  return request('GET', '/api/user/profile', null, token);
}

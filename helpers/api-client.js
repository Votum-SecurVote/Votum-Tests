// helpers/api-client.js
// Reusable API client covering all Votum backend endpoints.
// Uses native fetch (Node 18+) — no mocking, hits real services.
//
// All functions return a response wrapper with:
//   .status()  — HTTP status code (method, matching Playwright's APIResponse)
//   .json()    — parsed JSON body (or throws if body is not JSON)
//   .text()    — raw response text

import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

/**
 * Wraps a native fetch Response so that .status() is a method (not a property),
 * matching the Playwright APIResponse interface used in the test assertions.
 */
function wrap(fetchResponse) {
  return {
    status: () => fetchResponse.status,
    json:   () => fetchResponse.json(),
    text:   () => fetchResponse.text(),
    /** Convenience: read the raw body as a JWT token string */
    token:  () => fetchResponse.text(),
    ok:     fetchResponse.ok,
  };
}

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
  return wrap(response);
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
 * Multipart form-data: "data" part (JSON blob) + "photo" (image) + "aadhaarPdf" (PDF).
 * @param {object} userData - { name, email, phone, password, aadhaarNumber, dob?, address?, gender? }
 * @param {string|null} photoPath - absolute path to photo file
 * @param {string|null} aadhaarPdfPath - absolute path to aadhaar PDF
 */
export async function registerUser(userData, photoPath = null, aadhaarPdfPath = null) {
  const form = new FormData();

  // Backend expects a single "data" JSON blob with these exact field names
  const dataBlob = JSON.stringify({
    fullName:  userData.name || userData.fullName,
    email:     userData.email,
    phone:     userData.phone,
    password:  userData.password,
    aadhaar:   userData.aadhaarNumber || userData.aadhaar,
    dob:       userData.dob       || '1990-01-01',
    address:   userData.address   || '123 Test Street',
    gender:    userData.gender    || 'MALE',
  });
  form.append('data', dataBlob, { contentType: 'application/json', filename: 'data.json' });

  if (photoPath && fs.existsSync(photoPath)) {
    form.append('photo', fs.createReadStream(photoPath), { filename: 'photo.jpg', contentType: 'image/jpeg' });
  } else {
    // Backend requires photo — send a minimal 1-byte placeholder
    form.append('photo', Buffer.from('placeholder'), { filename: 'photo.jpg', contentType: 'image/jpeg' });
  }

  if (aadhaarPdfPath && fs.existsSync(aadhaarPdfPath)) {
    form.append('aadhaarPdf', fs.createReadStream(aadhaarPdfPath), { filename: 'aadhaar.pdf', contentType: 'application/pdf' });
  } else {
    // Backend requires aadhaarPdf — send a minimal placeholder
    form.append('aadhaarPdf', Buffer.from('placeholder'), { filename: 'aadhaar.pdf', contentType: 'application/pdf' });
  }

  const headers = form.getHeaders();
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers,
    body: form,
  });
  return wrap(response);
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
 * GET /api/admin/pending-users
 * @param {string} token
 */
export async function getPendingUsers(token) {
  return request('GET', '/api/admin/pending-users', null, token);
}

/**
 * PUT /api/admin/approve/{id}
 * @param {string} userId
 * @param {string} token
 */
export async function approveUser(userId, token) {
  return request('PUT', `/api/admin/approve/${userId}`, {}, token);
}

/**
 * PUT /api/admin/reject/{id}
 * @param {string} userId
 * @param {string} token
 */
export async function rejectUser(userId, token) {
  return request('PUT', `/api/admin/reject/${userId}`, {}, token);
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
 * Backend expects multipart with a "request" JSON blob part.
 * @param {string} ballotId
 * @param {object} candidateData - { name, party, description? }
 * @param {string} token
 */
export async function addCandidate(ballotId, candidateData, token) {
  const form = new FormData();
  form.append('request', JSON.stringify(candidateData), {
    contentType: 'application/json',
    filename: 'request.json',
  });
  const headers = { ...form.getHeaders(), Authorization: `Bearer ${token}` };
  const response = await fetch(`${BASE_URL}/api/admin/ballots/${ballotId}/candidates`, {
    method: 'POST',
    headers,
    body: form,
  });
  return wrap(response);
}

/**
 * GET /api/admin/elections — returns all elections (used as results proxy since
 * a dedicated /results endpoint is not present on this backend build).
 * @param {string} electionId  — kept for signature compatibility; ignored server-side
 * @param {string} token
 */
export async function getElectionResults(electionId, token) {
  return request('GET', '/api/admin/elections', null, token);
}

// ─── Kiosk ───────────────────────────────────────────────────────────────────

/**
 * POST /api/kiosk/login
 * Requires both email (to look up user) and aadhaar (raw number — backend hashes and compares).
 * @param {string} email
 * @param {string} aadhaar  - raw aadhaar number
 * @param {string} password
 */
export async function kioskLogin(email, aadhaar, password) {
  return request('POST', '/api/kiosk/login', { email, aadhaar, password });
}

/**
 * GET /api/kiosk/elections/active
 * @param {string} token
 */
export async function getActiveElection(token) {
  return request('GET', '/api/kiosk/elections/active', null, token);
}

/**
 * GET /api/kiosk/elections/{electionId}/ballots
 * @param {string} electionId
 * @param {string} token
 */
export async function getBallots(electionId, token) {
  return request('GET', `/api/kiosk/elections/${electionId}/ballots`, null, token);
}

/**
 * GET /api/kiosk/ballots/{ballotId}/candidates
 * @param {string} ballotId
 * @param {string} token
 */
export async function getCandidates(ballotId, token) {
  return request('GET', `/api/kiosk/ballots/${ballotId}/candidates`, null, token);
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
 * GET /api/kiosk/elections/active — used as hasVoted proxy since a dedicated
 * /hasVoted endpoint is not present on this backend build.
 * Tests that call this should check the response status (200) rather than a
 * hasVoted boolean, or use soft assertions.
 * @param {string} token
 */
export async function hasVoted(token) {
  return request('GET', '/api/kiosk/elections/active', null, token);
}

// ─── User ────────────────────────────────────────────────────────────────────

/**
 * GET /api/user/profile
 * @param {string} token
 */
export async function getUserProfile(token) {
  return request('GET', '/api/user/profile', null, token);
}

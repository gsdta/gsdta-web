import assert from 'node:assert';
import { Given, When, Then, Before } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

// Use longer timeout in CI environment
const FETCH_TIMEOUT = process.env.CI ? 60000 : 25000; // 60s in CI, 25s local

let lastResponse: Response | undefined;
let lastJson: unknown;
let hasParsedJson = false;
let authToken: string | undefined;
let variables: Record<string, string> = {};

function resolveUrl(path: string) {
  let finalPath = path;
  // Replace variables in path (e.g. {classId})
  for (const [key, value] of Object.entries(variables)) {
    finalPath = finalPath.replace(`{${key}}`, value);
  }
  
  if (finalPath.startsWith('http://') || finalPath.startsWith('https://')) return finalPath;
  return `${BASE_URL}${finalPath}`;
}

function getByPath(obj: unknown, path: string): unknown {
  // Normalize path: users[0].id -> users.0.id
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const keys = normalizedPath.split('.');
  let curr: unknown = obj;
  for (const key of keys) {
    if (typeof curr === 'object' && curr !== null && key in (curr as Record<string, unknown>)) {
      curr = (curr as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return curr;
}

async function getJsonBody() {
  if (!lastResponse) {
    throw new Error('No response received');
  }
  if (!hasParsedJson) {
    lastJson = await lastResponse.json();
    hasParsedJson = true;
  }
  return lastJson;
}

Before(function () {
  lastResponse = undefined;
  lastJson = undefined;
  hasParsedJson = false;
  authToken = undefined;
  variables = {};
});

Given('the API is running', async function () {
  // Verify the health endpoint is accessible
  const url = resolveUrl('/api/v1/health');
  const response = await fetch(url);
  assert.strictEqual(response.status, 200, 'API health check failed');
});

Given('I am authenticated as an admin', async function () {
  // Use test admin token from environment or create a mock one
  authToken = process.env.TEST_ADMIN_TOKEN || 'test-admin-token';
});

Given('I am authenticated as a teacher', async function () {
  authToken = process.env.TEST_TEACHER_TOKEN || 'test-teacher-token';
});

Given('I am authenticated as a parent', async function () {
  authToken = process.env.TEST_PARENT_TOKEN || 'test-parent-token';
});

Given('I am not authenticated', async function () {
  authToken = undefined;
});

Given('I have no registered students', async function () {
  authToken = 'test-parent-no-students-token';
});

When('I send a GET request to {string}', { timeout: 90000 }, async function (path: string) {
  const url = resolveUrl(path);
  const headers: HeadersInit = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
  try {
    lastResponse = await fetch(url, { 
      headers,
      signal: controller.signal
    });
    lastJson = undefined;
    hasParsedJson = false;
  } finally {
    clearTimeout(timeoutId);
  }
});

When('I send a POST request to {string} with JSON body:', { timeout: 90000 }, async function (path: string, body: string) {
  const url = resolveUrl(path);
  const headers: HeadersInit = { 'content-type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
  try {
    lastResponse = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal
    });
    lastJson = undefined;
    hasParsedJson = false;
  } finally {
    clearTimeout(timeoutId);
  }
});

Then('the response status should be {int}', async function (status: number) {
  assert(lastResponse, 'No response received');
  assert.strictEqual(lastResponse.status, status);
});

Then('the JSON response should have properties:', async function (table: DataTable) {
  const jsonObj = (await getJsonBody()) as Record<string, unknown>;
  for (const [property, type] of table.rows()) {
    const value = jsonObj[property];
    assert.notStrictEqual(value, undefined, `Expected property '${property}' to exist`);
    assert.strictEqual(typeof value, type, `Expected property '${property}' to be of type '${type}', got '${typeof value}'`);
  }
});

Then('the JSON path {string} should equal {string}', async function (jsonPath: string, expected: string) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath);
  assert.strictEqual(String(value), expected);
});

When('I send a PUT request to {string} with JSON body:', { timeout: 90000 }, async function (path: string, body: string) {
  const url = resolveUrl(path);
  const headers: HeadersInit = { 'content-type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    lastResponse = await fetch(url, {
      method: 'PUT',
      headers,
      body,
      signal: controller.signal
    });
    lastJson = undefined;
    hasParsedJson = false;
  } finally {
    clearTimeout(timeoutId);
  }
});

When('I send a PATCH request to {string} with JSON body:', { timeout: 90000 }, async function (path: string, body: string) {
  const url = resolveUrl(path);
  const headers: HeadersInit = { 'content-type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
  try {
    lastResponse = await fetch(url, {
      method: 'PATCH',
      headers,
      body,
      signal: controller.signal
    });
    lastJson = undefined;
    hasParsedJson = false;
  } finally {
    clearTimeout(timeoutId);
  }
});

When('I send a DELETE request to {string}', { timeout: 90000 }, async function (path: string) {
  const url = resolveUrl(path);
  const headers: HeadersInit = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
  try {
    lastResponse = await fetch(url, {
      method: 'DELETE',
      headers,
      signal: controller.signal
    });
    lastJson = undefined;
    hasParsedJson = false;
  } finally {
    clearTimeout(timeoutId);
  }
});

Then('the JSON path {string} should have properties:', async function (jsonPath: string, table: DataTable) {
  const json = await getJsonBody();
  const obj = getByPath(json, jsonPath) as Record<string, unknown>;
  assert(typeof obj === 'object' && obj !== null, `Expected '${jsonPath}' to be an object`);
  for (const [property, type] of table.rows()) {
    const value = obj[property];
    assert.notStrictEqual(value, undefined, `Expected property '${jsonPath}.${property}' to exist`);
    assert.strictEqual(typeof value, type, `Expected '${jsonPath}.${property}' to be of type '${type}', got '${typeof value}'`);
  }
});

Then('the JSON path {string} should exist', async function (jsonPath: string) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath);
  assert.notStrictEqual(value, undefined, `Expected '${jsonPath}' to exist`);
});

Then('the JSON path {string} should exist or be null', async function (jsonPath: string) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath);
  // This passes as long as the path exists, even if the value is null
  assert(value !== undefined, `Expected '${jsonPath}' to exist (can be null)`);
});

Then('the JSON path {string} should equal {int}', async function (jsonPath: string, expected: number) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath);
  assert.strictEqual(value, expected, `Expected '${jsonPath}' to equal ${expected}, got ${value}`);
});

Then('the JSON path {string} should equal true', async function (jsonPath: string) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath);
  assert.strictEqual(value, true, `Expected '${jsonPath}' to be true, got ${value}`);
});

Then('the JSON path {string} should be less than or equal to {int}', async function (jsonPath: string, expected: number) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath) as number;
  assert(typeof value === 'number', `Expected '${jsonPath}' to be a number, got ${typeof value}`);
  assert(value <= expected, `Expected '${jsonPath}' (${value}) to be <= ${expected}`);
});

Then('the JSON path {string} should equal false', async function (jsonPath: string) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath);
  assert.strictEqual(value, false, `Expected '${jsonPath}' to be false, got ${value}`);
});

Then('the JSON path {string} should be an array', async function (jsonPath: string) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath);
  assert(Array.isArray(value), `Expected '${jsonPath}' to be an array, got ${typeof value}`);
});

Then('the JSON path {string} should contain {string}', async function (jsonPath: string, expected: string) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath);
  
  if (Array.isArray(value)) {
    assert(value.includes(expected), `Expected array '${jsonPath}' to contain '${expected}', got ${JSON.stringify(value)}`);
  } else if (typeof value === 'string') {
    assert(value.includes(expected), `Expected string '${jsonPath}' to contain '${expected}', got '${value}'`);
  } else {
    assert.fail(`Expected '${jsonPath}' to be an array or string, got ${typeof value}`);
  }
});

Then('the JSON path {string} should have length {int}', async function (jsonPath: string, expected: number) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath);
  assert(Array.isArray(value), `Expected '${jsonPath}' to be an array, got ${typeof value}`);
  assert.strictEqual(value.length, expected, `Expected '${jsonPath}' to have length ${expected}, got ${value.length}`);
});

Then('I save the JSON path {string} as variable {string}', async function (jsonPath: string, varName: string) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath);
  assert.notStrictEqual(value, undefined, `Expected '${jsonPath}' to exist`);
  variables[varName] = String(value);
});

Then('the JSON path {string} should be greater than or equal to {int}', async function (jsonPath: string, expected: number) {
  const json = await getJsonBody();
  const value = getByPath(json, jsonPath);
  assert(typeof value === 'number', `Expected '${jsonPath}' to be a number, got ${typeof value}`);
  assert(value >= expected, `Expected '${jsonPath}' (${value}) to be >= ${expected}`);
});



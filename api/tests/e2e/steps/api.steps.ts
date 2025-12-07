import assert from 'node:assert';
import { Given, When, Then, Before } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

let lastResponse: Response | undefined;
let lastJson: unknown;

function resolveUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path}`;
}

function getByPath(obj: unknown, path: string): unknown {
  const keys = path.split('.');
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

Before(function () {
  lastResponse = undefined;
  lastJson = undefined;
});

Given('the API is running', async function () {
  // Verify the health endpoint is accessible
  const url = resolveUrl('/api/v1/health');
  const response = await fetch(url);
  assert.strictEqual(response.status, 200, 'API health check failed');
});

When('I send a GET request to {string}', async function (path: string) {
  const url = resolveUrl(path);
  lastResponse = await fetch(url);
});

When('I send a POST request to {string} with JSON body:', async function (path: string, body: string) {
  const url = resolveUrl(path);
  lastResponse = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
});

Then('the response status should be {int}', async function (status: number) {
  assert(lastResponse, 'No response received');
  assert.strictEqual(lastResponse.status, status);
});

Then('the JSON response should have properties:', async function (table: DataTable) {
  assert(lastResponse, 'No response received');
  lastJson = await lastResponse.json();
  const jsonObj = lastJson as Record<string, unknown>;
  for (const [property, type] of table.rows()) {
    const value = jsonObj[property];
    assert.notStrictEqual(value, undefined, `Expected property '${property}' to exist`);
    assert.strictEqual(typeof value, type, `Expected property '${property}' to be of type '${type}', got '${typeof value}'`);
  }
});

Then('the JSON path {string} should equal {string}', async function (jsonPath: string, expected: string) {
  const json = (lastJson ?? (await lastResponse?.json())) as unknown;
  const value = getByPath(json, jsonPath);
  assert.strictEqual(String(value), expected);
});

When('I send a PATCH request to {string} with JSON body:', async function (path: string, body: string) {
  const url = resolveUrl(path);
  lastResponse = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body,
  });
});

When('I send a DELETE request to {string}', async function (path: string) {
  const url = resolveUrl(path);
  lastResponse = await fetch(url, {
    method: 'DELETE',
  });
});

Then('the JSON path {string} should have properties:', async function (jsonPath: string, table: DataTable) {
  const json = (lastJson ?? (await lastResponse?.json())) as unknown;
  const obj = getByPath(json, jsonPath) as Record<string, unknown>;
  assert(typeof obj === 'object' && obj !== null, `Expected '${jsonPath}' to be an object`);
  for (const [property, type] of table.rows()) {
    const value = obj[property];
    assert.notStrictEqual(value, undefined, `Expected property '${jsonPath}.${property}' to exist`);
    assert.strictEqual(typeof value, type, `Expected '${jsonPath}.${property}' to be of type '${type}', got '${typeof value}'`);
  }
});

Then('the JSON path {string} should exist', async function (jsonPath: string) {
  const json = (lastJson ?? (await lastResponse?.json())) as unknown;
  const value = getByPath(json, jsonPath);
  assert.notStrictEqual(value, undefined, `Expected '${jsonPath}' to exist`);
});

Then('the JSON path {string} should exist or be null', async function (jsonPath: string) {
  const json = (lastJson ?? (await lastResponse?.json())) as unknown;
  lastJson = json;
  const value = getByPath(json, jsonPath);
  // This passes as long as the path exists, even if the value is null
  assert(value !== undefined, `Expected '${jsonPath}' to exist (can be null)`);
});

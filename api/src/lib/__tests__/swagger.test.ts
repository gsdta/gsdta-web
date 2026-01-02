// api/src/lib/__tests__/swagger.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { openapiSpecification } from '../swagger';

test('openapiSpecification: should export valid OpenAPI spec', () => {
  assert.ok(openapiSpecification);
  assert.equal(typeof openapiSpecification, 'object');
});

test('openapiSpecification: should have correct OpenAPI version', () => {
  assert.equal(openapiSpecification.openapi, '3.0.0');
});

test('openapiSpecification: should have info section', () => {
  assert.ok(openapiSpecification.info);
  assert.equal(openapiSpecification.info.title, 'GSDTA API');
  assert.equal(openapiSpecification.info.version, '1.0.0');
  assert.ok(openapiSpecification.info.description);
});

test('openapiSpecification: should have servers defined', () => {
  assert.ok(openapiSpecification.servers);
  assert.ok(Array.isArray(openapiSpecification.servers));
  assert.equal(openapiSpecification.servers.length, 2);
});

test('openapiSpecification: should have development server', () => {
  const devServer = openapiSpecification.servers.find(
    (s: { description?: string }) => s.description === 'Development server'
  );
  assert.ok(devServer);
  assert.equal(devServer.url, 'http://localhost:8080/api/v1');
});

test('openapiSpecification: should have production server', () => {
  const prodServer = openapiSpecification.servers.find(
    (s: { description?: string }) => s.description === 'Production server'
  );
  assert.ok(prodServer);
  assert.equal(prodServer.url, 'https://www.gsdta.org/api/v1');
});

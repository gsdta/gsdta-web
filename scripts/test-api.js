// Simple smoke test for API endpoints using Node fetch (Node 18+)
const base = process.env.API_BASE || 'http://localhost:3001';

async function waitForHealth(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${base}/v1/health`);
      if (res.ok) {
        const json = await res.json();
        console.log('Health:', JSON.stringify(json));
        return true;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Health check did not become ready in time');
}

async function testEcho() {
  const res = await fetch(`${base}/v1/echo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Hello from test-api.js' }),
  });
  if (!res.ok) throw new Error(`Echo failed: ${res.status}`);
  const json = await res.json();
  console.log('Echo:', JSON.stringify(json));
}

(async () => {
  try {
    await waitForHealth();
    await testEcho();
    console.log('API smoke tests passed');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();


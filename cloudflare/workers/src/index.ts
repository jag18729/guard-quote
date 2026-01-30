/**
 * GuardGuote API Proxy Worker
 * "The typo that became a brand"
 *
 * Routes API requests to AWS (primary) with automatic failover to Pi1 (backup)
 */

interface Env {
  ENVIRONMENT: string;
  AWS_ORIGIN: string;
  PI1_ORIGIN: string;
  FAILOVER_TIMEOUT_MS: string;
  HEALTH_KV: KVNamespace;
  CONFIG_KV: KVNamespace;
}

interface HealthStatus {
  aws: boolean;
  pi1: boolean;
  timestamp: number;
  lastCheck: string;
}

// Fetch with timeout
async function fetchWithTimeout(
  url: string,
  request: Request,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? request.body
        : undefined,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// Add CORS and origin headers
function addHeaders(response: Response, origin: string): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-Origin', origin);
  newHeaders.set('X-Powered-By', 'GuardGuote');
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Check if we should force a specific origin
async function getForceOrigin(env: Env): Promise<string | null> {
  try {
    return await env.CONFIG_KV.get('FORCE_ORIGIN');
  } catch {
    return null;
  }
}

// Update health status in KV
async function updateHealthStatus(env: Env, status: HealthStatus): Promise<void> {
  try {
    await env.HEALTH_KV.put('status', JSON.stringify(status), { expirationTtl: 300 });
  } catch {
    // Ignore KV errors
  }
}

// Main request handler
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname + url.search;
  const timeoutMs = parseInt(env.FAILOVER_TIMEOUT_MS) || 5000;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Check for forced origin (manual failover)
  const forceOrigin = await getForceOrigin(env);
  if (forceOrigin === 'pi1') {
    console.log('Forced routing to Pi1');
    try {
      const response = await fetchWithTimeout(`${env.PI1_ORIGIN}${path}`, request, timeoutMs * 2);
      return addHeaders(response, 'pi1-forced');
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Pi1 unavailable', forced: true }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Try AWS first (primary)
  try {
    console.log(`Trying AWS: ${env.AWS_ORIGIN}${path}`);
    const response = await fetchWithTimeout(`${env.AWS_ORIGIN}${path}`, request, timeoutMs);

    if (response.ok || response.status < 500) {
      // AWS responded successfully (or client error, which is fine)
      await updateHealthStatus(env, {
        aws: true,
        pi1: true, // Assume Pi1 is up
        timestamp: Date.now(),
        lastCheck: 'aws-success',
      });
      return addHeaders(response, 'aws');
    }

    // AWS returned 5xx, try Pi1
    console.log(`AWS returned ${response.status}, failing over to Pi1`);
  } catch (e) {
    console.log(`AWS failed: ${e}, failing over to Pi1`);
  }

  // Failover to Pi1 (backup via Cloudflare Tunnel)
  try {
    console.log(`Trying Pi1: ${env.PI1_ORIGIN}${path}`);
    const response = await fetchWithTimeout(`${env.PI1_ORIGIN}${path}`, request, timeoutMs * 2);

    await updateHealthStatus(env, {
      aws: false,
      pi1: true,
      timestamp: Date.now(),
      lastCheck: 'pi1-failover',
    });

    return addHeaders(response, 'pi1-failover');
  } catch (e) {
    console.log(`Pi1 also failed: ${e}`);
  }

  // Both origins failed
  await updateHealthStatus(env, {
    aws: false,
    pi1: false,
    timestamp: Date.now(),
    lastCheck: 'all-failed',
  });

  return new Response(
    JSON.stringify({
      error: 'Service temporarily unavailable',
      code: 'ALL_ORIGINS_DOWN',
      message: 'Both AWS and Pi1 backends are currently unreachable. Please try again later.',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '30',
        'X-Origin': 'none',
      },
    }
  );
}

// Health check endpoint for the worker itself
async function handleHealthCheck(env: Env): Promise<Response> {
  let healthStatus: HealthStatus | null = null;

  try {
    const stored = await env.HEALTH_KV.get('status');
    if (stored) {
      healthStatus = JSON.parse(stored);
    }
  } catch {
    // Ignore
  }

  return new Response(
    JSON.stringify({
      worker: 'healthy',
      environment: env.ENVIRONMENT,
      origins: healthStatus || { aws: 'unknown', pi1: 'unknown' },
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Export the worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Worker health check
    if (url.pathname === '/worker-health') {
      return handleHealthCheck(env);
    }

    // All other requests go through the proxy
    return handleRequest(request, env);
  },
};

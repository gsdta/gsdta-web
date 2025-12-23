export function isDev() {
  return process.env.NODE_ENV !== 'production';
}

export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (isDev()) {
    // In development, allow localhost and local network IPs
    if (origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.match(/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
      return origin;
    }
    return null;
  }
  
  // Production logic
  const envAllowed = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || [];
  const prodAllowed = new Set<string>([
    'https://gsdta.com',
    'https://www.gsdta.com',
    'https://app.gsdta.com',
    ...envAllowed
  ]);
  
  if (prodAllowed.has(origin)) return origin;
  
  // Allow subdomains of gsdta.com
  if (origin.endsWith('.gsdta.com')) return origin;
  
  // Allow Firebase Hosting and Cloud Run domains (protected by Auth header anyway)
  if (origin.endsWith('.web.app') || origin.endsWith('.firebaseapp.com') || origin.endsWith('.a.run.app')) return origin;

  return null;
}

export function corsHeaders(origin: string | null, methods: string = 'GET, POST, PUT, DELETE, PATCH, OPTIONS') {
  const allow = allowedOrigin(origin);
  const headers: Record<string, string> = {
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

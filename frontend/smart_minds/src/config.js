// Central config for backend host/ports with automatic ngrok warning bypass and Vercel routing
const CLOUD_TUNNEL_URL = 'https://interdental-farcically-bernardina.ngrok-free.dev';

const PAGE_HOST = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
const BACKEND_HOST = (typeof window !== 'undefined' && window.__BACKEND_HOST__) || PAGE_HOST;
const isVercel = PAGE_HOST.includes('vercel.app');

// On Vercel, route directly through the active live HTTPS backend tunnel
export const API_BASE_URL = isVercel
  ? `${CLOUD_TUNNEL_URL}/api`
  : `${typeof window !== 'undefined' && window.location.protocol ? window.location.protocol : 'http:'}//${BACKEND_HOST}:8086/api`;

export const WS_HOST = isVercel ? 'interdental-farcically-bernardina.ngrok-free.dev' : BACKEND_HOST;
export const WS_PORT = isVercel ? 443 : 3002;

// Automatic Global Interceptor: bypasses ngrok-free.dev interstitial warning screen on all requests
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = function (resource, init) {
    init = init || {};
    const headers = new Headers(init.headers || {});
    if (!headers.has('ngrok-skip-browser-warning')) {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    init.headers = headers;
    return originalFetch(resource, init);
  };
}

export default {
  API_BASE_URL,
  WS_HOST,
  WS_PORT,
  CLOUD_TUNNEL_URL
};

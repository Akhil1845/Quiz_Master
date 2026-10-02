// Central config for backend host/ports.
// By default this uses the page host so LAN access works.
// To use a public tunnel (ngrok) or remote server, set window.__BACKEND_HOST__
// before the app loads (or edit this file).

const PAGE_HOST = window && window.location ? window.location.hostname : 'localhost';
const BACKEND_HOST = window.__BACKEND_HOST__ || PAGE_HOST;
const isVercel = PAGE_HOST.includes('vercel.app');

// On Vercel, route directly through the active live HTTPS backend tunnel
export const API_BASE_URL = isVercel
  ? 'https://interdental-farcically-bernardina.ngrok-free.dev/api'
  : `${window.location.protocol}//${BACKEND_HOST}:8086/api`;

export const WS_HOST = isVercel ? 'interdental-farcically-bernardina.ngrok-free.dev' : BACKEND_HOST;
export const WS_PORT = isVercel ? 443 : 3002;

export default {
  API_BASE_URL,
  WS_HOST,
  WS_PORT,
};

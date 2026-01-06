// Central config for backend host/ports.
// By default this uses the page host so LAN access works.
// To use a public tunnel (ngrok) or remote server, set window.__BACKEND_HOST__
// before the app loads (or edit this file).

const PAGE_HOST = window && window.location ? window.location.hostname : 'localhost';
const BACKEND_HOST = window.__BACKEND_HOST__ || PAGE_HOST;

export const API_BASE_URL = `${window.location.protocol}//${BACKEND_HOST}:8086/api`;
export const WS_HOST = BACKEND_HOST;
export const WS_PORT = 3002;

export default {
  API_BASE_URL,
  WS_HOST,
  WS_PORT,
};

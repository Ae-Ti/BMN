// Central place for API host and derived URLs.
// Use the current page origin at runtime to avoid CORS when the site
// is served from a domain (e.g. http://www.saltylife.co.kr:8080).
// Provide a fallback for build-time (when `window` is not available).
const runtimeOrigin = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? window.location.origin
  : 'http://3.36.96.68:8080';

export const BASE_HOST = runtimeOrigin;
export const API_BASE = BASE_HOST;

export default {
  BASE_HOST,
  API_BASE,
};

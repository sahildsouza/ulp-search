export function getAuthToken() {
  return '';
}

export function setAuthToken() {}

export function clearAuthToken() {}

/**
 * Direct fetch wrapper
 */
export async function authFetch(url, options = {}) {
  return fetch(url, options);
}

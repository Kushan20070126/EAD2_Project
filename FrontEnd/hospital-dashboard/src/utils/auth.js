const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const ROLE_KEY = "userRole";
const EMAIL_KEY = "userEmail";

export function normalizeRole(role) {
  if (!role) {
    return "";
  }

  const upper = String(role).trim().toUpperCase();

  if (upper === "USER" || upper === "PATIENT") {
    return "PATIENT";
  }

  if (upper === "DOCTER" || upper === "DOCTOR") {
    return "DOCTOR";
  }

  if (upper === "ADMIN") {
    return "ADMIN";
  }

  return upper;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function setAuthToken(token) {
  if (!token) {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token) {
  if (!token) {
    return;
  }

  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function setAuthSession(accessToken, refreshToken, context = {}) {
  setAuthToken(accessToken);
  setRefreshToken(refreshToken);
  setUserContext(context);
}

export function setUserContext({ role, email } = {}) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole) {
    localStorage.setItem(ROLE_KEY, normalizedRole);
  }

  if (email) {
    localStorage.setItem(EMAIL_KEY, String(email).trim().toLowerCase());
  }
}

export function getUserRole() {
  return normalizeRole(localStorage.getItem(ROLE_KEY));
}

export function getUserEmail() {
  return localStorage.getItem(EMAIL_KEY) || "";
}

export function hasAnyRole(...roles) {
  const currentRole = getUserRole();
  const normalized = roles.map((role) => normalizeRole(role));
  return normalized.includes(currentRole);
}

export function getHomePathForRole(role = getUserRole()) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "DOCTOR") {
    return "/queue";
  }

  if (normalizedRole === "PATIENT") {
    return "/appointments";
  }

  return "/dashboard";
}

export function extractToken(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  return (
    payload.accessToken ||
    payload.token ||
    payload.jwt ||
    payload.idToken ||
    ""
  );
}

export function extractRefreshToken(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  return payload.refreshToken || payload.refresh_token || "";
}

export function extractRole(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  return normalizeRole(payload.role || payload.userRole || payload.authority || "");
}

export function extractEmail(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  return payload.email || payload.username || payload.sub || "";
}

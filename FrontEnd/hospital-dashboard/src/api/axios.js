import axios from "axios";
import {
  extractEmail,
  clearAuthToken,
  extractRefreshToken,
  extractRole,
  extractToken,
  getAuthToken,
  getRefreshToken,
  setAuthSession,
} from "../utils/auth";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8765",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 15000,
});

const isAuthRequestUrl = (url) =>
  typeof url === "string" &&
  (url.includes("/auth-service/auth/login") ||
    url.includes("/auth-service/auth/register") ||
    url.includes("/auth-service/auth/logout") ||
    url.includes("/auth-service/auth/refresh"));

API.interceptors.request.use((config) => {
  const url = config.url || "";
  const isAuthRequest = isAuthRequestUrl(url);

  if (isAuthRequest) {
    if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  }

  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config || {};

    if (
      status === 401 &&
      !originalRequest._retry &&
      !isAuthRequestUrl(originalRequest.url)
    ) {
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        originalRequest._retry = true;

        try {
          const refreshResponse = await API.post("/auth-service/auth/refresh", {
            refreshToken,
          });

          const newAccessToken = extractToken(refreshResponse.data);
          const newRefreshToken =
            extractRefreshToken(refreshResponse.data) || refreshToken;
          const role = extractRole(refreshResponse.data);
          const email = extractEmail(refreshResponse.data);

          if (newAccessToken) {
            setAuthSession(newAccessToken, newRefreshToken, { role, email });
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return API(originalRequest);
          }
        } catch (refreshError) {
          clearAuthToken();
          return Promise.reject(refreshError);
        }
      } else {
        clearAuthToken();
      }
    }

    if (status === 401) {
      clearAuthToken();
    }

    return Promise.reject(error);
  }
);

export default API;

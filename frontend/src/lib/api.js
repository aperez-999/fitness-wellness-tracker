const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "fwt_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  return parseResponse(response);
}

export async function checkHealth() {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error("API health check failed");
  }
  return response.json();
}

export function signup({ email, password, confirmPassword, displayName }) {
  return apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, confirmPassword, displayName }),
  });
}

export function login({ email, password }) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return apiFetch("/auth/logout", { method: "POST" });
}

export function getMe() {
  return apiFetch("/auth/me");
}

export { API_URL };

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const TOKEN_KEY = "fwt_token";
export const WORKOUTS_CHANGED = "fwt_workouts_changed";

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
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    error.fields = data.errors || {};
    throw error;
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

export function getWorkouts({
  summary = false,
  analytics = false,
  date,
  ...options
} = {}) {
  const query = new URLSearchParams();
  if (summary || analytics)
    query.set("timeZone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (date) query.set("date", date);
  const path = analytics
    ? "/workouts/analytics"
    : summary
      ? "/workouts/summary"
      : "/workouts";
  return apiFetch(`${path}?${query}`, { cache: "no-store", ...options });
}

export async function createWorkout(workout, options = {}) {
  const token = getToken();
  const result = await apiFetch("/workouts", {
    ...options,
    method: "POST",
    body: JSON.stringify({
      ...workout,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });

  if (getToken() === token) notifyWorkoutsChanged();
  return result;
}

export async function removeWorkout(id, options = {}) {
  const token = getToken();
  try {
    await apiFetch(`/workouts/${encodeURIComponent(id)}`, {
      ...options,
      method: "DELETE",
    });
  } catch (error) {
    // A record removed in another tab is already in the desired state.
    if (error.status !== 404) throw error;
  }
  if (getToken() === token) notifyWorkoutsChanged();
}

export async function updateWorkout(id, workout, options = {}) {
  const token = getToken();
  const result = await apiFetch(`/workouts/${encodeURIComponent(id)}`, {
    ...options,
    method: "PUT",
    body: JSON.stringify({
      ...workout,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  if (getToken() === token) notifyWorkoutsChanged();
  return result;
}

function notifyWorkoutsChanged() {
  window.dispatchEvent(new Event(WORKOUTS_CHANGED));
  try {
    localStorage.setItem(WORKOUTS_CHANGED, String(Date.now()));
  } catch {
    // Storage may be unavailable; the database change has already succeeded.
  }
}

export { API_URL };

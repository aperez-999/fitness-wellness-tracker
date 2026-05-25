const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function checkHealth() {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error("API health check failed");
  }
  return response.json();
}

export { API_URL };

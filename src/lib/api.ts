import axios, { type AxiosInstance } from "axios";

/**
 * Central Axios API Client configured for GreenGrid Django Backend.
 * Base URL defaults to VITE_API_BASE_URL environment variable or local Django server.
 */
const baseURL = (import.meta.env["VITE_API_BASE_URL"] as string) || "http://127.0.0.1:8000";

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardize error messaging
    const message =
      error.response?.data?.error ||
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected network error occurred while communicating with the backend.";
    return Promise.reject(new Error(message));
  },
);

export default apiClient;

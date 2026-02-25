import { createAuthClient } from "better-auth/react";

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  throw new Error(
    "[auth-client] Missing VITE_API_URL in production — auth client cannot initialize.",
  );
}

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

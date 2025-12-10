import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production'
    ? 'https://your-production-domain.com/api/auth'
    : 'http://localhost:3000/api/auth',
});
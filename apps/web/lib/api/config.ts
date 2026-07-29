/**
 * The only place NEXT_PUBLIC_API_URL is read. Every other file imports
 * API_BASE_URL from here rather than reading the env var directly, so
 * there's one place to change if the variable name ever changes.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const API_V1 = `${API_BASE_URL}/api/v1`;

import type { RequestHandler } from 'msw';

// Shared default handlers. Per-source fake responses are added alongside each adapter.
export const handlers: RequestHandler[] = [];

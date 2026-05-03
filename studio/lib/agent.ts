// lib/agent.ts
//
// INVERSION: The studio does NOT call /cmo. The user's Claude Code (running /cmo)
// calls THIS server's API endpoints via HTTP. This file was previously a streaming
// bridge TO /cmo — no longer needed.
//
// What replaced it:
//   - /cmo runs in the user's Claude Code session.
//   - /cmo invokes the studio's HTTP API to:
//     - log skill runs      → POST /api/activity/log
//     - push opportunities  → POST /api/opportunities/push
//     - navigate the UI     → POST /api/navigate
//     - show a toast        → POST /api/toast
//     - query current state → GET  /api/pulse/decision-feed, etc.
//   - The user watches the dashboard update live via SSE.
//
// This file kept as a placeholder so existing imports don't 404.
export const AGENT_MODEL = "/cmo via Claude Code (user-driven)";

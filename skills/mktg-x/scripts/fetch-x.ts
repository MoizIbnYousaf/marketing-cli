#!/usr/bin/env bun
// mktg-x entry point — read-only authenticated X/Twitter CLI.
// Commands: whoami, read, thread, replies, user, bookmarks.
// All write paths (post, reply, like, retweet, follow, bookmark/unbookmark mutations) are deliberately
// excluded — mktg-x is a read-only source extractor.
//
// Usage: bun run fetch-x.ts <command> [args]
// Output: JSON to stdout (frozen contract shape for source-digestion integration)
// Exit codes: 0 success, 1 other, 2 auth missing, 3 auth rejected, 4 not found, 5 rate limit

import { resolveCredentials, TwitterClient } from "./lib/x-client/index.js";
import { sanitizeText } from "./sanitize.js";

const args = process.argv.slice(2);
const command = args[0];

// --- Error helpers (frozen shape for source extractors) ---

function emitError(reason: string, exitCode: number): never {
  const error = {
    type: "error",
    message: `mktg-x fetch failed: ${reason}`,
    suggestion: "check MKTG_X_AUTH_TOKEN via `mktg doctor`, or paste the tweet text directly",
  };
  console.log(JSON.stringify(error, null, 2));
  process.exit(exitCode);
}

// --- Arg parsing ---

if (!command || command === "--help" || command === "-h") {
  console.log(`mktg-x — authenticated Twitter/X reader

Usage: bun run fetch-x.ts <command> [options]

Commands:
  whoami                       Current authenticated user
  read <url-or-id>             Read a single tweet
  thread <url-or-id>           Full thread for a tweet
  replies <url-or-id>          Replies to a tweet
  user <handle> [-n count]     User's tweets
  bookmarks [-n count]         Your bookmarks
  article <url-or-id>          Long-form X article

All commands output JSON.`);
  process.exit(0);
}

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function getCount(): number {
  return parseInt(getArg("-n") ?? "20", 10);
}

function extractId(input: string): string {
  const match = input.match(/status\/(\d+)/);
  return match ? match[1] : input;
}

// --- Rate-limit delay (500ms min between calls) ---

let lastCallTime = 0;

async function rateLimitDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < 500 && lastCallTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, 500 - elapsed));
  }
  lastCallTime = Date.now();
}

// --- Main ---

async function run() {
  let credentials;
  try {
    credentials = await resolveCredentials({});
  } catch (e) {
    emitError("X auth credentials not set (need auth_token + ct0)", 2);
  }

  const client = new TwitterClient({ cookies: credentials.cookies });

  switch (command) {
    case "whoami": {
      await rateLimitDelay();
      const result = await client.getCurrentUser();
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "read": {
      const id = extractId(args[1]);
      if (!id) { console.error("Usage: fetch-x.ts read <url-or-id>"); process.exit(1); }
      await rateLimitDelay();
      const result = await client.getTweet(id);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "thread": {
      const id = extractId(args[1]);
      if (!id) { console.error("Usage: fetch-x.ts thread <url-or-id>"); process.exit(1); }
      await rateLimitDelay();
      const result = await client.getThread(id);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "replies": {
      const id = extractId(args[1]);
      if (!id) { console.error("Usage: fetch-x.ts replies <url-or-id>"); process.exit(1); }
      await rateLimitDelay();
      const result = await client.getReplies(id);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "user": {
      const handle = args[1]?.replace(/^@/, "");
      if (!handle) { console.error("Usage: fetch-x.ts user <handle>"); process.exit(1); }
      await rateLimitDelay();
      const lookup = await client.getUserIdByUsername(handle);
      if (!lookup.success || !lookup.userId) {
        console.log(JSON.stringify(lookup, null, 2));
        break;
      }
      await rateLimitDelay();
      const result = await client.getUserTweetsPaged(lookup.userId, getCount());
      console.log(JSON.stringify({ ...result, userId: lookup.userId, username: lookup.username }, null, 2));
      break;
    }

    case "bookmarks": {
      const count = getCount();
      await rateLimitDelay();
      const result = await client.getBookmarks(count);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "article": {
      const id = extractId(args[1]);
      if (!id) { console.error("Usage: fetch-x.ts article <url-or-id>"); process.exit(1); }
      await rateLimitDelay();
      // getTweet includes article extraction via fetchUserArticlePlainText fallback
      const result = await client.getTweet(id);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    default:
      console.error(`Unknown command: ${command}. Run 'fetch-x.ts --help' for usage.`);
      process.exit(1);
  }
}

run().catch((e) => {
  const msg = (e as Error).message ?? String(e);
  // Map known HTTP status codes to exit codes
  if (msg.includes("401") || msg.includes("403")) {
    emitError(`X auth rejected by API (${msg})`, 3);
  } else if (msg.includes("404")) {
    emitError("source not found (deleted tweet or suspended account)", 4);
  } else if (msg.includes("429")) {
    emitError(`X API rate limit — ${msg}`, 5);
  } else {
    emitError(msg, 1);
  }
});

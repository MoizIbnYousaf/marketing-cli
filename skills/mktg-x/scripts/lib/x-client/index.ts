// X/Twitter GraphQL client — MIT licensed.
// Trimmed exports — only the read-only surface mktg-x needs.
export {
  type CookieExtractionResult,
  type CookieSource,
  extractCookiesFromChrome,
  extractCookiesFromFirefox,
  extractCookiesFromSafari,
  resolveCredentials,
  type TwitterCookies,
} from './cookies.js';
export { runtimeQueryIds } from './runtime-query-ids.js';
export {
  type CurrentUserResult,
  type GetTweetResult,
  type TweetData,
  TwitterClient,
  type TwitterClientOptions,
} from './twitter-client.js';
export type { TimelineFetchOptions } from './twitter-client-timelines.js';
export type { TweetFetchOptions } from './twitter-client-tweet-detail.js';
export type {
  TweetResult,
} from './twitter-client-types.js';

// X/Twitter GraphQL client — MIT licensed.
// Trimmed exports — only the read-only surface mktg-x needs.
export {
  type CookieExtractionResult,
  type CookieSource,
  resolveCredentials,
  type TwitterCookies,
} from './cookies.js';
export {
  type CurrentUserResult,
  type GetTweetResult,
  type TweetData,
  TwitterClient,
  type TwitterClientOptions,
} from './twitter-client.js';
export type { TimelineFetchOptions } from './twitter-client-timelines.js';
export type { TweetFetchOptions } from './twitter-client-tweet-detail.js';

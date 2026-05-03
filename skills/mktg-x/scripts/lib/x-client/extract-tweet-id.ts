// X/Twitter GraphQL client — MIT licensed.
/**
 * Extract tweet ID from a Twitter/X URL or return the input unchanged if it's already an ID.
 */
const TWEET_URL_REGEX = /(?:twitter\.com|x\.com)\/(?:\w+\/status|i\/web\/status)\/(\d+)/i;

export function extractTweetId(input: string): string {
  // If it's a URL, extract the tweet ID
  const urlMatch = TWEET_URL_REGEX.exec(input);
  if (urlMatch) {
    return urlMatch[1];
  }
  // Assume it's already an ID
  return input;
}

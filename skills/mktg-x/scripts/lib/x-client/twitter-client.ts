// X/Twitter GraphQL client — MIT licensed.
// Trimmed to 4 of 14 mixins — read-only surface for mktg-x.
// Dropped: withPosting, withMedia, withFollow, withSearch, withHome, withLists, withNews, withUsers, withBookmarks, withEngagement.
import type { AbstractConstructor } from './twitter-client-base.js';
import { TwitterClientBase } from './twitter-client-base.js';
import { type TwitterClientTimelineMethods, withTimelines } from './twitter-client-timelines.js';
import { type TwitterClientTweetDetailMethods, withTweetDetails } from './twitter-client-tweet-detail.js';
import { type TwitterClientUserLookupMethods, withUserLookup } from './twitter-client-user-lookup.js';
import { type TwitterClientUserTweetsMethods, withUserTweets } from './twitter-client-user-tweets.js';

type TwitterClientInstance = TwitterClientBase &
  TwitterClientTimelineMethods &
  TwitterClientTweetDetailMethods &
  TwitterClientUserLookupMethods &
  TwitterClientUserTweetsMethods;

const MixedTwitterClient = withUserTweets(
  withUserLookup(
    withTimelines(
      withTweetDetails(TwitterClientBase),
    ),
  ),
) as AbstractConstructor<TwitterClientInstance>;

export class TwitterClient extends MixedTwitterClient {}

export type {
  CurrentUserResult,
  GetTweetResult,
  TweetData,
  TwitterClientOptions,
} from './twitter-client-types.js';

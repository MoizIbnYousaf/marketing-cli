// X/Twitter GraphQL client — MIT licensed.
// Trimmed to 6 of 14 mixins — read-only surface for mktg-x.
// Dropped: withPosting, withMedia, withFollow, withSearch, withHome, withLists, withNews, withUsers.
import type { AbstractConstructor } from './twitter-client-base.js';
import { TwitterClientBase } from './twitter-client-base.js';
import { type TwitterClientBookmarkMethods, withBookmarks } from './twitter-client-bookmarks.js';
import { type TwitterClientEngagementMethods, withEngagement } from './twitter-client-engagement.js';
import { type TwitterClientTimelineMethods, withTimelines } from './twitter-client-timelines.js';
import { type TwitterClientTweetDetailMethods, withTweetDetails } from './twitter-client-tweet-detail.js';
import { type TwitterClientUserLookupMethods, withUserLookup } from './twitter-client-user-lookup.js';
import { type TwitterClientUserTweetsMethods, withUserTweets } from './twitter-client-user-tweets.js';

type TwitterClientInstance = TwitterClientBase &
  TwitterClientBookmarkMethods &
  TwitterClientEngagementMethods &
  TwitterClientTimelineMethods &
  TwitterClientTweetDetailMethods &
  TwitterClientUserLookupMethods &
  TwitterClientUserTweetsMethods;

const MixedTwitterClient = withUserTweets(
  withUserLookup(
    withTimelines(
      withTweetDetails(withEngagement(withBookmarks(TwitterClientBase))),
    ),
  ),
) as AbstractConstructor<TwitterClientInstance>;

export class TwitterClient extends MixedTwitterClient {}

export type {
  BookmarkMutationResult,
  CurrentUserResult,
  GetTweetResult,
  TweetData,
  TweetResult,
  TwitterClientOptions,
} from './twitter-client-types.js';

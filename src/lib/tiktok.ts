import type {
  TikTokTokenResponse,
  TikTokUserResponse,
  TikTokVideoListResponse,
  TikTokVideoQueryResponse,
  TikTokPostInitResponse,
  TikTokPostStatusResponse,
  PostVideoOptions,
} from "./types";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI!;

// All scopes we need for the app
const SCOPES = [
  "user.info.basic",
  "user.info.profile",
  "user.info.stats",
  "video.list",
  "video.publish",
].join(",");

/**
 * Build the TikTok OAuth authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    response_type: "code",
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state,
  });
  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string
): Promise<TikTokTokenResponse> {
  const body = new URLSearchParams({
    client_key: CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      `Token exchange failed: ${error.error_description || error.error || res.statusText}`
    );
  }

  return res.json();
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TikTokTokenResponse> {
  const body = new URLSearchParams({
    client_key: CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      `Token refresh failed: ${error.error_description || error.error || res.statusText}`
    );
  }

  return res.json();
}

/**
 * Revoke an access token (logout)
 */
export async function revokeToken(accessToken: string): Promise<void> {
  const body = new URLSearchParams({
    client_key: CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    token: accessToken,
  });

  await fetch(`${TIKTOK_API_BASE}/oauth/revoke/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

/**
 * Get user info (basic + profile + stats)
 */
export async function getUserInfo(
  accessToken: string
): Promise<TikTokUserResponse> {
  const fields = [
    "open_id",
    "union_id",
    "avatar_url",
    "avatar_url_100",
    "avatar_large_url",
    "display_name",
    "bio_description",
    "profile_deep_link",
    "is_verified",
    "username",
    "follower_count",
    "following_count",
    "likes_count",
    "video_count",
  ].join(",");

  const res = await fetch(
    `${TIKTOK_API_BASE}/user/info/?fields=${fields}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch user info: ${res.statusText}`);
  }

  return res.json();
}

/**
 * List user's videos with metrics
 */
export async function listVideos(
  accessToken: string,
  cursor?: number,
  maxCount: number = 20
): Promise<TikTokVideoListResponse> {
  const fields = [
    "id",
    "create_time",
    "cover_image_url",
    "share_url",
    "video_description",
    "duration",
    "height",
    "width",
    "title",
    "like_count",
    "comment_count",
    "share_count",
    "view_count",
  ].join(",");

  const body: Record<string, unknown> = { max_count: maxCount };
  if (cursor) body.cursor = cursor;

  const res = await fetch(
    `${TIKTOK_API_BASE}/video/list/?fields=${fields}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to list videos: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Query specific videos by ID
 */
export async function queryVideos(
  accessToken: string,
  videoIds: string[]
): Promise<TikTokVideoQueryResponse> {
  const fields = [
    "id",
    "create_time",
    "cover_image_url",
    "share_url",
    "video_description",
    "duration",
    "title",
    "like_count",
    "comment_count",
    "share_count",
    "view_count",
  ].join(",");

  const res = await fetch(
    `${TIKTOK_API_BASE}/video/query/?fields=${fields}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: { video_ids: videoIds.slice(0, 20) },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to query videos: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Initialize a video post (FILE_UPLOAD method)
 */
export async function initVideoPost(
  accessToken: string,
  options: PostVideoOptions,
  videoSize: number,
  chunkSize: number = 10_000_000
): Promise<TikTokPostInitResponse> {
  const totalChunkCount = Math.ceil(videoSize / chunkSize);

  const res = await fetch(
    `${TIKTOK_API_BASE}/post/publish/video/init/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: options.title,
          privacy_level: options.privacyLevel,
          disable_duet: options.disableDuet ?? false,
          disable_stitch: options.disableStitch ?? false,
          disable_comment: options.disableComment ?? false,
          video_cover_timestamp_ms: options.videoCoverTimestampMs ?? 1000,
          brand_content_toggle: options.brandContentToggle ?? false,
          brand_organic_toggle: options.brandOrganicToggle ?? false,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to init video post: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Check the status of a video post
 */
export async function getPostStatus(
  accessToken: string,
  publishId: string
): Promise<TikTokPostStatusResponse> {
  const res = await fetch(
    `${TIKTOK_API_BASE}/post/publish/status/fetch/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch post status: ${res.statusText}`);
  }

  return res.json();
}

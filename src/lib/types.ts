// TikTok OAuth Token Response
export interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_token: string;
  refresh_expires_in: number;
  scope: string;
  token_type: string;
}

// TikTok API Error
export interface TikTokError {
  code: string;
  message: string;
  log_id: string;
}

// User profile fields from user.info.basic
export interface TikTokUserBasic {
  open_id: string;
  union_id?: string;
  avatar_url: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name: string;
}

// User profile fields from user.info.profile
export interface TikTokUserProfile {
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  username?: string;
}

// User stats fields from user.info.stats
export interface TikTokUserStats {
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

// Combined user data
export interface TikTokUser extends TikTokUserBasic, TikTokUserProfile, TikTokUserStats {}

// User info API response
export interface TikTokUserResponse {
  data: {
    user: TikTokUser;
  };
  error: TikTokError;
}

// Video object
export interface TikTokVideo {
  id: string;
  create_time: number;
  cover_image_url?: string;
  share_url?: string;
  video_description?: string;
  duration?: number;
  height?: number;
  width?: number;
  title?: string;
  embed_html?: string;
  embed_link?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
}

// Video list API response
export interface TikTokVideoListResponse {
  data: {
    videos: TikTokVideo[];
    cursor: number;
    has_more: boolean;
  };
  error: TikTokError;
}

// Video query API response
export interface TikTokVideoQueryResponse {
  data: {
    videos: TikTokVideo[];
  };
  error: TikTokError;
}

// Content posting - init response
export interface TikTokPostInitResponse {
  data: {
    publish_id: string;
    upload_url?: string;
  };
  error: TikTokError;
}

// Content posting - status response
export interface TikTokPostStatusResponse {
  data: {
    status: "PROCESSING_UPLOAD" | "PROCESSING_DOWNLOAD" | "SEND_TO_USER_INBOX" | "PUBLISH_COMPLETE" | "FAILED";
    fail_reason?: string;
    publicaly_available_post_id?: string[];
    uploaded_bytes?: number;
  };
  error: TikTokError;
}

// Privacy levels for posting
export type PrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

// Post video options
export interface PostVideoOptions {
  title: string;
  privacyLevel: PrivacyLevel;
  disableDuet?: boolean;
  disableStitch?: boolean;
  disableComment?: boolean;
  videoCoverTimestampMs?: number;
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
}

// Post photo carousel options
export interface PostPhotoOptions {
  title?: string;
  description?: string;
  privacyLevel: PrivacyLevel;
  disableComment?: boolean;
  autoAddMusic?: boolean;
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
  photoCoverIndex?: number;
  photoImages: string[];
  postMode: "DIRECT_POST" | "MEDIA_UPLOAD";
}

// Creator info response from /post/publish/creator_info/query/
export interface TikTokCreatorInfo {
  creator_avatar_url: string;
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: PrivacyLevel[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
}

export interface TikTokCreatorInfoResponse {
  data: TikTokCreatorInfo;
  error: TikTokError;
}

// Session data stored in cookies
export interface SessionData {
  accessToken: string;
  refreshToken: string;
  openId: string;
  expiresAt: number;
  scope: string;
}

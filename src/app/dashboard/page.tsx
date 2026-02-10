"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { TikTokUser, TikTokVideo } from "@/lib/types";

function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<TikTokUser | null>(null);
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user data");
    }
  }, [router]);

  const fetchVideos = useCallback(async (cursorValue?: number) => {
    setVideosLoading(true);
    try {
      const params = new URLSearchParams();
      if (cursorValue) params.set("cursor", cursorValue.toString());
      params.set("max_count", "20");

      const res = await fetch(`/api/videos?${params.toString()}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch videos");
      const data = await res.json();

      setVideos((prev) =>
        cursorValue ? [...prev, ...(data.videos || [])] : data.videos || []
      );
      setHasMore(data.has_more || false);
      setCursor(data.cursor || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos");
    } finally {
      setVideosLoading(false);
    }
  }, [router]);

  useEffect(() => {
    Promise.all([fetchUser(), fetchVideos()]).finally(() => setLoading(false));
  }, [fetchUser, fetchVideos]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-neutral-200 dark:bg-neutral-800 rounded-xl"
              />
            ))}
          </div>
          <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 text-sm underline text-red-700 dark:text-red-400"
          >
            Try logging in again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* User Profile Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {user?.avatar_url && (
            <img
              src={user.avatar_large_url || user.avatar_url}
              alt={user.display_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{user?.display_name}</h1>
              {user?.is_verified && (
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              )}
            </div>
            {user?.username && (
              <p className="text-neutral-500">@{user.username}</p>
            )}
            {user?.bio_description && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-md">
                {user.bio_description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 border border-neutral-300 dark:border-neutral-700 px-4 py-2 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <p className="text-sm text-neutral-500 mb-1">Followers</p>
          <p className="text-2xl font-bold">
            {formatNumber(user?.follower_count)}
          </p>
        </div>
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <p className="text-sm text-neutral-500 mb-1">Following</p>
          <p className="text-2xl font-bold">
            {formatNumber(user?.following_count)}
          </p>
        </div>
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <p className="text-sm text-neutral-500 mb-1">Total Likes</p>
          <p className="text-2xl font-bold">
            {formatNumber(user?.likes_count)}
          </p>
        </div>
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <p className="text-sm text-neutral-500 mb-1">Videos</p>
          <p className="text-2xl font-bold">
            {formatNumber(user?.video_count)}
          </p>
        </div>
      </div>

      {/* Videos Section */}
      <div>
        <h2 className="text-xl font-bold mb-6">Your Videos</h2>

        {videos.length === 0 ? (
          <div className="text-center py-16 border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <svg
              className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-neutral-500">No videos found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                >
                  {video.cover_image_url && (
                    <div className="relative aspect-[9/16] max-h-64 overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                      <img
                        src={video.cover_image_url}
                        alt={video.title || video.video_description || "Video"}
                        className="w-full h-full object-cover"
                      />
                      {video.duration && (
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {Math.floor(video.duration / 60)}:
                          {(video.duration % 60).toString().padStart(2, "0")}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-4">
                    <p className="font-medium text-sm mb-2 line-clamp-2">
                      {video.title || video.video_description || "Untitled"}
                    </p>

                    {video.create_time && (
                      <p className="text-xs text-neutral-500 mb-3">
                        {formatDate(video.create_time)}
                      </p>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center">
                        <p className="text-xs text-neutral-500">Views</p>
                        <p className="text-sm font-semibold">
                          {formatNumber(video.view_count)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-neutral-500">Likes</p>
                        <p className="text-sm font-semibold">
                          {formatNumber(video.like_count)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-neutral-500">Comments</p>
                        <p className="text-sm font-semibold">
                          {formatNumber(video.comment_count)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-neutral-500">Shares</p>
                        <p className="text-sm font-semibold">
                          {formatNumber(video.share_count)}
                        </p>
                      </div>
                    </div>

                    {video.share_url && (
                      <a
                        href={video.share_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                      >
                        View on TikTok
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => cursor && fetchVideos(cursor)}
                  disabled={videosLoading}
                  className="px-6 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50"
                >
                  {videosLoading ? "Loading..." : "Load More Videos"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

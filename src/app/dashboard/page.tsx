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

function proxyImg(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return `/api/image?url=${encodeURIComponent(url)}`;
}

function VideoCard({ video }: { video: TikTokVideo }) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={video.share_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 aspect-[9/16]"
    >
      {/* Thumbnail */}
      {video.cover_image_url && !imgError ? (
        <img
          src={proxyImg(video.cover_image_url)}
          alt={video.title || video.video_description || "Video"}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-neutral-300 dark:text-neutral-700"
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
        </div>
      )}

      {/* Gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Duration badge */}
      {video.duration != null && (
        <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, "0")}
        </span>
      )}

      {/* Bottom info overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        <p className="text-xs font-medium line-clamp-2 mb-2">
          {video.title || video.video_description || "Untitled"}
        </p>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            {formatNumber(video.view_count)}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            {formatNumber(video.like_count)}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
            </svg>
            {formatNumber(video.comment_count)}
          </span>
        </div>
      </div>
    </a>
  );
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
              src={proxyImg(user.avatar_large_url || user.avatar_url)}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
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

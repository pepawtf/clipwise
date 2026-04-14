"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PrivacyLevel, TikTokCreatorInfo } from "@/lib/types";

type PostStatus =
  | "idle"
  | "initializing"
  | "uploading"
  | "processing"
  | "complete"
  | "failed";

const PRIVACY_LABELS: Record<PrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: "Public",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only Me",
};

export default function PostVideoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel | "">("");
  const [disableDuet, setDisableDuet] = useState(true);
  const [disableStitch, setDisableStitch] = useState(true);
  const [disableComment, setDisableComment] = useState(true);
  const [showCommercialOptions, setShowCommercialOptions] = useState(false);
  const [brandContentToggle, setBrandContentToggle] = useState(false);
  const [brandOrganicToggle, setBrandOrganicToggle] = useState(false);
  const [status, setStatus] = useState<PostStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(false);

  // Creator info from TikTok API
  const [creatorInfo, setCreatorInfo] = useState<TikTokCreatorInfo | null>(null);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [creatorError, setCreatorError] = useState<{ message: string; code?: string } | null>(null);

  const fetchCreatorInfo = useCallback(async () => {
    setCreatorLoading(true);
    setCreatorError(null);
    try {
      const res = await fetch("/api/creator", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreatorError({
          message: data.error || "Failed to fetch creator info",
          code: data.code,
        });
        setCreatorInfo(null);
        return;
      }
      const data: TikTokCreatorInfo = await res.json();
      setCreatorInfo(data);

      if (data.comment_disabled) setDisableComment(true);
      if (data.duet_disabled) setDisableDuet(true);
      if (data.stitch_disabled) setDisableStitch(true);
    } catch (err) {
      setCreatorError({
        message: err instanceof Error ? err.message : "Failed to fetch creator info",
      });
      setCreatorInfo(null);
    } finally {
      setCreatorLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCreatorInfo();
  }, [fetchCreatorInfo]);

  // Revoke video object URL on file change or unmount
  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
        videoUrlRef.current = null;
      }
    };
  }, []);

  const privacyOptions: PrivacyLevel[] = creatorInfo?.privacy_level_options ?? [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const validTypes = ["video/mp4", "video/webm", "video/quicktime"];
      if (!validTypes.includes(selected.type)) {
        setError("Please select a valid video file (MP4, WebM, or MOV)");
        return;
      }
      // Revoke previous object URL
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
      videoUrlRef.current = URL.createObjectURL(selected);
      setFile(selected);
      setVideoDuration(null);
      setDurationError(null);
      setError(null);
    }
  };

  const handleVideoMetadata = () => {
    if (!videoRef.current) return;
    const duration = videoRef.current.duration;
    setVideoDuration(duration);

    if (
      creatorInfo?.max_video_post_duration_sec &&
      duration > creatorInfo.max_video_post_duration_sec
    ) {
      setDurationError(
        `Video is ${Math.round(duration)}s long, but your account allows a maximum of ${creatorInfo.max_video_post_duration_sec}s.`
      );
    } else {
      setDurationError(null);
    }
  };

  const isPromotionalContent = brandContentToggle || brandOrganicToggle;

  // Disable publish when commercial options are shown but none selected
  const commercialIncomplete = showCommercialOptions && !brandContentToggle && !brandOrganicToggle;

  const uploadVideo = async (isDraft: boolean) => {
    setError(null);

    if (!file) {
      setError("Please select a video file");
      return;
    }
    if (!isDraft && !title.trim()) {
      setError("Please enter a title/caption");
      return;
    }
    if (!isDraft && !privacyLevel) {
      setError("Please select a privacy level");
      return;
    }

    try {
      // Step 1: Initialize the post
      setStatus("initializing");
      setStatusMessage(
        isDraft ? "Initializing draft upload..." : "Initializing upload..."
      );

      const initEndpoint = isDraft ? "/api/post/draft" : "/api/post/init";
      const initBody = isDraft
        ? { video_size: file.size }
        : {
            title: title.trim(),
            privacy_level: privacyLevel,
            disable_duet: disableDuet,
            disable_stitch: disableStitch,
            disable_comment: disableComment,
            brand_content_toggle: brandContentToggle,
            brand_organic_toggle: brandOrganicToggle,
            video_size: file.size,
          };

      const initRes = await fetch(initEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initBody),
      });

      if (initRes.status === 401) {
        router.push("/login");
        return;
      }

      if (!initRes.ok) {
        const data = await initRes.json();
        throw new Error(data.error || "Failed to initialize upload");
      }

      const { publish_id, upload_url } = await initRes.json();

      // Step 2: Upload the video file
      if (upload_url) {
        setStatus("uploading");
        setStatusMessage("Uploading video...");

        const chunkSize =
          file.size < 5_000_000 ? file.size : 10_000_000;
        const totalChunks = Math.ceil(file.size / chunkSize);

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);

          const uploadRes = await fetch(upload_url, {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "video/mp4",
              "Content-Length": chunk.size.toString(),
              "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
            },
            body: chunk,
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed at chunk ${i + 1}/${totalChunks}`);
          }

          setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
        }
      }

      // Step 3: Poll for status
      setStatus("processing");
      setStatusMessage(
        isDraft
          ? "Sending to your TikTok inbox..."
          : "Processing your video..."
      );

      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts++;

        const statusRes = await fetch(
          `/api/post/status?publish_id=${encodeURIComponent(publish_id)}`
        );
        if (!statusRes.ok) continue;

        const statusData = await statusRes.json();

        if (statusData.status === "PUBLISH_COMPLETE") {
          setStatus("complete");
          setStatusMessage(
            isDraft
              ? "Draft sent to your TikTok inbox! Open TikTok to edit and publish."
              : "Video published successfully!"
          );
          return;
        } else if (statusData.status === "FAILED") {
          throw new Error(statusData.fail_reason || "Video upload failed");
        } else if (statusData.status === "SEND_TO_USER_INBOX") {
          setStatus("complete");
          setStatusMessage(
            "Video sent to your TikTok inbox! Open TikTok to edit and publish."
          );
          return;
        }

        setStatusMessage(
          `Processing... (${statusData.status.toLowerCase().replace(/_/g, " ")})`
        );
      }

      setStatusMessage(
        "Processing is taking longer than expected. Check your TikTok app for updates."
      );
      setStatus("complete");
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatusMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPendingDraft(false);
    setShowConfirmDialog(true);
  };

  const handleDraft = async () => {
    setPendingDraft(true);
    setShowConfirmDialog(true);
  };

  const handleConfirmPost = async () => {
    setShowConfirmDialog(false);
    await uploadVideo(pendingDraft);
  };

  const resetForm = () => {
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    setFile(null);
    setVideoDuration(null);
    setDurationError(null);
    setTitle("");
    setPrivacyLevel("");
    setDisableDuet(true);
    setDisableStitch(true);
    setDisableComment(true);
    setShowCommercialOptions(false);
    setBrandContentToggle(false);
    setBrandOrganicToggle(false);
    setStatus("idle");
    setStatusMessage("");
    setUploadProgress(0);
    setError(null);
    setShowConfirmDialog(false);
    setPendingDraft(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Dynamic compliance declaration text
  const complianceText = brandContentToggle
    ? <>By posting, you agree to TikTok&apos;s <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-neutral-900 dark:hover:text-white">Branded Content Policy</a> and <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-neutral-900 dark:hover:text-white">Music Usage Confirmation</a>.</>
    : <>By posting, you agree to TikTok&apos;s <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-neutral-900 dark:hover:text-white">Music Usage Confirmation</a>. Ensure you have the rights to any music used in your video.</>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">Post a Video</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-4">
        Upload and publish a video to your TikTok account.
      </p>

      {/* Creator info loading */}
      {creatorLoading && (
        <div className="mb-6 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Loading your TikTok account info…
          </p>
        </div>
      )}

      {/* Creator info blocking error */}
      {creatorError && !creatorLoading && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
            Posting is not available right now
          </p>
          <p className="text-sm text-red-700 dark:text-red-400">
            {creatorError.message}
            {creatorError.code ? ` (${creatorError.code})` : ""}
          </p>
          <button
            onClick={fetchCreatorInfo}
            className="mt-3 text-sm underline text-red-600 dark:text-red-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Creator Identity */}
      {creatorInfo && (
        <div className="flex items-center gap-3 mb-8 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
          {creatorInfo.creator_avatar_url && (
            <img
              src={creatorInfo.creator_avatar_url}
              referrerPolicy="no-referrer"
              alt={creatorInfo.creator_nickname}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <div>
            <p className="text-sm font-medium">
              Posting as{" "}
              <span className="text-neutral-900 dark:text-white">
                {creatorInfo.creator_nickname}
              </span>
            </p>
            <p className="text-xs text-neutral-500">@{creatorInfo.creator_username}</p>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-3">
              {pendingDraft ? "Save as Draft?" : "Post to TikTok?"}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              Your content will be uploaded to TikTok. It may take a few minutes to process and appear on your profile. Continue?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPost}
                className="flex-1 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
              >
                {pendingDraft ? "Save as Draft" : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Display */}
      {status !== "idle" && status !== "failed" && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-center gap-3">
            {status !== "complete" && (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            {status === "complete" && (
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {statusMessage}
            </p>
          </div>
          {status === "uploading" && (
            <div className="mt-3">
              <div className="h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {uploadProgress}%
              </p>
            </div>
          )}
          {status === "complete" && (
            <button
              onClick={resetForm}
              className="mt-3 text-sm underline text-blue-600 dark:text-blue-400"
            >
              Post another video
            </button>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          {status === "failed" && (
            <button
              onClick={resetForm}
              className="mt-2 text-sm underline text-red-600 dark:text-red-400"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {/* Post Form */}
      {(status === "idle" || status === "failed") && creatorInfo && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Video File *
            </label>
            <div
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-8 text-center cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div>
                  <svg
                    className="w-10 h-10 text-green-500 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-neutral-500">
                    {(file.size / 1_000_000).toFixed(1)} MB
                    {videoDuration !== null && ` · ${Math.round(videoDuration)}s`}
                  </p>
                </div>
              ) : (
                <div>
                  <svg
                    className="w-10 h-10 text-neutral-400 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="font-medium">Click to select a video</p>
                  <p className="text-sm text-neutral-500">MP4, WebM, or MOV</p>
                </div>
              )}
            </div>

            {/* Duration Error */}
            {durationError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                {durationError}
              </p>
            )}
          </div>

          {/* Video Preview */}
          {file && videoUrlRef.current && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Preview
              </label>
              <video
                ref={videoRef}
                src={videoUrlRef.current}
                controls
                muted
                onLoadedMetadata={handleVideoMetadata}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800"
                style={{ maxHeight: "400px" }}
              />
            </div>
          )}

          {/* Title / Caption */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Caption *{" "}
              <span className="text-neutral-400 font-normal">
                ({title.length}/2200)
              </span>
            </label>
            <textarea
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 2200))}
              rows={3}
              placeholder="Write a caption for your video... #hashtags @mentions"
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white resize-none"
            />
          </div>

          {/* Privacy Level */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Privacy Level *
            </label>
            <select
              value={privacyLevel}
              onChange={(e) => setPrivacyLevel(e.target.value as PrivacyLevel)}
              disabled={creatorLoading}
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white disabled:opacity-50"
            >
              <option value="">
                {creatorLoading ? "Loading privacy options..." : "Select privacy level..."}
              </option>
              {privacyOptions.map((level) => (
                <option
                  key={level}
                  value={level}
                  disabled={brandContentToggle && level === "SELF_ONLY"}
                >
                  {PRIVACY_LABELS[level] || level}
                </option>
              ))}
            </select>
            {brandContentToggle && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Branded content visibility cannot be set to private.
              </p>
            )}
          </div>

          {/* Interaction Settings */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Interaction Settings
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!disableComment}
                  onChange={(e) => setDisableComment(!e.target.checked)}
                  disabled={creatorInfo?.comment_disabled}
                  className="w-4 h-4 rounded border-neutral-300 disabled:opacity-50"
                />
                <span className="text-sm">
                  Allow comments
                  {creatorInfo?.comment_disabled && (
                    <span className="text-neutral-400 ml-1">(disabled by creator settings)</span>
                  )}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!disableDuet}
                  onChange={(e) => setDisableDuet(!e.target.checked)}
                  disabled={creatorInfo?.duet_disabled}
                  className="w-4 h-4 rounded border-neutral-300 disabled:opacity-50"
                />
                <span className="text-sm">
                  Allow duets
                  {creatorInfo?.duet_disabled && (
                    <span className="text-neutral-400 ml-1">(disabled by creator settings)</span>
                  )}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!disableStitch}
                  onChange={(e) => setDisableStitch(!e.target.checked)}
                  disabled={creatorInfo?.stitch_disabled}
                  className="w-4 h-4 rounded border-neutral-300 disabled:opacity-50"
                />
                <span className="text-sm">
                  Allow stitches
                  {creatorInfo?.stitch_disabled && (
                    <span className="text-neutral-400 ml-1">(disabled by creator settings)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Commercial Content Disclosure */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Commercial Content Disclosure
            </label>
            <p className="text-xs text-neutral-500 mb-3">
              Let others know this video promotes goods or services in exchange
              for something of value. Your video could promote yourself, a third
              party, or both.
            </p>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={showCommercialOptions}
                onChange={(e) => {
                  setShowCommercialOptions(e.target.checked);
                  if (!e.target.checked) {
                    setBrandContentToggle(false);
                    setBrandOrganicToggle(false);
                  }
                }}
                className="w-4 h-4 rounded border-neutral-300"
              />
              <span className="text-sm">
                This video contains promotional content
              </span>
            </label>

            {showCommercialOptions && (
              <div className="ml-7 space-y-3 border-l-2 border-neutral-200 dark:border-neutral-700 pl-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandOrganicToggle}
                    onChange={(e) => setBrandOrganicToggle(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300"
                  />
                  <div>
                    <span className="text-sm font-medium">Your brand</span>
                    <p className="text-xs text-neutral-500">
                      You are promoting yourself or your own business.
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandContentToggle}
                    onChange={(e) => setBrandContentToggle(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300"
                  />
                  <div>
                    <span className="text-sm font-medium">Branded content</span>
                    <p className="text-xs text-neutral-500">
                      You are promoting another brand or a third party.
                    </p>
                  </div>
                </label>

                {/* Label Preview */}
                {isPromotionalContent && (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      {brandContentToggle
                        ? <>Your video will be labeled as <span className="font-medium">&quot;Paid partnership&quot;</span></>
                        : <>Your video will be labeled as <span className="font-medium">&quot;Promotional content&quot;</span></>
                      }
                    </p>
                  </div>
                )}

                {/* Warning if neither sub-option selected */}
                {!isPromotionalContent && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    You need to indicate if your content promotes yourself, a third party, or both.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Compliance Declaration */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {complianceText}
            </p>
          </div>

          {/* Processing Notice */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  After publishing, your content may take a few minutes to be processed and appear on your TikTok profile.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Drafts are sent to your TikTok inbox — open TikTok to add a caption, set privacy, and publish.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!file || !title.trim() || !privacyLevel || (brandContentToggle && privacyLevel === "SELF_ONLY") || !!durationError || commercialIncomplete}
              title={commercialIncomplete ? "You need to indicate if your content promotes yourself, a third party, or both." : undefined}
              className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post Video
            </button>
            <button
              type="button"
              onClick={handleDraft}
              disabled={!file || !!durationError}
              className="flex-1 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

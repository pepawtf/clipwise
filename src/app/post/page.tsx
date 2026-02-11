"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { PrivacyLevel } from "@/lib/types";

type PostStatus =
  | "idle"
  | "initializing"
  | "uploading"
  | "processing"
  | "complete"
  | "failed";

export default function PostVideoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel | "">("");
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [disableComment, setDisableComment] = useState(false);
  const [brandContentToggle, setBrandContentToggle] = useState(false);
  const [status, setStatus] = useState<PostStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const validTypes = ["video/mp4", "video/webm", "video/quicktime"];
      if (!validTypes.includes(selected.type)) {
        setError("Please select a valid video file (MP4, WebM, or MOV)");
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

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
    await uploadVideo(false);
  };

  const handleDraft = async () => {
    await uploadVideo(true);
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setPrivacyLevel("");
    setDisableDuet(false);
    setDisableStitch(false);
    setDisableComment(false);
    setBrandContentToggle(false);
    setStatus("idle");
    setStatusMessage("");
    setUploadProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">Post a Video</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        Upload and publish a video to your TikTok account.
      </p>

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
      {(status === "idle" || status === "failed") && (
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
          </div>

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
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            >
              <option value="">Select privacy level...</option>
              <option value="PUBLIC_TO_EVERYONE">Public</option>
              <option value="MUTUAL_FOLLOW_FRIENDS">Friends</option>
              <option value="FOLLOWER_OF_CREATOR">Followers</option>
              <option value="SELF_ONLY">Only Me</option>
            </select>
            <p className="text-xs text-neutral-500 mt-1">
              Note: Sandbox/unaudited apps can only post as &quot;Only
              Me&quot; (private).
            </p>
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
                  className="w-4 h-4 rounded border-neutral-300"
                />
                <span className="text-sm">Allow comments</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!disableDuet}
                  onChange={(e) => setDisableDuet(!e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300"
                />
                <span className="text-sm">Allow duets</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!disableStitch}
                  onChange={(e) => setDisableStitch(!e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300"
                />
                <span className="text-sm">Allow stitches</span>
              </label>
            </div>
          </div>

          {/* Commercial Content Disclosure */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Commercial Content Disclosure
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={brandContentToggle}
                onChange={(e) => setBrandContentToggle(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300"
              />
              <span className="text-sm">
                This video contains promotional content
              </span>
            </label>
          </div>

          {/* Music Usage Confirmation */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              By posting, you agree to TikTok&apos;s{" "}
              <span className="font-medium">Music Usage Confirmation</span>.
              Ensure you have the rights to any music used in your video.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!file || !title.trim() || !privacyLevel}
              className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post Video
            </button>
            <button
              type="button"
              onClick={handleDraft}
              disabled={!file}
              className="flex-1 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>
          </div>
          <p className="text-xs text-neutral-500 text-center">
            Drafts are sent to your TikTok inbox — open TikTok to add a
            caption, set privacy, and publish.
          </p>
        </form>
      )}
    </div>
  );
}

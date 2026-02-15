"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PrivacyLevel, TikTokCreatorInfo } from "@/lib/types";

type PostStatus =
  | "idle"
  | "uploading_images"
  | "posting"
  | "processing"
  | "complete"
  | "failed";

interface ImageItem {
  file: File;
  preview: string;
}

const PRIVACY_LABELS: Record<PrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: "Public",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only Me",
};

export default function CarouselPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel | "">("");
  const [disableComment, setDisableComment] = useState(true);
  const [autoAddMusic, setAutoAddMusic] = useState(true);
  const [brandContentToggle, setBrandContentToggle] = useState(false);
  const [brandOrganicToggle, setBrandOrganicToggle] = useState(false);
  const [status, setStatus] = useState<PostStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Creator info from TikTok API
  const [creatorInfo, setCreatorInfo] = useState<TikTokCreatorInfo | null>(null);
  const [creatorLoading, setCreatorLoading] = useState(true);

  const fetchCreatorInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/creator");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch creator info");
      const data: TikTokCreatorInfo = await res.json();
      setCreatorInfo(data);

      if (data.comment_disabled) setDisableComment(true);
    } catch {
      // Non-critical
    } finally {
      setCreatorLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCreatorInfo();
  }, [fetchCreatorInfo]);

  const privacyOptions: PrivacyLevel[] = creatorInfo?.privacy_level_options || [
    "PUBLIC_TO_EVERYONE",
    "MUTUAL_FOLLOW_FRIENDS",
    "FOLLOWER_OF_CREATOR",
    "SELF_ONLY",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const validTypes = ["image/jpeg", "image/webp"];
    const invalid = selected.find((f) => !validTypes.includes(f.type));
    if (invalid) {
      setError(
        `"${invalid.name}" is not supported. Only JPEG and WEBP images are allowed.`
      );
      return;
    }

    const total = images.length + selected.length;
    if (total > 35) {
      setError(`Maximum 35 images allowed. You selected ${total}.`);
      return;
    }

    const newItems: ImageItem[] = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newItems]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].preview);
      return updated;
    });
    if (coverIndex >= images.length - 1) setCoverIndex(0);
    if (coverIndex === index) setCoverIndex(0);
  };

  const isPromotionalContent = brandContentToggle || brandOrganicToggle;

  const postCarousel = async (isDraft: boolean) => {
    setError(null);

    if (images.length < 2) {
      setError("At least 2 images are required for a carousel");
      return;
    }
    if (!isDraft && !privacyLevel) {
      setError("Please select a privacy level");
      return;
    }

    try {
      // Step 1: Upload images one by one to Vercel Blob
      setStatus("uploading_images");
      const urls: string[] = [];

      for (let i = 0; i < images.length; i++) {
        setStatusMessage(`Uploading image ${i + 1} of ${images.length}...`);
        setUploadProgress(Math.round((i / images.length) * 100));

        const formData = new FormData();
        formData.append("file", images[i].file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.status === 401) {
          router.push("/login");
          return;
        }

        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          throw new Error(data.error || `Failed to upload image ${i + 1}`);
        }

        const { url } = await uploadRes.json();
        urls.push(url);
      }

      setUploadProgress(100);

      // Step 2: Send to TikTok
      setStatus("posting");
      setStatusMessage(
        isDraft
          ? "Sending carousel to your TikTok inbox..."
          : "Publishing carousel to TikTok..."
      );

      // Convert blob URLs to clipwise.tech proxy URLs (TikTok requires verified domain)
      const proxyUrls = urls.map(
        (u) =>
          `${window.location.origin}/api/media?url=${encodeURIComponent(u)}`
      );

      const postBody: Record<string, unknown> = {
        photo_images: proxyUrls,
        photo_cover_index: coverIndex,
        post_mode: isDraft ? "MEDIA_UPLOAD" : "DIRECT_POST",
        auto_add_music: autoAddMusic,
        brand_content_toggle: brandContentToggle,
        brand_organic_toggle: brandOrganicToggle,
        disable_comment: disableComment,
      };

      if (title.trim()) postBody.title = title.trim();
      if (description.trim()) postBody.description = description.trim();
      if (!isDraft) postBody.privacy_level = privacyLevel;

      const carouselRes = await fetch("/api/post/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBody),
      });

      if (carouselRes.status === 401) {
        router.push("/login");
        return;
      }

      if (!carouselRes.ok) {
        const data = await carouselRes.json();
        throw new Error(data.error || "Failed to create carousel");
      }

      const { publish_id } = await carouselRes.json();

      // Step 3: Poll status
      setStatus("processing");
      setStatusMessage("Processing your carousel...");

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
              ? "Carousel sent to your TikTok inbox! Open TikTok to edit and publish."
              : "Carousel published successfully!"
          );
          return;
        } else if (statusData.status === "FAILED") {
          throw new Error(
            statusData.fail_reason || "Carousel publishing failed"
          );
        } else if (statusData.status === "SEND_TO_USER_INBOX") {
          setStatus("complete");
          setStatusMessage(
            "Carousel sent to your TikTok inbox! Open TikTok to edit and publish."
          );
          return;
        }

        setStatusMessage(
          `Processing... (${statusData.status.toLowerCase().replace(/_/g, " ")})`
        );
      }

      setStatusMessage(
        "Processing is taking longer than expected. Check your TikTok app."
      );
      setStatus("complete");
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatusMessage("");
    }
  };

  const resetForm = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setCoverIndex(0);
    setTitle("");
    setDescription("");
    setPrivacyLevel("");
    setDisableComment(true);
    setAutoAddMusic(true);
    setBrandContentToggle(false);
    setBrandOrganicToggle(false);
    setStatus("idle");
    setStatusMessage("");
    setUploadProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">Post a Carousel</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-4">
        Upload 2–35 images as a photo slideshow to TikTok.
      </p>

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
          {status === "uploading_images" && (
            <div className="mt-3">
              <div className="h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          {status === "complete" && (
            <button
              onClick={resetForm}
              className="mt-3 text-sm underline text-blue-600 dark:text-blue-400"
            >
              Post another carousel
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

      {/* Form */}
      {(status === "idle" || status === "failed") && (
        <div className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Images *{" "}
              <span className="text-neutral-400 font-normal">
                ({images.length}/35 — JPEG or WEBP only)
              </span>
            </label>

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${
                      coverIndex === i
                        ? "border-blue-500"
                        : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-600"
                    }`}
                    onClick={() => setCoverIndex(i)}
                  >
                    <img
                      src={img.preview}
                      alt={`Image ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {coverIndex === i && (
                      <span className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        COVER
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(i);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                    >
                      &times;
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {images.length > 0 && (
              <p className="text-xs text-neutral-500 mb-3">
                Click an image to set it as the cover photo.
              </p>
            )}

            {/* Add Images Button */}
            {images.length < 35 && (
              <div
                className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-6 text-center cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <svg
                  className="w-8 h-8 text-neutral-400 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <p className="text-sm font-medium">
                  {images.length === 0
                    ? "Click to select images"
                    : "Add more images"}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  JPEG or WEBP, up to 4MB each
                </p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title{" "}
              <span className="text-neutral-400 font-normal">
                ({title.length}/90)
              </span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 90))}
              placeholder="Give your carousel a title"
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-2"
            >
              Description{" "}
              <span className="text-neutral-400 font-normal">
                ({description.length}/4000)
              </span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 4000))}
              rows={3}
              placeholder="Write a description... #hashtags @mentions"
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
                  {brandContentToggle && level === "SELF_ONLY" ? " (unavailable for branded content)" : ""}
                </option>
              ))}
            </select>
            {brandContentToggle && privacyLevel === "SELF_ONLY" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Branded content cannot be set to private. Please select a different privacy level.
              </p>
            )}
            <p className="text-xs text-neutral-500 mt-1">
              Note: Sandbox/unaudited apps can only post as &quot;Only
              Me&quot; (private).
            </p>
          </div>

          {/* Settings */}
          <div>
            <label className="block text-sm font-medium mb-3">Settings</label>
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
                  checked={autoAddMusic}
                  onChange={(e) => setAutoAddMusic(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300"
                />
                <span className="text-sm">Auto-add background music</span>
              </label>
            </div>
          </div>

          {/* Commercial Content Disclosure */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Commercial Content Disclosure
            </label>
            <p className="text-xs text-neutral-500 mb-3">
              Let others know this carousel promotes goods or services in exchange
              for something of value. Your carousel could promote yourself, a third
              party, or both.
            </p>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={isPromotionalContent}
                onChange={(e) => {
                  if (!e.target.checked) {
                    setBrandContentToggle(false);
                    setBrandOrganicToggle(false);
                  }
                }}
                readOnly={isPromotionalContent}
                className="w-4 h-4 rounded border-neutral-300"
              />
              <span className="text-sm">
                This carousel contains promotional content
              </span>
            </label>

            {isPromotionalContent && (
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
                <p className="text-xs text-neutral-500 mt-2">
                  By posting, you agree to TikTok&apos;s{" "}
                  <span className="font-medium">Branded Content Policy</span>.
                </p>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => postCarousel(false)}
              disabled={images.length < 2 || !privacyLevel || (brandContentToggle && privacyLevel === "SELF_ONLY")}
              className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post Carousel
            </button>
            <button
              onClick={() => postCarousel(true)}
              disabled={images.length < 2}
              className="flex-1 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>
          </div>
          <p className="text-xs text-neutral-500 text-center">
            Drafts are sent to your TikTok inbox — open TikTok to edit and
            publish.
          </p>
        </div>
      )}
    </div>
  );
}

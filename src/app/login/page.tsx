"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Login with TikTok</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Connect your TikTok account to access your analytics and manage your
          content.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <h2 className="font-semibold mb-4">Permissions we request:</h2>
        <ul className="space-y-3 mb-6">
          <li className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-500 mt-0.5 shrink-0"
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
            <div>
              <p className="font-medium text-sm">Basic Profile Info</p>
              <p className="text-xs text-neutral-500">
                Display name, avatar, username
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-500 mt-0.5 shrink-0"
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
            <div>
              <p className="font-medium text-sm">Profile Statistics</p>
              <p className="text-xs text-neutral-500">
                Followers, following, total likes, video count
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-500 mt-0.5 shrink-0"
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
            <div>
              <p className="font-medium text-sm">Video Data</p>
              <p className="text-xs text-neutral-500">
                View your videos and their performance metrics
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-500 mt-0.5 shrink-0"
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
            <div>
              <p className="font-medium text-sm">Post Videos</p>
              <p className="text-xs text-neutral-500">
                Publish video content to your TikTok account
              </p>
            </div>
          </li>
        </ul>

        <Link
          href="/api/auth/login"
          className="w-full flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-3 rounded-xl font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19.5 8.5C18.12 8.5 16.92 7.88 16.12 6.93C15.32 5.98 14.9 4.78 14.9 3.5H12.1V17.3C12.1 18.63 11.02 19.7 9.7 19.7C8.37 19.7 7.3 18.63 7.3 17.3C7.3 15.97 8.37 14.9 9.7 14.9C9.96 14.9 10.2 14.94 10.43 15.01V12.14C10.19 12.1 9.95 12.08 9.7 12.08C6.83 12.08 4.5 14.41 4.5 17.28C4.5 20.15 6.83 22.48 9.7 22.48C12.57 22.48 14.9 20.15 14.9 17.28V10.17C16.06 11.08 17.51 11.62 19.08 11.62V8.82C19.22 8.82 19.36 8.5 19.5 8.5Z"
              fill="currentColor"
            />
          </svg>
          Continue with TikTok
        </Link>

        <p className="text-xs text-neutral-500 text-center mt-4">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

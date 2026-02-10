import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Hero Section */}
      <section className="py-20 sm:py-32 text-center">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
          Your TikTok Content,
          <br />
          <span className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 bg-clip-text text-transparent">
            All in One Place
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-10">
          Connect your TikTok account to view analytics, track video
          performance, and post new content directly from your dashboard.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/api/auth/login"
            className="inline-flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 py-3.5 rounded-xl text-lg font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19.5 8.5C18.12 8.5 16.92 7.88 16.12 6.93C15.32 5.98 14.9 4.78 14.9 3.5H12.1V17.3C12.1 18.63 11.02 19.7 9.7 19.7C8.37 19.7 7.3 18.63 7.3 17.3C7.3 15.97 8.37 14.9 9.7 14.9C9.96 14.9 10.2 14.94 10.43 15.01V12.14C10.19 12.1 9.95 12.08 9.7 12.08C6.83 12.08 4.5 14.41 4.5 17.28C4.5 20.15 6.83 22.48 9.7 22.48C12.57 22.48 14.9 20.15 14.9 17.28V10.17C16.06 11.08 17.51 11.62 19.08 11.62V8.82C19.22 8.82 19.36 8.5 19.5 8.5Z"
                fill="currentColor"
              />
            </svg>
            Login with TikTok
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border border-neutral-300 dark:border-neutral-700 px-8 py-3.5 rounded-xl text-lg font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            View Dashboard
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="pb-20 sm:pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-pink-600 dark:text-pink-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Video Analytics</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Track views, likes, comments, and shares for all your TikTok
              videos in a clean dashboard.
            </p>
          </div>

          <div className="p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Profile Overview</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              View your follower count, total likes, video count, and profile
              details at a glance.
            </p>
          </div>

          <div className="p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
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
            </div>
            <h3 className="text-xl font-semibold mb-2">Post Videos</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Upload and post videos directly to your TikTok account with custom
              captions and privacy settings.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="pb-20 sm:pb-32">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-10 h-10 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="font-semibold mb-2">Connect Your Account</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Log in with your TikTok account to securely authorize access to
              your content and analytics.
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="font-semibold mb-2">View Your Analytics</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              See detailed metrics for every video including views, likes,
              comments, and shares.
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="font-semibold mb-2">Post New Content</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Upload videos directly from the dashboard with full control over
              privacy and interaction settings.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

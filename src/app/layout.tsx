import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clipwise - TikTok Analytics & Publisher",
  description:
    "Clipwise helps you view your TikTok analytics, manage your content, and post videos directly from your dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        {/* Header */}
        <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="28" height="28" rx="6" fill="#000" />
                <path
                  d="M19.5 8.5C18.12 8.5 16.92 7.88 16.12 6.93C15.32 5.98 14.9 4.78 14.9 3.5H12.1V17.3C12.1 18.63 11.02 19.7 9.7 19.7C8.37 19.7 7.3 18.63 7.3 17.3C7.3 15.97 8.37 14.9 9.7 14.9C9.96 14.9 10.2 14.94 10.43 15.01V12.14C10.19 12.1 9.95 12.08 9.7 12.08C6.83 12.08 4.5 14.41 4.5 17.28C4.5 20.15 6.83 22.48 9.7 22.48C12.57 22.48 14.9 20.15 14.9 17.28V10.17C16.06 11.08 17.51 11.62 19.08 11.62V8.82C19.22 8.82 19.36 8.5 19.5 8.5Z"
                  fill="white"
                />
              </svg>
              <span>Clipwise</span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/post"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Post Video
              </Link>
              <Link
                href="/api/auth/login"
                className="text-sm bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 rounded-lg hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
              >
                Login with TikTok
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer - Privacy Policy & Terms always visible (required for TikTok review) */}
        <footer className="border-t border-neutral-200 dark:border-neutral-800 py-8 mt-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-neutral-500">
                &copy; {new Date().getFullYear()} Clipwise. All rights
                reserved.
              </p>
              <div className="flex items-center gap-6">
                <Link
                  href="/privacy"
                  className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

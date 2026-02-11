"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/user")
      .then((res) => {
        setIsLoggedIn(res.ok);
      })
      .catch(() => setIsLoggedIn(false))
      .finally(() => setChecking(false));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsLoggedIn(false);
    router.push("/");
  };

  return (
    <nav className="flex items-center gap-6">
      {isLoggedIn && (
        <>
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
        </>
      )}
      {checking ? (
        <div className="w-20 h-8" />
      ) : isLoggedIn ? (
        <button
          onClick={handleLogout}
          className="text-sm border border-neutral-300 dark:border-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
        >
          Logout
        </button>
      ) : (
        <Link
          href="/api/auth/login"
          className="text-sm bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 rounded-lg hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
        >
          Login with TikTok
        </Link>
      )}
    </nav>
  );
}

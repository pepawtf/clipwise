export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose dark:prose-invert max-w-none space-y-6">
        <p className="text-sm text-neutral-500">
          Last updated: February 9, 2026
        </p>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Clipwise (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
            committed to protecting your privacy. This Privacy Policy explains
            how we collect, use, and safeguard your information when you use our
            application.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            2. Third-Party Services
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Our application uses TikTok&apos;s APIs and SDKs as third-party
            services to provide functionality. When you connect your TikTok
            account, we access certain data through TikTok&apos;s official API
            with your explicit authorization.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            3. Information We Collect
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            When you authorize our application, we may collect the following
            information from your TikTok account:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-neutral-600 dark:text-neutral-400">
            <li>
              <strong>Basic Profile Information:</strong> Display name, avatar,
              username
            </li>
            <li>
              <strong>Profile Statistics:</strong> Follower count, following
              count, total likes, video count
            </li>
            <li>
              <strong>Video Data:</strong> Video metadata including titles,
              descriptions, and performance metrics (views, likes, comments,
              shares)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            4. How We Use Your Information
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-neutral-600 dark:text-neutral-400">
            <li>
              To display your TikTok profile information and analytics within our
              dashboard
            </li>
            <li>
              To enable you to post video content to your TikTok account
            </li>
            <li>
              To provide you with insights about your video performance
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            5. Data Storage and Security
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            We store your authentication tokens in encrypted, HTTP-only cookies
            on your device. We do not store your TikTok data on our servers
            beyond the current session. All communication with TikTok&apos;s API
            is conducted over HTTPS.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">6. Data Sharing</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            We do not sell, trade, or share your personal information or TikTok
            data with any third parties. Your data is used solely to provide you
            with the services described in this application.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">7. Your Rights</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-neutral-600 dark:text-neutral-400">
            <li>
              <strong>Revoke Access:</strong> Disconnect your TikTok account at
              any time by logging out or revoking access through TikTok&apos;s
              settings
            </li>
            <li>
              <strong>Data Deletion:</strong> Request deletion of any data we
              hold by contacting us
            </li>
            <li>
              <strong>Opt-Out:</strong> You may stop using our service at any
              time
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">8. Contact Us</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            If you have any questions about this Privacy Policy or our data
            practices, please contact us at:{" "}
            <a
              href="mailto:privacy@example.com"
              className="text-neutral-900 dark:text-white underline"
            >
              privacy@example.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

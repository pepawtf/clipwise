export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <div className="prose dark:prose-invert max-w-none space-y-6">
        <p className="text-sm text-neutral-500">
          Last updated: February 9, 2026
        </p>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            By accessing and using Clipwise (&quot;the Service&quot;), you
            agree to be bound by these Terms of Service. If you do not agree to
            these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            2. Description of Service
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Clipwise provides a web-based dashboard that allows you to
            connect your TikTok account to view analytics, track video
            performance, and post video content through TikTok&apos;s official
            API.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            3. TikTok Account Authorization
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            To use the Service, you must authorize access to your TikTok account
            through TikTok&apos;s official OAuth 2.0 authentication process. By
            authorizing access, you grant us permission to access the data
            described in our Privacy Policy on your behalf.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            4. User Responsibilities
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-neutral-600 dark:text-neutral-400">
            <li>
              You are responsible for maintaining the security of your account
              credentials
            </li>
            <li>
              You agree to use the Service in compliance with TikTok&apos;s
              Terms of Service and Community Guidelines
            </li>
            <li>
              You must have the rights to any content you upload or post through
              the Service
            </li>
            <li>
              You will not use the Service for any unlawful or unauthorized
              purpose
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            5. Content Posting
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            When posting content through our Service, you acknowledge that the
            content will be published to your TikTok account subject to
            TikTok&apos;s terms and policies. You are solely responsible for the
            content you post and must ensure it complies with all applicable laws
            and TikTok&apos;s content guidelines.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            6. Data Handling
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            We handle your TikTok data in accordance with our Privacy Policy. We
            do not sell or share your data with third parties. Your data is used
            solely to provide the functionality of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            7. Limitation of Liability
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            The Service is provided &quot;as is&quot; without warranty of any
            kind. We are not liable for any damages arising from your use of the
            Service, including but not limited to any issues with content
            posting, data accuracy, or service availability.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">8. Termination</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            You may stop using the Service at any time by logging out and
            revoking access through your TikTok account settings. We reserve the
            right to terminate or suspend access to the Service at our
            discretion.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">
            9. Changes to Terms
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            We may update these Terms of Service from time to time. Continued
            use of the Service after changes constitutes acceptance of the
            updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">10. Contact</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            For questions about these Terms of Service, please contact us at:{" "}
            <a
              href="mailto:support@example.com"
              className="text-neutral-900 dark:text-white underline"
            >
              support@example.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

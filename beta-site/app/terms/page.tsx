export default function TermsPage() {
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-8">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to signup
        </a>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Beta Program Agreement</h2>
            <p className="text-gray-600 mb-4">
              By signing up for the SpeakEasy beta program, you acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>SpeakEasy is beta software and may contain bugs, errors, or incomplete features.</li>
              <li>The software is provided "as is" without warranty of any kind.</li>
              <li>Features may change, be removed, or become unavailable at any time.</li>
              <li>Your access to the beta may be revoked at any time without notice.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. License Grant</h2>
            <p className="text-gray-600 mb-4">
              Subject to these terms, we grant you a limited, non-exclusive, non-transferable license to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Download and install SpeakEasy on up to 2 personal devices.</li>
              <li>Use the software for personal or professional productivity purposes.</li>
              <li>Provide feedback about your experience with the software.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Restrictions</h2>
            <p className="text-gray-600 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Share your license key with others.</li>
              <li>Reverse engineer, decompile, or modify the software.</li>
              <li>Use the software for illegal purposes.</li>
              <li>Attempt to circumvent licensing or security measures.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Feedback</h2>
            <p className="text-gray-600 mb-6">
              Any feedback, suggestions, or bug reports you provide may be used to improve the software
              without any obligation to you. You grant us a perpetual, irrevocable license to use any
              feedback for product development purposes.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Limitation of Liability</h2>
            <p className="text-gray-600 mb-6">
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages arising from your use of the beta software,
              including but not limited to loss of data, loss of profits, or business interruption.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Termination</h2>
            <p className="text-gray-600 mb-6">
              We may terminate your beta access at any time for any reason. Upon termination, you must
              stop using the software and delete all copies from your devices. Any data stored locally
              may be lost upon termination.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Changes to Terms</h2>
            <p className="text-gray-600 mb-6">
              We may update these terms at any time. Continued use of the beta after changes constitutes
              acceptance of the new terms.
            </p>

            <div className="mt-12 p-6 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 italic">
                Note: These terms are a placeholder for the beta period. Final terms will be reviewed
                by legal counsel before general release.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

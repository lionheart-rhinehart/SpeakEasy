export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>

            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">1.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Account Information:</strong> Name and email address when you sign up for the beta.</li>
              <li><strong>Feedback:</strong> Any feedback, bug reports, or feature requests you submit through the app.</li>
              <li><strong>Attachments:</strong> Screenshots or files you choose to upload with your feedback.</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">1.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Device Information:</strong> A hashed machine identifier used for license validation.</li>
              <li><strong>App Version:</strong> Which version of SpeakEasy you are using.</li>
              <li><strong>Operating System:</strong> Your OS type (Windows, macOS, Linux).</li>
              <li><strong>Usage Data:</strong> Basic license validation checks (not your voice data or text content).</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. What We Do NOT Collect</h2>
            <p className="text-gray-600 mb-4">
              We want to be clear about what we do not collect:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Voice recordings:</strong> Your voice data is processed locally and not sent to our servers.</li>
              <li><strong>Transcribed text:</strong> Text is processed by your chosen AI provider, not stored by us.</li>
              <li><strong>Clipboard contents:</strong> We do not track or store your clipboard data.</li>
              <li><strong>Keystrokes:</strong> We do not log your keyboard input.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>License Management:</strong> To validate your license and prevent unauthorized use.</li>
              <li><strong>Communication:</strong> To send you your license key and respond to feedback.</li>
              <li><strong>Product Improvement:</strong> To understand how the app is used and fix bugs.</li>
              <li><strong>Support:</strong> To help you if you have issues with the software.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Data Storage and Security</h2>
            <p className="text-gray-600 mb-4">
              Your data is stored securely:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Account and license data is stored in Supabase (PostgreSQL database with encryption at rest).</li>
              <li>Your license key is stored locally in your operating system's secure credential storage.</li>
              <li>Feedback attachments are stored in Supabase Storage with access controls.</li>
              <li>We use HTTPS for all data transmission.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Third-Party Services</h2>
            <p className="text-gray-600 mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Supabase:</strong> Database and file storage (subject to their privacy policy).</li>
              <li><strong>Resend:</strong> Email delivery for license keys and notifications.</li>
              <li><strong>Cloudflare:</strong> Security (Turnstile) to prevent abuse.</li>
            </ul>
            <p className="text-gray-600 mb-6">
              Note: The AI services you configure in SpeakEasy (OpenAI, Anthropic, etc.) have their own
              privacy policies. We do not control how they process your data.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-6">
              We retain your data for as long as you are an active user. If you request deletion of your
              account, we will remove your personal data within 30 days, except where we are required to
              retain it for legal purposes.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Your Rights</h2>
            <p className="text-gray-600 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Request a copy of the data we have about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Deactivate your license at any time from the app settings.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Contact</h2>
            <p className="text-gray-600 mb-6">
              For privacy-related questions or to exercise your data rights, please contact us by
              replying to any email we've sent you, or through the in-app feedback system.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Changes to This Policy</h2>
            <p className="text-gray-600 mb-6">
              We may update this privacy policy from time to time. We will notify you of significant
              changes via email or through the app.
            </p>

            <div className="mt-12 p-6 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 italic">
                Note: This privacy policy is a placeholder for the beta period. A comprehensive policy
                will be reviewed by legal counsel before general release.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

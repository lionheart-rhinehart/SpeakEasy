import SignupForm from '@/components/SignupForm';

export default function HomePage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SpeakEasy Beta</h1>
          <p className="text-gray-600">
            Get early access to SpeakEasy and help shape the future of voice-powered productivity.
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <SignupForm
            turnstileSiteKey={turnstileSiteKey}
            supabaseUrl={supabaseUrl}
          />
        </div>

        {/* Already registered link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already registered?{' '}
          <a href="/resend" className="text-primary-600 hover:text-primary-700 underline">
            Resend your license key
          </a>
        </p>

        {/* Beta notice */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>This is beta software. By signing up, you agree to help test new features.</p>
        </div>
      </div>
    </main>
  );
}

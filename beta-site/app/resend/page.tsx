import ResendForm from '@/components/ResendForm';

export default function ResendPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </a>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Resend License Key</h1>
          <p className="text-gray-600">
            Lost your license key? No problem. Enter your email and we'll send it again.
          </p>
        </div>

        {/* Resend Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <ResendForm supabaseUrl={supabaseUrl} />
        </div>

        {/* Back to signup */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <a href="/" className="text-primary-600 hover:text-primary-700 underline">
            Sign up for the beta
          </a>
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl mix-blend-screen animate-pulse delay-700"></div>
      </div>

      <div className="w-full max-w-md space-y-8 p-8 border border-white/10 rounded-2xl bg-black/40 backdrop-blur-xl shadow-2xl z-10">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h2 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              3DSFERA
            </h2>
          </Link>
          <p className="mt-2 text-sm text-gray-400">
            Access your immersive exhibition account
          </p>
        </div>

        <form className="mt-8 space-y-6" action="#">
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-lg border-0 bg-white/5 py-2.5 px-3 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-lg border-0 bg-white/5 py-2.5 px-3 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-indigo-400 hover:text-indigo-300 transition">
                Forgot password?
              </a>
            </div>
          </div>

          <div>
            <Link
              href="/experience"
              className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
            >
              Sign in to Dashboard
            </Link>
          </div>
        </form>

        <div className="text-center text-xs text-gray-500 mt-4">
          New supplier? <Link href="#" className="text-gray-300 hover:underline">Apply for access</Link>
        </div>
      </div>
    </div>
  );
}

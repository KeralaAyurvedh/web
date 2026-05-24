import Link from 'next/link';

export default function Register() {
  return (
    <div className="flex-grow bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-brand-600">Applications</p>
        <h1 className="mb-4 text-3xl font-bold text-slate-900">Registration happens in the Android app</h1>
        <p className="mx-auto mb-8 max-w-xl text-slate-600">
          New member and customer applications require sponsor details, Aadhaar/PAN consent, and Company Admin review.
          Use the mobile app so the application follows the correct approval flow.
        </p>
        <Link
          href="/#download-app"
          className="inline-flex items-center justify-center rounded-full bg-brand-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-500"
        >
          Download Android App
        </Link>
      </div>
    </div>
  );
}

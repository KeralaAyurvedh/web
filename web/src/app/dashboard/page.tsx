import Link from 'next/link';
import { AdminProductImageUploader } from '@/components/AdminProductImageUploader';

export default function Dashboard() {
  return (
    <div className="flex-grow bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-brand-600">Dashboard</p>
          <h1 className="mb-4 text-3xl font-bold text-slate-900">The live dashboard is inside the Android app</h1>
          <p className="mx-auto mb-8 max-w-xl text-slate-600">
            Network, orders, payment handovers, commissions, and Company Admin monitoring are protected mobile-app
            workflows. Open the Android app to access your role-based dashboard.
          </p>
          <Link
            href="/#download-app"
            className="inline-flex items-center justify-center rounded-full bg-brand-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-500"
          >
            Download Android App
          </Link>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-brand-600">Products</p>
          <h2 className="mb-6 text-2xl font-bold text-slate-900">Product image upload</h2>
          <AdminProductImageUploader />
        </div>
      </div>
    </div>
  );
}

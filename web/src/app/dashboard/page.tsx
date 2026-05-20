"use client";

import { useState } from 'react';
import { Users, DollarSign, TrendingUp, Copy } from 'lucide-react';

export default function Dashboard() {
  // Mock role and data
  const [role] = useState<'AGENT' | 'SUPER_ADMIN'>('AGENT');
  const [referralCode] = useState('KERALA2026');

  return (
    <div className="flex-grow bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome back, Partner!</h1>
            <p className="text-slate-500">Here's what's happening with your network today.</p>
          </div>
          {role === 'AGENT' && (
            <div className="mt-4 sm:mt-0 flex items-center bg-brand-50 border border-brand-200 p-3 rounded-xl">
              <span className="text-brand-800 font-medium mr-3">Referral Code: <span className="font-bold">{referralCode}</span></span>
              <button className="text-brand-600 hover:text-brand-800" title="Copy Code">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
            <div className="p-4 rounded-xl bg-blue-50 text-blue-600 mr-4">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                {role === 'SUPER_ADMIN' ? 'Total Platform Users' : 'Your Direct Recruits'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900">
                {role === 'SUPER_ADMIN' ? '12,450' : '4 (Max 6)'}
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
            <div className="p-4 rounded-xl bg-brand-50 text-brand-600 mr-4">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                {role === 'SUPER_ADMIN' ? 'Total Payouts' : 'Total Earnings'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900">
                {role === 'SUPER_ADMIN' ? '₹45.2L' : '₹4,250'}
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
            <div className="p-4 rounded-xl bg-purple-50 text-purple-600 mr-4">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Sales Volume</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {role === 'SUPER_ADMIN' ? '₹1.2Cr' : '₹12,400'}
              </h3>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Recent Commissions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">John Doe (Direct)</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Recruitment
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-600">₹1,000</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">Today</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">Alice Smith (Level 2)</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Recruitment
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-600">₹500</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">Yesterday</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">Jane Doe (Team Sales)</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      Sales (10%)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-600">₹250</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">May 15, 2026</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

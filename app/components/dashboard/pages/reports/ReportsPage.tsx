'use client';

import { useState } from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Select from '../../ui/Select';
import PermissionGate from '../../ui/PermissionGate';

const recentReports = [
  { name: 'Q1 2024 Churn Analysis',        type: 'Churn Report',        generated: 'Apr 15, 2024', status: 'ready'     as const, size: '2.4 MB', schedule: 'Monthly' },
  { name: 'Customer Segmentation - March', type: 'Segmentation Report', generated: 'Apr 1, 2024',  status: 'ready'     as const, size: '1.8 MB', schedule: 'Weekly'  },
  { name: 'Q2 2024 Forecast',              type: 'Forecast Report',     generated: 'Pending',      status: 'scheduled' as const, size: '-',       schedule: 'Monthly' },
];

const scheduledReports = [
  { name: 'Weekly Churn Summary',    type: 'Churn Report',        nextRun: 'Apr 15, 2024', recipients: 'admin@company.com'       },
  { name: 'Monthly Customer Report', type: 'Segmentation Report', nextRun: 'Apr 1, 2024',  recipients: 'team@company.com'         },
  { name: 'Quarterly Business Review', type: 'Forecast Report',   nextRun: 'Pending',      recipients: 'executives@company.com'  },
];

const typeColors: Record<string, string> = {
  'Churn Report':        'bg-red-100 text-red-700',
  'Segmentation Report': 'bg-blue-100 text-blue-700',
  'Forecast Report':     'bg-purple-100 text-purple-700',
};

function ReportsPageContent() {
  const [reportType, setReportType]   = useState('churn');
  const [dateRange, setDateRange]     = useState('30d');
  const [exportType, setExportType]   = useState('pdf');
  const [segments, setSegments]       = useState('all');
  const [generating, setGenerating]   = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 2000);
  };

  return (
    <DashboardLayout page="Reports">
      {/* Generate Report */}
      <Card className="mb-4">
        <h3 className="text-sm font-bold text-black mb-1">Generate Custom Report</h3>
        <p className="text-xs text-gray-400 mb-5">Create a new analytics report with custom parameters</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Report Type</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-black transition-colors appearance-none bg-white"
            >
              <option value="churn">Churn Analysis</option>
              <option value="segmentation">Customer Segmentation</option>
              <option value="forecast">Revenue Forecast</option>
              <option value="retention">Retention Report</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Date Range</label>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-black transition-colors appearance-none bg-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last 1 year</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Export Type</label>
            <select
              value={exportType}
              onChange={e => setExportType(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-black transition-colors appearance-none bg-white"
            >
              <option value="pdf">PDF Document</option>
              <option value="csv">CSV Spreadsheet</option>
              <option value="excel">Excel (.xlsx)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Include Segments</label>
            <select
              value={segments}
              onChange={e => setSegments(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-black transition-colors appearance-none bg-white"
            >
              <option value="all">All Segments</option>
              <option value="loyal">Loyal Champions</option>
              <option value="risk">At Risk</option>
              <option value="new">New Adopters</option>
              <option value="high">High Value</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 py-3 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {generating && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                <path d="M21 12a9 9 0 00-9-9"/>
              </svg>
            )}
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
          <Button variant="secondary" onClick={() => {}}>Save as Template</Button>
        </div>
      </Card>

      {/* Recent Reports */}
      <Card className="mb-4" padding="none">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-black">Recent Reports</h3>
          <p className="text-xs text-gray-400">View and download your generated reports</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Report Name', 'Type', 'Generated', 'Status', 'Size', 'Schedule', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recentReports.map(r => (
              <tr key={r.name} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span className="text-sm font-medium text-black">{r.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${typeColors[r.type]}`}>{r.type}</span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-600">{r.generated}</td>
                <td className="px-5 py-3"><Badge label={r.status.charAt(0).toUpperCase() + r.status.slice(1)} variant={r.status} /></td>
                <td className="px-5 py-3 text-sm text-gray-600">{r.size}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {r.schedule}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-black transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-black transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Scheduled Reports */}
      <Card padding="none">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-black">Scheduled Reports</h3>
            <p className="text-xs text-gray-400">Automatically generated reports on a recurring schedule</p>
          </div>
          <Button size="sm" variant="secondary"
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          >
            Add Schedule
          </Button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Report Name', 'Frequency', 'Next Run', 'Recipients', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {scheduledReports.map(r => (
              <tr key={r.name} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span className="text-sm font-medium text-black">{r.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${typeColors[r.type]}`}>{r.type}</span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-600">{r.nextRun}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{r.recipients}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-black transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-black transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  );
}

export default function ReportsPage() {
  return (
    <PermissionGate permission="export_reports">
      <ReportsPageContent />
    </PermissionGate>
  );
}

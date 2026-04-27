'use client';

import { useState } from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';

const uploadedFiles = [
  { name: 'customer_data_q1_2024.csv', date: 'Apr 15, 2026', status: 'cleaned' as const, records: '2,847', size: '1.2 MB' },
  { name: 'usage_metrics_march.csv',   date: 'Apr 10, 2026', status: 'cleaned' as const, records: '15,432', size: '4.8 MB' },
  { name: 'support_tickets.csv',       date: 'Apr 8, 2026',  status: 'raw'     as const, records: '892',    size: '0.5 MB' },
];

const previewData = [
  { id: 'C-0001', name: 'Acme Corporation',  email: 'contact@acme.com', plan: 'Enterprise',   mrr: '$4,200', segment: 'Loyal Champions' },
  { id: 'C-0002', name: 'TechStart Inc.',     email: 'hello@techstart.io', plan: 'Professional', mrr: '$450',   segment: 'At Risk' },
  { id: 'C-0003', name: 'Global Solutions',   email: 'info@globalsol.com', plan: 'Enterprise',   mrr: '$5,198', segment: 'New Adopters' },
  { id: 'C-0004', name: 'StartupHub',         email: 'team@starthub.co',  plan: 'Starter',      mrr: '$2,110', segment: 'High Value' },
];

const features = [
  { key: 'customer_id',    label: 'customer_id',    type: 'Identifier', selected: true },
  { key: 'customer_name',  label: 'customer_name',  type: 'Text',       selected: true },
  { key: 'plan_type',      label: 'plan_type',      type: 'Category',   selected: false },
  { key: 'monthly_revenue',label: 'monthly_revenue',type: 'Numeric',    selected: true },
  { key: 'status',         label: 'status',         type: 'Category',   selected: false },
  { key: 'last_login_date',label: 'last_login_date',type: 'Date',       selected: true },
  { key: 'engagement_score',label: 'engagement_score',type: 'Numeric',  selected: false },
  { key: 'support_tickets',label: 'support_tickets',type: 'Numeric',    selected: true },
  { key: 'feature_usage',  label: 'feature_usage',  type: 'Numeric',    selected: true },
  { key: 'team_size',      label: 'team_size',      type: 'Numeric',    selected: false },
];

const segmentColors: Record<string, string> = {
  'Loyal Champions': 'bg-green-100 text-green-700',
  'At Risk':         'bg-red-100 text-red-700',
  'New Adopters':    'bg-blue-100 text-blue-700',
  'High Value':      'bg-purple-100 text-purple-700',
};

export default function DataManagementPage() {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(features.map(f => [f.key, f.selected]))
  );

  const toggleFeature = (key: string) => setSelectedFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  const selectedCount = Object.values(selectedFeatures).filter(Boolean).length;

  return (
    <DashboardLayout page="Data Management">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Upload */}
        <Card>
          <h3 className="text-sm font-bold text-black mb-1">Upload Data</h3>
          <p className="text-xs text-gray-400 mb-4">Drag and drop your CSV files or click to browse</p>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); }}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer
              ${dragOver ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}
          >
            <svg className="mx-auto mb-3 text-gray-400" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            <p className="text-sm font-semibold text-black mb-1">Drop your files here</p>
            <p className="text-xs text-gray-400 mb-4">or click to browse your files</p>
            <Button size="sm" onClick={() => {}}>Browse Files</Button>
            <p className="text-xs text-gray-400 mt-3">Supported formats: CSV, Excel (.xlsx). Max file size: 50MB</p>
          </div>
        </Card>

        {/* Uploaded files */}
        <Card>
          <h3 className="text-sm font-bold text-black mb-1">Uploaded Files</h3>
          <p className="text-xs text-gray-400 mb-4">Manage your uploaded datasets</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['File Name', 'Upload Date', 'Status', 'Records', 'Size', 'Actions'].map(h => (
                  <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {uploadedFiles.map(f => (
                <tr key={f.name} className="hover:bg-gray-50">
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span className="text-xs text-gray-700 truncate max-w-32.5">{f.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-gray-500">{f.date}</td>
                  <td className="py-3"><Badge label={f.status.charAt(0).toUpperCase() + f.status.slice(1)} variant={f.status} /></td>
                  <td className="py-3 text-xs text-gray-600">{f.records}</td>
                  <td className="py-3 text-xs text-gray-600">{f.size}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-xs font-semibold text-blue-600 hover:underline">Preview</button>
                      <button className="text-red-400 hover:text-red-600 transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Preview + Feature Selection */}
      <div className="grid grid-cols-2 gap-4">
        <Card padding="none">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-black">Data Preview</h3>
            <p className="text-xs text-gray-400">Preview of customer_data_q1_2024.csv</p>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              {['ID', 'Customer', 'Plan', 'MRR', 'Segment'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {previewData.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{r.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-black">{r.name}</p>
                    <p className="text-[10px] text-gray-400">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.plan}</td>
                  <td className="px-4 py-3 text-xs font-bold text-black">{r.mrr}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${segmentColors[r.segment]}`}>{r.segment}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Showing 6 of 13,000 results</p>
            <div className="flex items-center gap-1.5">
              <button className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 disabled:opacity-40" disabled>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="text-xs text-gray-500">1 / 600</span>
              <button className="w-6 h-6 flex items-center justify-center rounded border border-gray-200">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <select className="text-xs border border-gray-200 rounded px-1.5 py-1 outline-none">
                <option>9</option><option>25</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Feature Selection */}
        <Card>
          <h3 className="text-sm font-bold text-black mb-1">Feature Selection</h3>
          <p className="text-xs text-gray-400 mb-4">Select the features to include in your analysis</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {features.map(f => (
              <button
                key={f.key}
                onClick={() => toggleFeature(f.key)}
                className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all duration-200
                  ${selectedFeatures[f.key] ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-300'}`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200
                  ${selectedFeatures[f.key] ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                >
                  {selectedFeatures[f.key] && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-black">{f.label}</p>
                  <p className="text-[10px] text-gray-400">{f.type}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">{selectedCount} of {features.length} features selected</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => {}}>Reset</Button>
              <Button size="sm" onClick={() => {}}>Apply</Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

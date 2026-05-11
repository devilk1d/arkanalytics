'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import PermissionGate from '../../ui/PermissionGate';
import { useDashboardContext } from '../../context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

type Report = {
  id: string;
  name: string;
  type: 'pdf' | 'csv' | 'xlsx';
  status: 'pending' | 'ready' | 'error';
  storage_path: string | null;
  file_size: number | null;
  created_at: string;
};

const typeColors: Record<string, string> = {
  'pdf':        'bg-red-100 text-red-700',
  'csv':        'bg-blue-100 text-blue-700',
  'xlsx':       'bg-purple-100 text-purple-700',
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function ReportsPageContent({ datasetId }: { datasetId?: string }) {
  const { workspace, myRole } = useDashboardContext();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Dynamic segments list
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);

  const isAdmin = myRole?.toLowerCase() === 'admin' || myRole?.toLowerCase() === 'owner';

  const fetchReports = useCallback(async () => {
    if (!workspace?.id) return;
    try {
      const res = await fetch(`/api/reports?workspace_id=${workspace.id}`);
      const data = await res.json();
      if (res.ok) setReports(data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  const fetchSegments = useCallback(async () => {
    if (!datasetId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('segments')
      .select('segment_label')
      .eq('dataset_id', datasetId);
    
    if (data) {
      const labels = Array.from(new Set(data.map(d => d.segment_label)));
      setAvailableSegments(labels);
    }
  }, [datasetId]);

  useEffect(() => {
    fetchReports();
    fetchSegments();
  }, [fetchReports, fetchSegments]);

  // Realtime subscription
  useEffect(() => {
    if (!workspace?.id) return;
    const supabase = createClient();
    
    const channel = supabase
      .channel('reports-status-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reports',
        filter: `workspace_id=eq.${workspace.id}`
      }, () => {
        fetchReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.id, fetchReports]);

  // Original State
  const [reportType, setReportType]   = useState('churn');
  const [dateRange, setDateRange]     = useState('30d');
  const [exportType, setExportType]   = useState('pdf');
  const [segments, setSegments]       = useState('all');

  const handleGenerate = async () => {
    if (!workspace?.id || !datasetId) {
      toast.error('Data source not ready');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          dataset_id: datasetId,
          name: `${reportType.toUpperCase()} Report - ${new Date().toLocaleDateString()}`,
          type: exportType,
          report_category: reportType,
          date_range: dateRange,
          include_segments: segments
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate report');
      }

      toast.success('Generation started');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: Report) => {
    if (!report.storage_path) return;
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('reports')
        .createSignedUrl(report.storage_path, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      toast.error('Failed to get download link');
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    setDeletingId(reportId);
    try {
      const res = await fetch(`/api/reports?id=${reportId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete report');
      toast.success('Report deleted');
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout page="Reports">
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
              <option value="all">Full Dataset</option>
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
              <option value="xlsx">Excel (.xlsx)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Select Segment</label>
            <select
              value={segments}
              onChange={e => setSegments(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-black transition-colors appearance-none bg-white"
            >
              <option value="all">All Segments</option>
              {availableSegments.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating || !datasetId}
            className="flex-1 py-3 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {generating && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                <path d="M21 12a9 9 0 00-9-9"/>
              </svg>
            )}
            {!datasetId ? 'Waiting for data...' : (generating ? 'Generating...' : 'Generate Report')}
          </button>
          <Button variant="secondary" onClick={() => {}}>Save as Template</Button>
        </div>
      </Card>

      <Card className="mb-4" padding="none">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-black">Recent Reports</h3>
          <p className="text-xs text-gray-400">View and download your generated reports</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Report Name', 'Type', 'Generated', 'Status', 'Size', 'Schedule', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">Loading reports...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">No reports found</td></tr>
              ) : reports.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
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
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${typeColors[r.type] || 'bg-gray-100'}`}>{r.type}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3">
                    <Badge 
                      label={r.status.charAt(0).toUpperCase() + r.status.slice(1)} 
                      variant={r.status === 'error' ? 'high' : r.status as any} 
                    />
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600 font-mono">{formatSize(r.file_size)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      Manual
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={r.status !== 'ready'}
                        onClick={() => handleDownload(r)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                      {isAdmin && (
                        <button 
                          disabled={deletingId === r.id}
                          onClick={() => handleDelete(r.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30"
                        >
                          {deletingId === r.id ? (
                            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
        <table className="w-full text-gray-400">
          <thead>
            <tr className="border-b border-gray-100">
              {['Report Name', 'Frequency', 'Next Run', 'Recipients', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={5} className="px-5 py-8 text-center text-sm">No scheduled reports yet</td></tr>
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  );
}

export default function ReportsPage({ datasetId }: { datasetId?: string }) {
  return (
    <PermissionGate permission="export_reports">
      <ReportsPageContent datasetId={datasetId} />
    </PermissionGate>
  );
}

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
import AuthDropdown from '@/app/components/auth/AuthDropdown';

type Report = {
  id: string;
  name: string;
  type: 'pdf' | 'csv' | 'xlsx';
  report_category?: 'churn' | 'segmentation' | 'forecast';
  status: 'pending' | 'ready' | 'error';
  storage_path: string | null;
  file_size: number | null;
  created_at: string;
};

type ScheduledReport = {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  report_category: 'churn' | 'segmentation' | 'forecast';
  export_type: 'pdf' | 'csv' | 'xlsx';
  include_segments: string;
  recipients: string[];
  time_of_day: string;
  day_of_week?: number | null;
  day_of_month?: number | null;
  next_run_at: string;
  last_run_at: string | null;
  is_active: boolean;
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
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const { workspace, myRole } = useDashboardContext();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Scheduled Reports State
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [deletingSchedId, setDeletingSchedId] = useState<string | null>(null);
  const [runningScheduler, setRunningScheduler] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedBaseReportId, setSelectedBaseReportId] = useState<string>('');
  const [creatingSched, setCreatingSched] = useState(false);
  const [schedName, setSchedName] = useState('');
  const [schedFreq, setSchedFreq] = useState<'daily'|'weekly'|'monthly'>('weekly');
  const [schedCat, setSchedCat] = useState<'churn'|'segmentation'|'forecast'>('churn');
  const [schedExport, setSchedExport] = useState<'pdf'|'csv'|'xlsx'>('pdf');
  const [schedSegment, setSchedSegment] = useState('all');
  const [schedRecipients, setSchedRecipients] = useState('');
  const [schedTime, setSchedTime] = useState('08:00');
  const [schedDayOfWeek, setSchedDayOfWeek] = useState('1');
  const [schedDayOfMonth, setSchedDayOfMonth] = useState('1');
  
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

  const fetchSchedules = useCallback(async () => {
    if (!workspace?.id) return;
    try {
      const res = await fetch(`/api/reports/schedule?workspace_id=${workspace.id}`);
      const data = await res.json();
      if (res.ok) setSchedules(data);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    } finally {
      setLoadingSchedules(false);
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
    fetchSchedules();
    fetchSegments();
  }, [fetchReports, fetchSchedules, fetchSegments]);

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
  const [reportName, setReportName]   = useState('');
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
          name: reportName.trim() || `${reportType.toUpperCase()} Report - ${new Date().toLocaleDateString('en-US')}`,
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

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;
    if (!schedName.trim()) {
      toast.error('Schedule name is required');
      return;
    }

    setCreatingSched(true);
    try {
      const emails = schedRecipients
        .split(',')
        .map(e => e.trim())
        .filter(e => e.includes('@'));

      const res = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          name: schedName.trim(),
          frequency: schedFreq,
          report_category: schedCat,
          export_type: schedExport,
          include_segments: schedSegment,
          recipients: emails,
          time_of_day: schedTime,
          day_of_week: schedFreq === 'weekly' ? schedDayOfWeek : null,
          day_of_month: schedFreq === 'monthly' ? schedDayOfMonth : null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create schedule');
      }

      toast.success('Schedule activated');
      setShowModal(false);
      setSchedName('');
      setSchedRecipients('');
      fetchSchedules();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingSched(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to remove this schedule?')) return;
    setDeletingSchedId(id);
    try {
      const res = await fetch(`/api/reports/schedule?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete schedule');
      toast.success('Schedule removed');
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingSchedId(null);
    }
  };


  const handleTriggerScheduler = async () => {
    setRunningScheduler(true);
    const toastId = toast.loading('Executing due schedules...');
    try {
      const res = await fetch('/api/reports/scheduler', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scheduler failed');
      
      toast.success(`Executed ${data.executed_count || 0} scheduled reports`, { id: toastId });
      fetchReports();
      fetchSchedules();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setRunningScheduler(false);
    }
  };

  return (
    <DashboardLayout page="Reports">
      <Card className="mb-4">
        <h3 className="text-sm font-bold text-black mb-1">Generate Custom Report</h3>
        <p className="text-xs text-gray-400 mb-5">Create a new analytics report with custom parameters</p>

        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Report Name <span className="normal-case text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            placeholder={`e.g. Q2 Churn Analysis - ${isMounted ? new Date().toLocaleDateString('en-US') : ''}`}
            value={reportName}
            onChange={e => setReportName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-black transition-colors placeholder:text-gray-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <AuthDropdown
            label="Report Type"
            value={reportType}
            onChange={setReportType}
            options={[
              { label: 'Churn Analysis', value: 'churn' },
              { label: 'Customer Segmentation', value: 'segmentation' },
              { label: 'Revenue Forecast', value: 'forecast' },
            ]}
          />
          <AuthDropdown
            label="Date Range"
            value={dateRange}
            onChange={setDateRange}
            options={[
              { label: 'Last 7 days', value: '7d' },
              { label: 'Last 30 days', value: '30d' },
              { label: 'Last 90 days', value: '90d' },
              { label: 'Full Dataset', value: 'all' },
            ]}
          />
          <AuthDropdown
            label="Export Type"
            value={exportType}
            onChange={setExportType}
            options={[
              { label: 'PDF Document', value: 'pdf' },
              { label: 'CSV Spreadsheet', value: 'csv' },
              { label: 'Excel (.xlsx)', value: 'xlsx' },
            ]}
          />
          <AuthDropdown
            label="Select Segment"
            value={segments}
            onChange={setSegments}
            options={[
              { label: 'All Segments', value: 'all' },
              ...availableSegments.map(label => ({ label, value: label }))
            ]}
          />
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
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
          <div className="flex items-center gap-2">
            <button
              disabled={runningScheduler}
              onClick={handleTriggerScheduler}
              title="Simulate Cron Execution Now"
              className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-black hover:text-white rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg className={runningScheduler ? "animate-spin" : ""} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Run Scheduler
            </button>
            <Button size="sm" variant="secondary"
              onClick={() => {
                if (reports.length === 0) {
                  toast.error('Please generate a report first to use as a template');
                  return;
                }
                const base = reports[0];
                setSelectedBaseReportId(base.id);
                setSchedName(`Auto: ${base.name.replace(/ - \d.*$/, '')}`);
                setSchedExport(base.type);
                const upper = base.name.toUpperCase();
                let cat: 'churn' | 'segmentation' | 'forecast' = 'churn';
                if (upper.includes('SEGMENT')) cat = 'segmentation';
                else if (upper.includes('FORECAST') || upper.includes('REVENUE')) cat = 'forecast';
                setSchedCat(cat);
                setSchedSegment('all');
                setSchedRecipients('');
                setShowModal(true);
              }}
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
            >
              Add Schedule
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Schedule Name', 'Config', 'Frequency', 'Next Run', 'Recipients', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingSchedules ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Loading schedules...</td></tr>
              ) : schedules.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">No scheduled reports active</td></tr>
              ) : schedules.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="text-sm font-medium text-black">{s.name}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Target: {s.include_segments}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{s.report_category}</span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${typeColors[s.export_type] || 'bg-gray-100'}`}>{s.export_type}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs font-semibold text-gray-700 capitalize">
                      {s.frequency}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {s.frequency === 'weekly' && s.day_of_week !== null && s.day_of_week !== undefined
                        ? `Every ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.day_of_week || 0]} at ${s.time_of_day}`
                        : s.frequency === 'monthly' && s.day_of_month 
                        ? `Day ${s.day_of_month} at ${s.time_of_day}`
                        : `At ${s.time_of_day}`}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">
                    {new Date(s.next_run_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs text-gray-500 max-w-[150px] truncate" title={s.recipients?.join(', ')}>
                      {s.recipients?.length ? s.recipients.join(', ') : 'Archive Only'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {isAdmin && (
                      <button 
                        disabled={deletingSchedId === s.id}
                        onClick={() => handleDeleteSchedule(s.id)}
                        title="Remove Schedule"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 text-gray-400"
                      >
                        {deletingSchedId === s.id ? (
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL: ADD SCHEDULE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-black">New Scheduled Report</h3>
                <p className="text-xs text-gray-400 mt-0.5">Configure automated reporting interval</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-5 space-y-4">
              <AuthDropdown
                label="Select Base Report"
                value={selectedBaseReportId}
                onChange={id => {
                  setSelectedBaseReportId(id);
                  const r = reports.find(item => item.id === id);
                  if (r) {
                    setSchedName(`Auto: ${r.name.replace(/ - \d.*$/, '')}`);
                    setSchedExport(r.type);
                    const upper = r.name.toUpperCase();
                    let cat: 'churn' | 'segmentation' | 'forecast' = 'churn';
                    if (upper.includes('SEGMENT')) cat = 'segmentation';
                    else if (upper.includes('FORECAST') || upper.includes('REVENUE')) cat = 'forecast';
                    setSchedCat(cat);
                  }
                }}
                options={reports.map(r => ({
                  label: `${r.name} (${r.type.toUpperCase()})`,
                  value: r.id
                }))}
              />

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Schedule Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Weekly Executive Briefing"
                  value={schedName}
                  onChange={e => setSchedName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-black outline-none focus:border-black transition-colors"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Locked Format</label>
                  <div className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-500 bg-gray-50 uppercase">
                    {schedExport}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Analytics Type</label>
                  <div className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-500 bg-gray-50 capitalize truncate">
                    {schedCat}
                  </div>
                </div>
                <AuthDropdown
                  label="Frequency"
                  value={schedFreq}
                  onChange={v => setSchedFreq(v as any)}
                  variant="compact"
                  options={[
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Monthly', value: 'monthly' }
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Execution Time</label>
                  <input
                    type="time"
                    required
                    value={schedTime}
                    onChange={e => setSchedTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-black outline-none focus:border-black transition-colors bg-white"
                  />
                </div>
                {schedFreq === 'weekly' ? (
                  <AuthDropdown
                    label="Day of Week"
                    value={schedDayOfWeek}
                    onChange={setSchedDayOfWeek}
                    options={[
                      { label: 'Sunday', value: '0' },
                      { label: 'Monday', value: '1' },
                      { label: 'Tuesday', value: '2' },
                      { label: 'Wednesday', value: '3' },
                      { label: 'Thursday', value: '4' },
                      { label: 'Friday', value: '5' },
                      { label: 'Saturday', value: '6' }
                    ]}
                  />
                ) : schedFreq === 'monthly' ? (
                  <AuthDropdown
                    label="Day of Month"
                    value={schedDayOfMonth}
                    onChange={setSchedDayOfMonth}
                    options={Array.from({ length: 31 }, (_, i) => i + 1).map(d => ({
                      label: `${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}`,
                      value: String(d)
                    }))}
                  />
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Interval</label>
                    <div className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-400 bg-gray-50/50">
                      Every Day
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Notification Emails (Optional)</label>
                <input 
                  type="text" 
                  placeholder="admin@company.com, vp@company.com"
                  value={schedRecipients}
                  onChange={e => setSchedRecipients(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-black outline-none focus:border-black transition-colors"
                />
                <p className="text-[10px] text-gray-400 mt-1">Separate multiple emails with commas</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSched}
                  className="flex-1 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {creatingSched ? 'Saving...' : 'Activate Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

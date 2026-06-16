'use client';

import { useState, useEffect, useCallback } from 'react';
import PermissionGate from '../../ui/PermissionGate';
import { useDashboardContext, type DatasetSummary } from '../../context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { toastSuccess, toastError, toastWarning, toastLoading } from '../../../ui/AppToast';
import FilterDropdown from '../../ui/FilterDropdown';
import ActionConfirmation from '../../ui/ActionConfirmation';
import Badge from '../../ui/Badge';

type Report = {
  id: string;
  name: string;
  type: 'pdf' | 'csv' | 'xlsx';
  report_category?: 'churn' | 'segmentation' | 'forecast';
  status: 'pending' | 'ready' | 'error';
  storage_path: string | null;
  file_size: number | null;
  created_at: string;
  user_id: string;
  dataset_id: string | null;
};


type ScheduledReport = {
  id: string;
  name: string;
  dataset_id: string | null;
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

const formatSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Beautiful inline SVG icons
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const DocIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const ChevronRIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

function ReportsPageContent() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  /* ─── ESC closes any open modal ─── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setShowNewReportModal(false);
      setShowScheduleModal(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const { workspace, myRole, profile, members, activeDatasetId, availableDatasets } = useDashboardContext();
  const datasetId = activeDatasetId;
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

  // Scheduled Reports State
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [deletingSchedId, setDeletingSchedId] = useState<string | null>(null);
  const [schedToDelete, setSchedToDelete] = useState<ScheduledReport | null>(null);
  const [runningScheduler, setRunningScheduler] = useState(false);

  // UI state
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pdf' | 'csv' | 'xlsx'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'churn' | 'segmentation' | 'forecast'>('all');
  const [datasetFilter, setDatasetFilter] = useState<string>('all');
  const [reportPage, setReportPage] = useState(1);
  const reportPageSize = 10;
  const [mainTab, setMainTab] = useState<'reports' | 'schedules'>('reports');

  // Batch selection state
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [selectedSchedIds, setSelectedSchedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteReportsConfirm, setShowBatchDeleteReportsConfirm] = useState(false);
  const [showBatchDeleteSchedsConfirm, setShowBatchDeleteSchedsConfirm] = useState(false);
  const [batchDeletingReports, setBatchDeletingReports] = useState(false);
  const [batchDeletingScheds, setBatchDeletingScheds] = useState(false);
  // Scheduled logs filters + pagination
  const [schedSearch, setSchedSearch] = useState('');
  const [schedFreqFilter, setSchedFreqFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [schedCatFilter, setSchedCatFilter] = useState<'all' | 'churn' | 'segmentation' | 'forecast'>('all');
  const [schedFmtFilter, setSchedFmtFilter] = useState<'all' | 'pdf' | 'csv' | 'xlsx'>('all');
  const [schedStatusFilter, setSchedStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [schedDatasetFilter, setSchedDatasetFilter] = useState<string>('all');
  const [schedPage, setSchedPage] = useState(1);
  const schedPageSize = 10;
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [schedulesOpen, setSchedulesOpen] = useState(true);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Modal forms state
  // New Report Form
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('churn');
  const [dateRange, setDateRange] = useState('30d');
  const [exportType, setExportType] = useState('pdf');
  const [segments, setSegments] = useState('all');

  // New Schedule Form
  const [selectedBaseReportId, setSelectedBaseReportId] = useState<string>('');
  const [creatingSched, setCreatingSched] = useState(false);
  const [schedName, setSchedName] = useState('');
  const [schedFreq, setSchedFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [schedCat, setSchedCat] = useState<'churn' | 'segmentation' | 'forecast'>('churn');
  const [schedExport, setSchedExport] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
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

  // Generators & Helpers
  const handleGenerate = async () => {
    if (!workspace?.id || !datasetId) {
      toastError('Data source not ready');
      return;
    }

    setGenerating(true);
    const toastId = toastLoading('Initiating report generation...');
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

      toastSuccess('Generation started successfully', undefined, { id: toastId });
      setShowNewReportModal(false);
      setReportName('');
      fetchReports();
    } catch (err: any) {
      toastError(err.message, undefined, { id: toastId });
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
      toastError('Failed to get download link');
    }
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;
    const reportId = reportToDelete.id;
    setDeletingId(reportId);
    try {
      const res = await fetch(`/api/reports?id=${reportId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete report');
      toastSuccess('Report deleted');
      setReports(prev => prev.filter(r => r.id !== reportId));
      setReportToDelete(null);
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;
    if (!schedName.trim()) {
      toastError('Schedule name is required');
      return;
    }

    if (!schedRecipients.trim()) {
      toastError('At least one recipient email is required');
      return;
    }

    const emailList = schedRecipients
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emailList.length === 0) {
      toastError('At least one recipient email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter(e => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      toastError(`Invalid email format: ${invalidEmails.join(', ')}`);
      return;
    }

    setCreatingSched(true);
    try {
      const emails = emailList;

      const res = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          dataset_id: datasetId || null,
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

      toastSuccess('Schedule activated successfully');
      setShowScheduleModal(false);
      setSchedName('');
      setSchedRecipients('');
      fetchSchedules();
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setCreatingSched(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!schedToDelete) return;
    const id = schedToDelete.id;
    setDeletingSchedId(id);
    try {
      const res = await fetch(`/api/reports/schedule?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete schedule');
      toastSuccess('Schedule removed');
      setSchedules(prev => prev.filter(s => s.id !== id));
      setSchedToDelete(null);
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setDeletingSchedId(null);
    }
  };

  // Batch selection helpers
  const toggleSelectAllReports = () => {
    if (selectedReportIds.size === paginatedReports.length && paginatedReports.length > 0) {
      setSelectedReportIds(new Set());
    } else {
      setSelectedReportIds(new Set(paginatedReports.map(r => r.id)));
    }
  };
  const toggleSelectReport = (id: string) => {
    const next = new Set(selectedReportIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedReportIds(next);
  };
  const toggleSelectAllScheds = () => {
    if (selectedSchedIds.size === paginatedSchedules.length && paginatedSchedules.length > 0) {
      setSelectedSchedIds(new Set());
    } else {
      setSelectedSchedIds(new Set(paginatedSchedules.map(s => s.id)));
    }
  };
  const toggleSelectSched = (id: string) => {
    const next = new Set(selectedSchedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedSchedIds(next);
  };

  const handleBatchDeleteReports = async () => {
    if (selectedReportIds.size === 0) return;
    setBatchDeletingReports(true);
    const toastId = toastLoading(`Deleting ${selectedReportIds.size} report(s)...`);
    try {
      const ids = Array.from(selectedReportIds);
      const results = await Promise.allSettled(
        ids.map(id => fetch(`/api/reports?id=${id}`, { method: 'DELETE' }))
      );
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length;
      const succeeded = ids.length - failed;
      setReports(prev => prev.filter(r => !selectedReportIds.has(r.id)));
      setSelectedReportIds(new Set());
      setShowBatchDeleteReportsConfirm(false);
      if (failed === 0) {
        toastSuccess(`${succeeded} report(s) deleted`, undefined, { id: toastId });
      } else {
        toastError(`${succeeded} deleted, ${failed} failed`, undefined, { id: toastId });
      }
    } catch (err: any) {
      toastError(err.message, undefined, { id: toastId });
    } finally {
      setBatchDeletingReports(false);
    }
  };

  const handleBatchDeleteScheds = async () => {
    if (selectedSchedIds.size === 0) return;
    setBatchDeletingScheds(true);
    const toastId = toastLoading(`Removing ${selectedSchedIds.size} schedule(s)...`);
    try {
      const ids = Array.from(selectedSchedIds);
      const results = await Promise.allSettled(
        ids.map(id => fetch(`/api/reports/schedule?id=${id}`, { method: 'DELETE' }))
      );
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length;
      const succeeded = ids.length - failed;
      setSchedules(prev => prev.filter(s => !selectedSchedIds.has(s.id)));
      setSelectedSchedIds(new Set());
      setShowBatchDeleteSchedsConfirm(false);
      if (failed === 0) {
        toastSuccess(`${succeeded} schedule(s) removed`, undefined, { id: toastId });
      } else {
        toastError(`${succeeded} removed, ${failed} failed`, undefined, { id: toastId });
      }
    } catch (err: any) {
      toastError(err.message, undefined, { id: toastId });
    } finally {
      setBatchDeletingScheds(false);
    }
  };

  const handleTriggerScheduler = async () => {
    setRunningScheduler(true);
    const toastId = toastLoading('Executing schedules...');
    try {
      const res = await fetch('/api/reports/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace?.id, force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scheduler failed');

      toastSuccess(`Executed ${data.executed_count || 0} scheduled report(s)`, undefined, { id: toastId });
      fetchReports();
      fetchSchedules();
    } catch (err: any) {
      toastError(err.message, undefined, { id: toastId });
    } finally {
      setRunningScheduler(false);
    }
  };

  const handleTemplateClick = (templateName: string) => {
    if (templateName === 'Weekly Churn Pulse') {
      setReportName(`Weekly Churn Pulse - ${new Date().toLocaleDateString('en-US')}`);
      setReportType('churn');
      setDateRange('7d');
      setExportType('pdf');
      setSegments('all');
    } else if (templateName === 'Monthly Retention') {
      setReportName(`Monthly Retention - ${new Date().toLocaleDateString('en-US')}`);
      setReportType('segmentation');
      setDateRange('30d');
      setExportType('pdf');
      setSegments('all');
    } else if (templateName === 'Segment Snapshot') {
      setReportName(`Segment Snapshot - ${new Date().toLocaleDateString('en-US')}`);
      setReportType('segmentation');
      setDateRange('all');
      setExportType('csv');
      setSegments('all');
    } else if (templateName === 'Quarterly Business Review') {
      setReportName(`Quarterly Business Review - ${new Date().toLocaleDateString('en-US')}`);
      setReportType('forecast');
      setDateRange('90d');
      setExportType('xlsx');
      setSegments('all');
    }
    setShowNewReportModal(true);
  };

  // Pre-fill schedule inputs from base report
  const handlePreFillSchedule = (baseReportId: string) => {
    setSelectedBaseReportId(baseReportId);
    const r = reports.find(item => item.id === baseReportId);
    if (r) {
      setSchedName(`Auto: ${r.name.replace(/ - \d.*$/, '')}`);
      setSchedExport(r.type);
      const upper = r.name.toUpperCase();
      let cat: 'churn' | 'segmentation' | 'forecast' = 'churn';
      if (upper.includes('SEGMENT')) cat = 'segmentation';
      else if (upper.includes('FORECAST') || upper.includes('REVENUE')) cat = 'forecast';
      setSchedCat(cat);
    }
  };

  // Profile finder helper
  const getCreatorName = (reportUserId: string) => {
    if (reportUserId === profile?.id) return 'You';
    const member = members.find(m => m.userId === reportUserId);
    return member ? member.fullName : 'Team Member';
  };

  // Check if a report was generated by an automated schedule
  const getIsReportScheduled = (r: Report) => {
    return schedules.some(s => r.name.startsWith(s.name)) || r.name.toLowerCase().startsWith('auto:');
  };

  const getDatasetName = (dsId: string | null) => {
    if (!dsId) return null;
    const ds = availableDatasets.find((d: DatasetSummary) => d.id === dsId);
    return ds?.displayId || `DS-${dsId.slice(0, 6).toUpperCase()}`;
  };

  // Dynamic calculations for KPI cards
  const reportsThisMonth = reports.filter(r => {
    const d = new Date(r.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const getDeltaThisMonth = () => {
    const now = new Date();
    let prevMonth = now.getMonth() - 1;
    let prevYear = now.getFullYear();
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }
    const lastMonthCount = reports.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }).length;

    const diff = reportsThisMonth - lastMonthCount;
    return {
      val: diff >= 0 ? `+${diff}` : `${diff}`,
      isUp: diff >= 0
    };
  };

  const deltaResult = getDeltaThisMonth();
  const activeSchedulesCount = schedules.filter(s => s.is_active).length;
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;
  const totalStorageBytes = reports.reduce((acc, r) => acc + (r.file_size || 0), 0);
  const formattedStorage = formatSize(totalStorageBytes);

  // Search + filter implementation
  const filteredReports = reports.filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.report_category && r.report_category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || r.report_category === categoryFilter;
    const matchesDataset = datasetFilter === 'all' || r.dataset_id === datasetFilter;
    return matchesSearch && matchesType && matchesCategory && matchesDataset;
  });

  const totalReportPages = Math.ceil(filteredReports.length / reportPageSize);
  const paginatedReports = filteredReports.slice((reportPage - 1) * reportPageSize, reportPage * reportPageSize);

  // Scheduled logs filter + pagination
  const filteredSchedules = schedules.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(schedSearch.toLowerCase());
    const matchesFreq = schedFreqFilter === 'all' || s.frequency === schedFreqFilter;
    const matchesCat  = schedCatFilter  === 'all' || s.report_category === schedCatFilter;
    const matchesFmt  = schedFmtFilter  === 'all' || s.export_type === schedFmtFilter;
    const matchesStatus = schedStatusFilter === 'all' || (schedStatusFilter === 'active' ? s.is_active : !s.is_active);
    const matchesDataset = schedDatasetFilter === 'all' || s.dataset_id === schedDatasetFilter;
    return matchesSearch && matchesFreq && matchesCat && matchesFmt && matchesStatus && matchesDataset;
  });
  const totalSchedPages = Math.ceil(filteredSchedules.length / schedPageSize);
  const paginatedSchedules = filteredSchedules.slice((schedPage - 1) * schedPageSize, schedPage * schedPageSize);
  const hasSchedFilters = schedSearch || schedFreqFilter !== 'all' || schedCatFilter !== 'all' || schedFmtFilter !== 'all' || schedStatusFilter !== 'all' || schedDatasetFilter !== 'all';

  // Upcoming schedules calculations
  const activeSchedules = schedules.filter(s => s.is_active);
  const nextSchedule = activeSchedules.length > 0
    ? [...activeSchedules].sort((a, b) => new Date(a.next_run_at).getTime() - new Date(b.next_run_at).getTime())[0]
    : null;

  const upcomingSchedulesList = activeSchedules.length > 1
    ? [...activeSchedules]
        .sort((a, b) => new Date(a.next_run_at).getTime() - new Date(b.next_run_at).getTime())
        .slice(1, 4)
    : [];


  if (!isMounted) return <div className="h-screen bg-[var(--bg)] animate-pulse" />;

  return (
    <div className="fade-in pb-10">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[var(--b)] pb-5">
          <div>
            <p className="text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.14em] mb-1 font-mono">
              Workspace · Deliverables
            </p>
            <h1 className="font-display text-2xl font-black text-[var(--t)] leading-tight tracking-tight">
              Reports
            </h1>
            <p className="text-[12px] text-[var(--t3)] mt-1 max-w-xl">
              Generated reports, scheduled deliveries, and templates for stakeholders.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (reports.length > 0) {
                  handlePreFillSchedule(reports[0].id);
                } else {
                  setSelectedBaseReportId('');
                  setSchedName('');
                  setSchedExport('pdf');
                  setSchedCat('churn');
                }
                setShowScheduleModal(true);
              }}
              className="inline-flex items-center gap-2 text-[11px] font-bold text-[var(--t2)] border border-[var(--b2)] bg-[var(--surf)] rounded-xl px-4 py-2.5 hover:bg-[var(--bg2)] hover:text-[var(--t)] transition-all"
            >
              <CalendarIcon />
              Schedule
            </button>
            <button
              onClick={() => {
                setReportName('');
                setShowNewReportModal(true);
              }}
              disabled={!datasetId}
              className="inline-flex items-center gap-2 text-[11px] font-bold bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-4 py-2.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <PlusIcon />
              New report
            </button>
          </div>
        </div>

        {/* ── KPI Row (4 cards) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5 flex flex-col justify-between min-h-[120px] transition-all hover:shadow-sm">
            <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-[0.08em] mb-1 font-mono">Reports this month</p>
            <p className="font-display text-3xl font-black text-[var(--t)] leading-none tracking-tight">{reportsThisMonth}</p>
            <p className={`text-[11px] font-mono mt-3 ${deltaResult.isUp ? 'text-[var(--s)]' : 'text-[var(--d)]'}`}>
              {deltaResult.val} vs. last month
            </p>
          </div>

          <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5 flex flex-col justify-between min-h-[120px] transition-all hover:shadow-sm">
            <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-[0.08em] mb-1 font-mono">Auto-delivered</p>
            <p className="font-display text-3xl font-black text-[var(--t)] leading-none tracking-tight">{activeSchedulesCount}</p>
            <p className="text-[11px] text-[var(--t3)] font-mono mt-3">Active recurring schedules</p>
          </div>

          <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5 flex flex-col justify-between min-h-[120px] transition-all hover:shadow-sm">
            <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-[0.08em] mb-1 font-mono">Pending review</p>
            <p className="font-display text-3xl font-black text-[var(--t)] leading-none tracking-tight">{pendingReportsCount}</p>
            <p className="text-[11px] text-[var(--t3)] font-mono mt-3">Awaiting document completion</p>
          </div>

          <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5 flex flex-col justify-between min-h-[120px] transition-all hover:shadow-sm">
            <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-[0.08em] mb-1 font-mono">Storage Used</p>
            <p className="font-display text-3xl font-black text-[var(--t)] leading-none tracking-tight">{formattedStorage}</p>
            <p className="text-[11px] text-[var(--t3)] font-mono mt-3">Total files payload size</p>
          </div>
        </div>

        {/* ── Main Layout Split ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Reports / Schedules (8/12 span) */}
          <div className="lg:col-span-8">
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl overflow-hidden">

              {/* ── Tab Bar ── */}
              <div className="flex items-end gap-0 px-5 pt-4 border-b border-[var(--b)] overflow-x-auto">
                {([
                  { key: 'reports',   label: 'Generated reports', count: reports.length },
                  { key: 'schedules', label: 'All scheduled logs', count: schedules.length },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setMainTab(tab.key)}
                    className={`flex items-center gap-1.5 pb-3 px-1 mr-6 text-[13px] font-bold border-b-2 whitespace-nowrap transition-all ${
                      mainTab === tab.key
                        ? 'border-[var(--t)] text-[var(--t)]'
                        : 'border-transparent text-[var(--t3)] hover:text-[var(--t2)]'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[11px] font-semibold font-mono ${mainTab === tab.key ? 'text-[var(--t2)]' : 'text-[var(--t4)]'}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {mainTab === 'reports' && (<>
              {/* List Header & Filters */}
              <div className="p-5 border-b border-[var(--b)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-[var(--t3)] font-mono">{filteredReports.length} files · sorted by date</p>
                  {(typeFilter !== 'all' || categoryFilter !== 'all' || datasetFilter !== 'all') && (
                    <button
                      onClick={() => { setTypeFilter('all'); setCategoryFilter('all'); setDatasetFilter('all'); setReportPage(1); }}
                      className="text-[10px] text-[var(--p)] font-mono hover:underline mt-0.5"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* List / Grid Toggle */}
                  <div className="flex bg-[var(--bg2)] rounded-xl border border-[var(--b)] shrink-0 items-center px-1.5" style={{ height: '34px' }}>
                    <button
                    onClick={() => setView('list')}
                    className={`px-1.5 py-1 rounded-md transition-all ${view === 'list' ? 'bg-[var(--surf)] text-[var(--t)] shadow-sm' : 'text-[var(--t3)] hover:text-[var(--t2)]'}`}
                    title="List View"
                      >
                    <ListIcon />
                  </button>
                  <button
                    onClick={() => setView('grid')}
                    className={`px-1.5 py-1 rounded-md transition-all ${view === 'grid' ? 'bg-[var(--surf)] text-[var(--t)] shadow-sm' : 'text-[var(--t3)] hover:text-[var(--t2)]'}`}
                    title="Grid View"
                      >
                    <GridIcon />
                  </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative flex items-center w-full sm:w-40">
                    <div className="absolute left-3 text-[var(--t3)] pointer-events-none">
                      <SearchIcon />
                    </div>
                    <input
                      type="text"
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setReportPage(1); }}
                      className="w-full bg-[var(--bg1)] border border-[var(--b)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--t)] outline-none focus:border-[var(--b3)] transition-colors font-sans"
                    />
                  </div>

                  {/* Format Filter */}
                  <FilterDropdown
                    options={[
                      { label: 'All formats', value: 'all' },
                      { label: 'PDF', value: 'pdf' },
                      { label: 'CSV', value: 'csv' },
                      { label: 'Excel', value: 'xlsx' },
                    ]}
                    value={typeFilter}
                    onChange={v => { setTypeFilter(v as typeof typeFilter); setReportPage(1); }}
                    placeholder="All formats"
                    size="sm"
                    showIcon={true}
                  />

                  {/* Category Filter */}
                  <FilterDropdown
                    options={[
                      { label: 'All categories', value: 'all' },
                      { label: 'Churn', value: 'churn' },
                      { label: 'Segmentation', value: 'segmentation' },
                      { label: 'Forecast', value: 'forecast' },
                    ]}
                    value={categoryFilter}
                    onChange={v => { setCategoryFilter(v as typeof categoryFilter); setReportPage(1); }}
                    placeholder="All categories"
                    size="sm"
                    showIcon={true}
                  />

                  {/* Dataset Filter */}
                  {availableDatasets.length > 1 && (
                    <FilterDropdown
                      options={[
                        { label: 'All datasets', value: 'all' },
                        ...availableDatasets.map((d: DatasetSummary) => ({
                          label: d.displayId || `DS-${d.id.slice(0, 6).toUpperCase()}`,
                          value: d.id,
                        })),
                      ]}
                      value={datasetFilter}
                      onChange={v => { setDatasetFilter(v); setReportPage(1); }}
                      placeholder="All datasets"
                      size="sm"
                      showIcon={true}
                    />
                  )}
                </div>
              </div>

              {/* ── Reports Selection Bar ── */}
              {selectedReportIds.size > 0 && (
                <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--bg1)] border-b border-[var(--b)]">
                  <span className="text-[11px] font-mono text-[var(--t2)]">{selectedReportIds.size} selected</span>
                  {isAdmin && (
                    <button
                      onClick={() => setShowBatchDeleteReportsConfirm(true)}
                      className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold bg-[var(--d-bg)] border border-[var(--d-b)] text-[var(--d)] hover:bg-[var(--d)] hover:text-white transition-colors"
                    >
                      <TrashIcon /> Delete selected
                    </button>
                  )}
                  <button onClick={() => setSelectedReportIds(new Set())} className="ml-auto text-[11px] text-[var(--t3)] hover:text-[var(--t)] font-medium">Clear</button>
                </div>
              )}

              {/* View Layouts */}
              {loading ? (
                <div className="py-20 text-center text-xs font-mono text-[var(--t3)]">
                  <svg className="animate-spin inline-block mr-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Syncing with datastore...
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="py-24 text-center text-xs font-mono text-[var(--t3)]">
                  No documents found. {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' ? 'Try redefining search filter.' : 'Generate a report to start.'}
                </div>
              ) : view === 'list' ? (
                /* List Layout */
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--b)] bg-[var(--bg1)]/40">
                          <th className="px-4 py-3.5 w-8">
                            <input
                              type="checkbox"
                              checked={paginatedReports.length > 0 && selectedReportIds.size === paginatedReports.length}
                              onChange={toggleSelectAllReports}
                              className="w-4 h-4 rounded border-[var(--b)] accent-[var(--t)] cursor-pointer"
                            />
                          </th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Report</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Dataset</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Category</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Format</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Size</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Status</th>
                          <th className="px-5 py-3.5 text-right text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--b)]">
                        {paginatedReports.map(r => {
                          const isSched = getIsReportScheduled(r);
                          return (
                            <tr key={r.id} className={`hover:bg-[var(--bg1)]/50 transition-colors ${selectedReportIds.has(r.id) ? 'bg-[var(--bg1)]/70' : ''}`}>
                              <td className="px-4 py-3.5">
                                <input
                                  type="checkbox"
                                  checked={selectedReportIds.has(r.id)}
                                  onChange={() => toggleSelectReport(r.id)}
                                  className="w-4 h-4 rounded border-[var(--b)] accent-[var(--t)] cursor-pointer"
                                  style={{ accentColor: 'var(--t)' }}
                                />
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  {/* Thumbnail Mockup */}
                                  <div className={`w-8 h-10 border rounded flex flex-col items-center justify-center font-mono text-[8px] font-bold select-none shrink-0 ${
                                    r.type === 'pdf'
                                      ? 'bg-[var(--d-bg)] border-[var(--d-b)] text-[var(--d)]'
                                      : r.type === 'csv'
                                        ? 'bg-[var(--s-bg)] border-[var(--s-b)] text-[var(--s)]'
                                        : 'bg-[var(--p-bg)] border-[var(--p-b)] text-[var(--p)]'
                                  }`}>
                                    {r.type.toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-semibold text-[var(--t)] truncate flex items-center gap-1.5">
                                      {r.name}
                                      {isSched && (
                                        <span className="text-[var(--p)]" title="Auto-generated schedule">
                                          <CalendarIcon />
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-[var(--t3)] font-mono mt-0.5 truncate">
                                      RPT-{r.id.slice(0, 6).toUpperCase()} · by {getCreatorName(r.user_id)} · {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                {(() => {
                                  const dsName = getDatasetName(r.dataset_id);
                                  const isActive = r.dataset_id === datasetId;
                                  if (!dsName) return <span className="text-[11px] text-[var(--t4)] font-mono">—</span>;
                                  return (
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                                      isActive
                                        ? 'bg-[var(--p-bg)] border-[var(--p-b)] text-[var(--p)]'
                                        : 'bg-[var(--bg2)] border-[var(--b)] text-[var(--t3)]'
                                    }`}>
                                      {isActive && <span className="w-1 h-1 rounded-full bg-[var(--p)] shrink-0" />}
                                      {dsName}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-[11px] font-semibold capitalize text-[var(--t2)] font-sans">
                                  {r.report_category ? (r.report_category === 'churn' ? 'churn analysis' : r.report_category) : 'On demand'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <Badge label={r.type} variant={r.type as 'pdf' | 'csv' | 'xlsx'} />
                              </td>
                              <td className="px-5 py-3.5 text-xs text-[var(--t2)] font-mono">
                                {formatSize(r.file_size)}
                              </td>
                              <td className="px-5 py-3.5">
                                <Badge
                                  label={r.status}
                                  variant={r.status as 'ready' | 'pending' | 'error'}
                                  loading={r.status === 'pending'}
                                />
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-2.5">
                                  <button
                                    disabled={r.status !== 'ready'}
                                    onClick={() => handleDownload(r)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--b2)] text-[var(--t2)] hover:border-[var(--t)] hover:bg-[var(--t)] hover:text-[var(--inv-t)] transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--t2)] disabled:hover:border-[var(--b2)]"
                                    title="Download Signed Document"
                                  >
                                    <DownloadIcon />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      disabled={deletingId === r.id}
                                      onClick={() => setReportToDelete(r)}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--b2)] text-[var(--t3)] hover:border-[var(--d)] hover:bg-[var(--d)] hover:text-white transition-all disabled:opacity-30"
                                      title="Delete Report"
                                    >
                                      {deletingId === r.id ? (
                                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <path d="M21 12a9 9 0 11-6.219-8.56" />
                                        </svg>
                                      ) : (
                                        <TrashIcon />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--b)] text-[11px] text-[var(--t3)] font-mono">
                    <span>
                      Showing {filteredReports.length === 0 ? 0 : `${(reportPage - 1) * reportPageSize + 1}–${Math.min(filteredReports.length, reportPage * reportPageSize)}`} of {filteredReports.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={reportPage === 1}
                        onClick={() => setReportPage(p => Math.max(1, p - 1))}
                        className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <ReportChevronLeftIcon />
                      </button>
                      {(() => {
                        const total = totalReportPages;
                        const current = reportPage;
                        let pages: (number | string)[];
                        if (total <= 5) {
                          pages = Array.from({ length: total }, (_, i) => i + 1);
                        } else if (current <= 3) {
                          pages = [1, 2, 3, 4, '...', total];
                        } else if (current >= total - 2) {
                          pages = [1, '...', total - 3, total - 2, total - 1, total];
                        } else {
                          pages = [1, '...', current - 1, current, current + 1, '...', total];
                        }
                        return pages.map((pg, idx) =>
                          pg === '...' ? (
                            <span key={idx} className="px-1.5 self-center">…</span>
                          ) : (
                            <button
                              key={idx}
                              onClick={() => setReportPage(pg as number)}
                              className={`h-7 min-w-[28px] px-1.5 rounded-lg border text-[11px] transition-all ${
                                reportPage === pg
                                  ? 'bg-[var(--t)] text-[var(--inv-t)] border-[var(--t)]'
                                  : 'border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)]'
                              }`}
                            >
                              {pg}
                            </button>
                          )
                        );
                      })()}
                      <button
                        disabled={reportPage === totalReportPages || totalReportPages === 0}
                        onClick={() => setReportPage(p => Math.min(totalReportPages, p + 1))}
                        className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <ReportChevronRightIcon />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Grid Layout */
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {paginatedReports.map(r => {
                    const isSched = getIsReportScheduled(r);
                    return (
                      <div
                        key={r.id}
                        onClick={() => r.status === 'ready' && handleDownload(r)}
                        className={`border border-[var(--b)] rounded-xl p-4 bg-[var(--surf)] hover:border-[var(--b3)] transition-all flex flex-col justify-between h-[170px] hover:shadow-sm cursor-pointer group`}
                      >
                        {/* Top row */}
                        <div className="flex items-start justify-between">
                          <div className={`w-8 h-10 border rounded flex items-center justify-center font-mono text-[9px] font-black select-none ${
                            r.type === 'pdf'
                              ? 'bg-[var(--d-bg)] border-[var(--d-b)] text-[var(--d)]'
                              : r.type === 'csv'
                                ? 'bg-[var(--s-bg)] border-[var(--s-b)] text-[var(--s)]'
                                : 'bg-[var(--p-bg)] border-[var(--p-b)] text-[var(--p)]'
                          }`}>
                            {r.type.toUpperCase()}
                          </div>

                          <Badge
                            label={r.status}
                            variant={r.status as 'ready' | 'pending' | 'error'}
                            loading={r.status === 'pending'}
                          />
                        </div>

                        {/* Title Row */}
                        <div className="mt-2.5 flex-1 min-h-0">
                          <h4 className="text-[12px] font-bold text-[var(--t)] leading-tight line-clamp-2 group-hover:text-[var(--p)] transition-colors">
                            {r.name}
                          </h4>
                          <p className="text-[9px] text-[var(--t3)] font-mono mt-1">
                            RPT-{r.id.slice(0, 6).toUpperCase()} · by {getCreatorName(r.user_id)}
                          </p>
                        </div>

                        {/* Bottom Row */}
                        <div className="flex items-center justify-between border-t border-[var(--b)] pt-2.5 mt-2 text-[11px] font-mono text-[var(--t2)]">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="truncate max-w-[110px] capitalize">
                              {r.report_category || 'On demand'}
                            </span>
                            {getDatasetName(r.dataset_id) && (
                              <span className={`text-[9px] font-bold truncate max-w-[110px] ${r.dataset_id === datasetId ? 'text-[var(--p)]' : 'text-[var(--t4)]'}`}>
                                {getDatasetName(r.dataset_id)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span>{formatSize(r.file_size)}</span>
                            {isSched && (
                              <span className="text-[var(--p)]" title="Auto-generated schedule">
                                <CalendarIcon />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </>)}

              {/* ── All Scheduled Logs Tab ── */}
              {mainTab === 'schedules' && (loadingSchedules ? (
                <div className="py-20 text-center text-xs font-mono text-[var(--t3)]">
                  <svg className="animate-spin inline-block mr-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Loading schedules...
                </div>
              ) : (<>
                {/* Filter bar */}
                <div className="p-4 border-b border-[var(--b)] flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="relative flex items-center w-40 shrink-0">
                    <div className="absolute left-3 text-[var(--t3)] pointer-events-none">
                      <SearchIcon />
                    </div>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={schedSearch}
                      onChange={e => { setSchedSearch(e.target.value); setSchedPage(1); }}
                      className="w-full bg-[var(--bg1)] border border-[var(--b)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--t)] outline-none focus:border-[var(--b3)] transition-colors font-sans"
                    />
                  </div>
                  <FilterDropdown
                    options={[
                      { label: 'All frequencies', value: 'all' },
                      { label: 'Daily',   value: 'daily' },
                      { label: 'Weekly',  value: 'weekly' },
                      { label: 'Monthly', value: 'monthly' },
                    ]}
                    value={schedFreqFilter}
                    onChange={v => { setSchedFreqFilter(v as typeof schedFreqFilter); setSchedPage(1); }}
                    placeholder="All frequencies"
                    size="sm"
                    showIcon={true}
                  />
                  <FilterDropdown
                    options={[
                      { label: 'All categories',  value: 'all' },
                      { label: 'Churn',         value: 'churn' },
                      { label: 'Segmentation',  value: 'segmentation' },
                      { label: 'Forecast',      value: 'forecast' },
                    ]}
                    value={schedCatFilter}
                    onChange={v => { setSchedCatFilter(v as typeof schedCatFilter); setSchedPage(1); }}
                    placeholder="All categories"
                    size="sm"
                    showIcon={true}
                  />
                  <FilterDropdown
                    options={[
                      { label: 'All formats', value: 'all' },
                      { label: 'PDF',   value: 'pdf' },
                      { label: 'CSV',   value: 'csv' },
                      { label: 'Excel', value: 'xlsx' },
                    ]}
                    value={schedFmtFilter}
                    onChange={v => { setSchedFmtFilter(v as typeof schedFmtFilter); setSchedPage(1); }}
                    placeholder="All formats"
                    size="sm"
                    showIcon={true}
                  />
                  <FilterDropdown
                    options={[
                      { label: 'All statuses', value: 'all' },
                      { label: 'Active', value: 'active' },
                      { label: 'Paused', value: 'paused' },
                    ]}
                    value={schedStatusFilter}
                    onChange={v => { setSchedStatusFilter(v as typeof schedStatusFilter); setSchedPage(1); }}
                    placeholder="All statuses"
                    size="sm"
                    showIcon={true}
                  />
                  {availableDatasets.length > 1 && (
                    <FilterDropdown
                      options={[
                        { label: 'All datasets', value: 'all' },
                        ...availableDatasets.map((d: DatasetSummary) => ({
                          label: d.displayId || `DS-${d.id.slice(0, 6).toUpperCase()}`,
                          value: d.id,
                        })),
                      ]}
                      value={schedDatasetFilter}
                      onChange={v => { setSchedDatasetFilter(v); setSchedPage(1); }}
                      placeholder="All datasets"
                      size="sm"
                      showIcon={true}
                    />
                  )}
                  {hasSchedFilters && (
                    <button
                      onClick={() => {
                        setSchedSearch(''); setSchedFreqFilter('all');
                        setSchedCatFilter('all'); setSchedFmtFilter('all');
                        setSchedStatusFilter('all'); setSchedDatasetFilter('all'); setSchedPage(1);
                      }}
                      className="text-[11px] font-mono font-bold text-[var(--p)] hover:underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                  <span className="ml-auto text-[11px] font-mono text-[var(--t3)]">{filteredSchedules.length} schedules</span>
                </div>

                {/* ── Schedules Selection Bar ── */}
                {selectedSchedIds.size > 0 && (
                  <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--bg1)] border-b border-[var(--b)]">
                    <span className="text-[11px] font-mono text-[var(--t2)]">{selectedSchedIds.size} selected</span>
                    {isAdmin && (
                      <button
                        onClick={() => setShowBatchDeleteSchedsConfirm(true)}
                        className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold bg-[var(--d-bg)] border border-[var(--d-b)] text-[var(--d)] hover:bg-[var(--d)] hover:text-white transition-colors"
                      >
                        <TrashIcon /> Delete selected
                      </button>
                    )}
                    <button onClick={() => setSelectedSchedIds(new Set())} className="ml-auto text-[11px] text-[var(--t3)] hover:text-[var(--t)] font-medium">Clear</button>
                  </div>
                )}

                {/* Table */}
                {filteredSchedules.length === 0 ? (
                  <div className="py-24 text-center text-xs font-mono text-[var(--t3)]">
                    No schedules match the current filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--b)] bg-[var(--bg1)]/40">
                          <th className="px-4 py-3.5 w-8">
                            <input
                              type="checkbox"
                              checked={paginatedSchedules.length > 0 && selectedSchedIds.size === paginatedSchedules.length}
                              onChange={toggleSelectAllScheds}
                              className="w-4 h-4 rounded border-[var(--b)] accent-[var(--t)] cursor-pointer"
                            />
                          </th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Schedule</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Dataset</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Frequency</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Category</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Format</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Next run</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Recipients</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Status</th>
                          {isAdmin && <th className="px-5 py-3.5 text-right text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--b)]">
                        {paginatedSchedules.map(sched => (
                          <tr key={sched.id} className={`hover:bg-[var(--bg1)]/50 transition-colors ${selectedSchedIds.has(sched.id) ? 'bg-[var(--bg1)]/70' : ''}`}>
                            <td className="px-4 py-3.5">
                              <input
                                type="checkbox"
                                checked={selectedSchedIds.has(sched.id)}
                                onChange={() => toggleSelectSched(sched.id)}
                                className="w-4 h-4 rounded border-[var(--b)] accent-[var(--t)] cursor-pointer"
                                style={{ accentColor: 'var(--t)' }}
                              />
                            </td>
                            {/* Name */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[var(--p-bg)] border border-[var(--p-b)] flex items-center justify-center shrink-0 text-[var(--p)]">
                                  <CalendarIcon />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold text-[var(--t)] truncate">{sched.name}</div>
                                  <div className="text-[10px] text-[var(--t3)] font-mono mt-0.5">at {sched.time_of_day}</div>
                                </div>
                              </div>
                            </td>
                            {/* Dataset */}
                            <td className="px-5 py-3.5">
                              {(() => {
                                const dsName = getDatasetName(sched.dataset_id);
                                const isActive = sched.dataset_id === datasetId;
                                if (!dsName) return <span className="text-[11px] text-[var(--t4)] font-mono">—</span>;
                                return (
                                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                                    isActive
                                      ? 'bg-[var(--p-bg)] border-[var(--p-b)] text-[var(--p)]'
                                      : 'bg-[var(--bg2)] border-[var(--b)] text-[var(--t3)]'
                                  }`}>
                                    {isActive && <span className="w-1 h-1 rounded-full bg-[var(--p)] shrink-0" />}
                                    {dsName}
                                  </span>
                                );
                              })()}
                            </td>
                            {/* Frequency */}
                            <td className="px-5 py-3.5">
                              <span className="text-[11px] font-semibold capitalize text-[var(--t2)]">{sched.frequency}</span>
                            </td>
                            {/* Category */}
                            <td className="px-5 py-3.5">
                              <span className="text-[11px] font-semibold capitalize text-[var(--t2)]">{sched.report_category}</span>
                            </td>
                            {/* Format */}
                            <td className="px-5 py-3.5">
                              <Badge label={sched.export_type} variant={sched.export_type as 'pdf' | 'csv' | 'xlsx'} />
                            </td>
                            {/* Next run */}
                            <td className="px-5 py-3.5 text-xs font-mono text-[var(--t2)]">
                              {new Date(sched.next_run_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            {/* Recipients */}
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-mono text-[var(--t2)]">{sched.recipients?.length || 0}</span>
                            </td>
                            {/* Status */}
                            <td className="px-5 py-3.5">
                              <Badge
                                label={sched.is_active ? 'active' : 'paused'}
                                variant={sched.is_active ? 'ready' : 'pending'}
                              />
                            </td>
                            {/* Actions */}
                            {isAdmin && (
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  disabled={deletingSchedId === sched.id}
                                  onClick={() => setSchedToDelete(sched)}
                                  className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-[var(--b2)] text-[var(--t3)] hover:border-[var(--d)] hover:bg-[var(--d)] hover:text-white transition-all disabled:opacity-30"
                                  title="Remove Schedule"
                                >
                                  {deletingSchedId === sched.id ? (
                                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                                    </svg>
                                  ) : (
                                    <TrashIcon />
                                  )}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--b)] text-[11px] text-[var(--t3)] font-mono">
                  <span>
                    Showing {filteredSchedules.length === 0 ? 0 : `${(schedPage - 1) * schedPageSize + 1}–${Math.min(filteredSchedules.length, schedPage * schedPageSize)}`} of {filteredSchedules.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={schedPage === 1}
                      onClick={() => setSchedPage(p => Math.max(1, p - 1))}
                      className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ReportChevronLeftIcon />
                    </button>
                    {(() => {
                      const total = totalSchedPages;
                      const current = schedPage;
                      let pages: (number | string)[];
                      if (total <= 5) {
                        pages = Array.from({ length: total }, (_, i) => i + 1);
                      } else if (current <= 3) {
                        pages = [1, 2, 3, 4, '...', total];
                      } else if (current >= total - 2) {
                        pages = [1, '...', total - 3, total - 2, total - 1, total];
                      } else {
                        pages = [1, '...', current - 1, current, current + 1, '...', total];
                      }
                      return pages.map((pg, idx) =>
                        pg === '...' ? (
                          <span key={idx} className="px-1.5 self-center">…</span>
                        ) : (
                          <button
                            key={idx}
                            onClick={() => setSchedPage(pg as number)}
                            className={`h-7 min-w-[28px] px-1.5 rounded-lg border text-[11px] transition-all ${
                              schedPage === pg
                                ? 'bg-[var(--t)] text-[var(--inv-t)] border-[var(--t)]'
                                : 'border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)]'
                            }`}
                          >
                            {pg}
                          </button>
                        )
                      );
                    })()}
                    <button
                      disabled={schedPage === totalSchedPages || totalSchedPages === 0}
                      onClick={() => setSchedPage(p => Math.min(totalSchedPages, p + 1))}
                      className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ReportChevronRightIcon />
                    </button>
                  </div>
                </div>
              </>))}
            </div>
          </div>

          {/* Right Column: Templates & Schedules (4/12 span) */}
          <div className="lg:col-span-4 flex flex-col gap-6">

            {/* Quick Templates Card */}
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl overflow-hidden">
              <button
                onClick={() => setTemplatesOpen(o => !o)}
                className="w-full flex items-center justify-between p-5 pb-4 border-b border-[var(--b)] text-left hover:bg-[var(--bg1)]/30 transition-colors"
              >
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--t)]">Quick templates</h3>
                  <p className="text-[11px] text-[var(--t3)] font-mono mt-0.5">Pre-built report parameters</p>
                </div>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`shrink-0 text-[var(--t3)] transition-transform duration-200 ${templatesOpen ? 'rotate-0' : '-rotate-90'}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {templatesOpen && (
                <div className="p-5 flex flex-col gap-2.5">
                  {[
                    { name: 'Weekly Churn Pulse', desc: 'High-risk customers, weekly delta, and top movers.', cadence: 'Weekly · Fri 9:00' },
                    { name: 'Monthly Retention', desc: 'Cohort retention matrices, NRR, and contraction.', cadence: 'Monthly · 1st' },
                    { name: 'Segment Snapshot', desc: 'Summary of all behavioral segment traits and metrics.', cadence: 'On-demand' },
                    { name: 'Quarterly Business Review', desc: 'Full business scope, revenue loss forecast, and segment LTV.', cadence: 'Quarterly' }
                  ].map((tmpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTemplateClick(tmpl.name)}
                      className="flex items-start gap-3 p-3 border border-[var(--b)] hover:border-[var(--b3)] hover:bg-[var(--bg1)]/30 rounded-xl text-left transition-all group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg2)] flex items-center justify-center shrink-0 text-[var(--p)] group-hover:bg-[var(--p)] group-hover:text-[var(--inv-t)] transition-colors">
                        <DocIcon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-[var(--t)] leading-snug group-hover:text-[var(--p)] transition-colors">{tmpl.name}</div>
                        <div className="text-[11px] text-[var(--t3)] leading-relaxed mt-1 line-clamp-2">{tmpl.desc}</div>
                        <div className="text-[11px] font-bold text-[var(--t2)] font-mono uppercase tracking-wider mt-2.5">{tmpl.cadence}</div>
                      </div>
                      <div className="text-[var(--t3)] shrink-0 self-center group-hover:translate-x-0.5 transition-transform">
                        <ChevronRIcon />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Next Scheduled Delivery Card */}
            <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--b)]">
                <button
                  onClick={() => setSchedulesOpen(o => !o)}
                  className="flex-1 flex items-center justify-between p-5 pb-4 text-left hover:bg-[var(--bg1)]/30 transition-colors"
                >
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--t)]">Next scheduled</h3>
                    <p className="text-[11px] text-[var(--t3)] font-mono mt-0.5">Automated cron deliveries</p>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`shrink-0 text-[var(--t3)] transition-transform duration-200 ${schedulesOpen ? 'rotate-0' : '-rotate-90'}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isAdmin && (
                  <div className="pr-4 shrink-0">
                    <button
                      onClick={handleTriggerScheduler}
                      disabled={runningScheduler}
                      className="text-[11px] font-mono font-bold text-[var(--t2)] bg-[var(--bg2)] border border-[var(--b2)] hover:border-[var(--t)] hover:bg-[var(--bg3)] rounded-md px-2 py-1 flex items-center gap-1 transition-all disabled:opacity-50"
                      title="Simulate Cron Trigger Now"
                    >
                      <svg className={`shrink-0 ${runningScheduler ? 'animate-spin' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      Simulate
                    </button>
                  </div>
                )}
              </div>

              {schedulesOpen && (nextSchedule ? (
                <div className="p-5 space-y-4">
                  {/* Highlight Next Delivery */}
                  <div className="p-3.5 bg-[var(--p-bg)] border border-[var(--p-b)] rounded-xl">
                    <div className="flex items-center gap-2 text-[var(--p)] font-semibold font-mono text-[11px] uppercase tracking-wider mb-2">
                      <CalendarIcon />
                      <span>
                        {new Date(nextSchedule.next_run_at).toLocaleString('en-US', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-[var(--t)] leading-tight">{nextSchedule.name}</div>
                    <div className="text-[11px] text-[var(--t3)] font-mono mt-1.5 flex items-center justify-between">
                      <span className="capitalize">{nextSchedule.frequency} · {nextSchedule.export_type.toUpperCase()}</span>
                      <span className="text-[var(--t2)]">{nextSchedule.recipients?.length || 0} recipients</span>
                    </div>
                  </div>

                  {/* Upcoming list this week */}
                  {upcomingSchedulesList.length > 0 && (
                    <div>
                      <div className="h-px bg-[var(--b)] my-4" />
                      <div className="text-[11px] font-bold font-mono text-[var(--t3)] uppercase tracking-wider mb-2.5">Upcoming Deliveries</div>
                      <div className="divide-y divide-[var(--b)]">
                        {upcomingSchedulesList.map((sched, idx) => (
                          <div key={sched.id} className="py-2.5 flex items-center justify-between gap-3 text-xs last:pb-0">
                            <div className="min-w-0">
                              <div className="font-bold text-[var(--t)] truncate">{sched.name}</div>
                              <div className="text-[11px] text-[var(--t3)] font-mono mt-0.5">
                                {new Date(sched.next_run_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {sched.recipients?.length || 0} recipients
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                disabled={deletingSchedId === sched.id}
                                onClick={() => setSchedToDelete(sched)}
                                className="text-[var(--t3)] hover:text-[var(--d)] p-1 rounded hover:bg-[var(--bg2)] transition-colors shrink-0"
                                title="Remove Schedule"
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View all → switch to schedules tab */}
                  {schedules.length > 0 && (
                    <button
                      onClick={() => setMainTab('schedules')}
                      className="w-full pt-2 text-[11px] font-mono font-bold text-[var(--p)] hover:underline text-left"
                    >
                      View all {schedules.length} scheduled logs →
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs font-mono text-[var(--t3)]">
                  No automated schedules active.
                </div>
              ))}
            </div>
          </div>
        </div>

      {/* ── MODAL: GENERATE CUSTOM REPORT ── */}
      {showNewReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={e => { if (e.target === e.currentTarget) setShowNewReportModal(false); }}>
          <div className="bg-[var(--surf)] border border-[var(--b3)] rounded-2xl max-w-md w-full shadow-2xl animate-scale-in">
            <div className="p-5 border-b border-[var(--b)] flex items-center justify-between bg-[var(--bg1)]/50 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-bold text-[var(--t)]">Generate Custom Report</h3>
                <p className="text-[11px] text-[var(--t3)] mt-0.5">Select scopes and target format parameters</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewReportModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--bg2)] text-[var(--t3)] hover:text-[var(--t)] transition-all cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-4 font-sans">
              <div>
                <label className="text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.08em] block mb-1.5 font-mono">Report Name <span className="normal-case text-[var(--t4)] font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder={`e.g. Q4 Growth Audit - ${new Date().toLocaleDateString('en-US')}`}
                  value={reportName}
                  onChange={e => setReportName(e.target.value)}
                  className="w-full bg-[var(--bg1)] border border-[var(--b)] rounded-xl px-4 h-10 text-sm text-[var(--t)] outline-none focus:border-[var(--b3)] transition-colors placeholder:text-[var(--t4)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FilterDropdown
                  label="Report Type"
                  value={reportType}
                  onChange={setReportType}
                  size="md"
                  options={[
                    { label: 'Churn Analysis', value: 'churn' },
                    { label: 'Customer Segmentation', value: 'segmentation' },
                    { label: 'Revenue Forecast', value: 'forecast' },
                  ]}
                />

                <FilterDropdown
                  label="Date Range"
                  value={dateRange}
                  onChange={setDateRange}
                  size="md"
                  options={[
                    { label: 'Last 7 days', value: '7d' },
                    { label: 'Last 30 days', value: '30d' },
                    { label: 'Last 90 days', value: '90d' },
                    { label: 'Full Dataset', value: 'all' },
                  ]}
                />

                <FilterDropdown
                  label="Export Type"
                  value={exportType}
                  onChange={setExportType}
                  size="md"
                  options={[
                    { label: 'PDF Document', value: 'pdf' },
                    { label: 'CSV Spreadsheet', value: 'csv' },
                    { label: 'Excel (.xlsx)', value: 'xlsx' },
                  ]}
                />

                <FilterDropdown
                  label="Select Segment"
                  value={segments}
                  onChange={setSegments}
                  size="md"
                  options={[
                    { label: 'All Segments', value: 'all' },
                    ...availableSegments.map(seg => ({ label: seg, value: seg })),
                  ]}
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewReportModal(false)}
                  className="flex-1 py-2.5 border border-[var(--b2)] text-[var(--t2)] hover:bg-[var(--bg2)] rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !datasetId}
                  className="flex-1 py-2.5 bg-[var(--t)] text-[var(--inv-t)] rounded-xl font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  {generating && (
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                  )}
                  {generating ? 'Generating...' : 'Confirm Execution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SCHEDULE NEW AUTOMATED REPORT ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={e => { if (e.target === e.currentTarget) setShowScheduleModal(false); }}>
          <div className="bg-[var(--surf)] border border-[var(--b3)] rounded-2xl max-w-md w-full shadow-2xl animate-scale-in overflow-y-auto max-h-[90vh]">
            <div className="p-5 border-b border-[var(--b)] flex items-center justify-between bg-[var(--bg1)]/50 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-bold text-[var(--t)]">New Scheduled Delivery</h3>
                <p className="text-[11px] text-[var(--t3)] mt-0.5">
                  Configure automated recurring deliveries
                  {datasetId && (
                    <> · Dataset: <span className="font-bold text-[var(--p)]">{getDatasetName(datasetId) || '—'}</span></>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--bg2)] text-[var(--t3)] hover:text-[var(--t)] transition-all cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-5 space-y-4 font-sans">
              
              {/* Select recent report as template */}
              {reports.length > 0 && (
                <FilterDropdown
                  label="Based on Recent Report"
                  value={selectedBaseReportId}
                  onChange={handlePreFillSchedule}
                  size="md"
                  placeholder="-- select base config --"
                  options={[
                    { label: '-- select base config --', value: '' },
                    ...reports.map(r => ({ label: `${r.name} (${r.type.toUpperCase()})`, value: r.id })),
                  ]}
                />
              )}

              <div>
                <label className="text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.08em] block mb-1.5 font-mono">Schedule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Retention Audit"
                  value={schedName}
                  onChange={e => setSchedName(e.target.value)}
                  className="w-full bg-[var(--bg1)] border border-[var(--b)] rounded-xl px-4 h-10 text-sm text-[var(--t)] outline-none focus:border-[var(--b3)] transition-colors placeholder:text-[var(--t4)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FilterDropdown
                  label="Format"
                  value={schedExport}
                  onChange={v => setSchedExport(v as 'pdf' | 'csv' | 'xlsx')}
                  size="md"
                  options={[
                    { label: 'PDF', value: 'pdf' },
                    { label: 'CSV', value: 'csv' },
                    { label: 'Excel', value: 'xlsx' },
                  ]}
                />

                <FilterDropdown
                  label="Category"
                  value={schedCat}
                  onChange={v => setSchedCat(v as 'churn' | 'segmentation' | 'forecast')}
                  size="md"
                  options={[
                    { label: 'Churn', value: 'churn' },
                    { label: 'Segments', value: 'segmentation' },
                    { label: 'Forecast', value: 'forecast' },
                  ]}
                />

                <FilterDropdown
                  label="Frequency"
                  value={schedFreq}
                  onChange={v => setSchedFreq(v as 'daily' | 'weekly' | 'monthly')}
                  size="md"
                  options={[
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Monthly', value: 'monthly' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.08em] block mb-1.5 font-mono">Execution Time</label>
                  <input
                    type="time"
                    required
                    value={schedTime}
                    onChange={e => setSchedTime(e.target.value)}
                    className="w-full bg-[var(--bg1)] border border-[var(--b)] rounded-xl px-3 h-10 text-sm text-[var(--t)] outline-none focus:border-[var(--b3)] transition-colors font-mono"
                  />
                </div>

                {schedFreq === 'weekly' ? (
                  <FilterDropdown
                    label="Day of Week"
                    value={schedDayOfWeek}
                    onChange={setSchedDayOfWeek}
                    size="md"
                    options={[
                      { label: 'Sunday', value: '0' },
                      { label: 'Monday', value: '1' },
                      { label: 'Tuesday', value: '2' },
                      { label: 'Wednesday', value: '3' },
                      { label: 'Thursday', value: '4' },
                      { label: 'Friday', value: '5' },
                      { label: 'Saturday', value: '6' },
                    ]}
                  />
                ) : schedFreq === 'monthly' ? (
                  <FilterDropdown
                    label="Day of Month"
                    value={schedDayOfMonth}
                    onChange={setSchedDayOfMonth}
                    size="md"
                    options={Array.from({ length: 31 }, (_, i) => {
                      const d = i + 1;
                      const suffix = d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th';
                      return { label: `${d}${suffix}`, value: String(d) };
                    })}
                  />
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.08em] block mb-1.5 font-mono">Day Schedule</label>
                    <div className="w-full border border-[var(--b)] bg-[var(--bg2)] text-[var(--t3)] rounded-lg px-3 h-10 flex items-center text-sm font-medium select-none">
                      Runs Every Day
                    </div>
                  </div>
                )}
              </div>

              <FilterDropdown
                label="Segment Scope"
                value={schedSegment}
                onChange={setSchedSegment}
                size="md"
                options={[
                  { label: 'All Segments', value: 'all' },
                  ...availableSegments.map(seg => ({ label: seg, value: seg })),
                ]}
              />

              <div>
                <label className="text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.08em] block mb-1.5 font-mono">Notification Emails <span className="normal-case text-[var(--d)] font-semibold">(required)</span></label>
                <input
                  type="text"
                  placeholder="e.g. boss@corp.com, partner@corp.com"
                  value={schedRecipients}
                  onChange={e => setSchedRecipients(e.target.value)}
                  className="w-full bg-[var(--bg1)] border border-[var(--b)] rounded-xl px-4 h-10 text-sm text-[var(--t)] outline-none focus:border-[var(--b3)] transition-colors placeholder:text-[var(--t4)]"
                />
                <p className="text-[11px] text-[var(--t4)] mt-1.5 leading-normal">Separate multiple emails with commas</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-2.5 border border-[var(--b2)] text-[var(--t2)] hover:bg-[var(--bg2)] rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSched}
                  className="flex-1 py-2.5 bg-[var(--t)] text-[var(--inv-t)] rounded-xl font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  {creatingSched ? (
                    <>
                      <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                      Activating...
                    </>
                  ) : (
                    'Activate Schedule'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE REPORT CONFIRMATION ── */}
      <ActionConfirmation
        isOpen={!!reportToDelete}
        onClose={() => setReportToDelete(null)}
        title="Delete Report"
        description={
          reportToDelete
            ? `Are you sure you want to delete "${reportToDelete.name}"? This action cannot be undone.`
            : ''
        }
        actionLabel="Delete Report"
        isDangerous={true}
        isLoading={!!deletingId}
        onConfirm={handleDelete}
      />

      {/* ── DELETE SCHEDULE CONFIRMATION ── */}
      <ActionConfirmation
        isOpen={!!schedToDelete}
        onClose={() => setSchedToDelete(null)}
        title="Remove Schedule"
        description={
          schedToDelete
            ? `Are you sure you want to remove the schedule "${schedToDelete.name}"? Automated deliveries will stop immediately.`
            : ''
        }
        actionLabel="Remove Schedule"
        isDangerous={true}
        isLoading={!!deletingSchedId}
        onConfirm={handleDeleteSchedule}
      />

      {/* ── BATCH DELETE REPORTS CONFIRMATION ── */}
      <ActionConfirmation
        isOpen={showBatchDeleteReportsConfirm}
        onClose={() => setShowBatchDeleteReportsConfirm(false)}
        title="Delete Reports"
        description={`Are you sure you want to delete ${selectedReportIds.size} selected report(s)? This action cannot be undone.`}
        actionLabel={`Delete ${selectedReportIds.size} Report(s)`}
        isDangerous={true}
        isLoading={batchDeletingReports}
        onConfirm={handleBatchDeleteReports}
      />

      {/* ── BATCH DELETE SCHEDULES CONFIRMATION ── */}
      <ActionConfirmation
        isOpen={showBatchDeleteSchedsConfirm}
        onClose={() => setShowBatchDeleteSchedsConfirm(false)}
        title="Remove Schedules"
        description={`Are you sure you want to remove ${selectedSchedIds.size} selected schedule(s)? Automated deliveries will stop immediately.`}
        actionLabel={`Remove ${selectedSchedIds.size} Schedule(s)`}
        isDangerous={true}
        isLoading={batchDeletingScheds}
        onConfirm={handleBatchDeleteScheds}
      />
    </div>
  );
}

function ReportChevronLeftIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ReportChevronRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function ReportsPage() {
  return (
    <PermissionGate permission="export_reports">
      <ReportsPageContent />
    </PermissionGate>
  );
}

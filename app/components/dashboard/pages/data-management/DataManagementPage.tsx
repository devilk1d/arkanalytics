'use client';

import { useState, useRef, useCallback, useEffect, Fragment } from 'react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import StatCard from '../../ui/StatCard';
import { createClient } from '@/lib/supabase/client';
import { useDashboardContext } from '../../context/DashboardContext';
import PermissionGate from '../../ui/PermissionGate';
import ActionConfirmation from '../../ui/ActionConfirmation';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DatasetRow {
  id: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  storage_path: string;
  total_customers: number | null;
  churn_rate_pct: number | null;
  created_at: string;
  error_message: string | null;
}

const REQUIRED_FILES = {
  customer_accounts: { label: 'customer_accounts.csv', desc: 'Customer accounts & plan data' },
  monthly_usage_metrics: { label: 'monthly_usage_metrics.csv', desc: 'Usage hours & feature adoption' },
  billing_data: { label: 'billing_data.csv', desc: 'Payment & billing records' },
  support_tickets: { label: 'support_tickets.csv', desc: 'Support ticket history' },
  nps_surveys_with_feedback: { label: 'nps_surveys_with_feedback.csv', desc: 'NPS scores & feedback text' },
} as const;

type FileKey = keyof typeof REQUIRED_FILES;

const PREVIEW_COLS: Record<FileKey, string[]> = {
  customer_accounts: ['customer_id', 'plan_type', 'contract_type', 'subscription_date', 'total_users', 'unsubscribed_date'],
  monthly_usage_metrics: ['customer_id', 'monthly_usage_hrs', 'feature_adoption_pct', 'last_login_date'],
  billing_data: ['customer_id', 'record_type', 'billing_date', 'payment_value'],
  support_tickets: ['ticket_id', 'customer_id', 'category', 'priority', 'status'],
  nps_surveys_with_feedback: ['customer_id', 'nps_score', 'segment', 'feedback_category', 'feedback_text'],
};

const CSV_TEMPLATES: Record<FileKey, { headers: string[]; sample: string[]; instructions: string }> = {
  customer_accounts: {
    headers: ['customer_id', 'plan_type', 'contract_type', 'subscription_date', 'total_users', 'unsubscribed_date'],
    sample: ['C001', 'Enterprise', 'Annual', '2023-01-15', '50', ''],
    instructions: 'One row per customer. plan_type: Enterprise / Professional / Starter. contract_type: Annual / Monthly. Dates in YYYY-MM-DD. Leave unsubscribed_date blank if customer is still active.',
  },
  monthly_usage_metrics: {
    headers: ['customer_id', 'monthly_usage_hrs', 'feature_adoption_pct', 'last_login_date'],
    sample: ['C001', '120.5', '0.75', '2024-11-30'],
    instructions: 'One row per customer per month. monthly_usage_hrs: total hours used that month. feature_adoption_pct: 0.0–1.0 scale (e.g. 0.75 = 75%). last_login_date in YYYY-MM-DD.',
  },
  billing_data: {
    headers: ['customer_id', 'billing_date', 'payment_date', 'payment_value', 'record_type'],
    sample: ['C001', '2024-11-01', '2024-11-05', '2500.00', 'invoice'],
    instructions: 'One row per billing event. record_type: invoice / payment / credit. payment_date may be left blank if unpaid. payment_value as a decimal number.',
  },
  support_tickets: {
    headers: ['ticket_id', 'customer_id', 'created_date', 'category', 'priority', 'status'],
    sample: ['T001', 'C001', '2024-10-10', 'billing', 'high', 'resolved'],
    instructions: 'One row per support ticket. category: billing / technical / onboarding / other. priority: low / medium / high / critical. status: open / in_progress / resolved / closed.',
  },
  nps_surveys_with_feedback: {
    headers: ['survey_id', 'customer_id', 'nps_score', 'survey_date', 'plan_type', 'contract_type', 'segment', 'feedback_category', 'feedback_text'],
    sample: ['S001', 'C001', '8', '2024-11-15', 'Enterprise', 'Annual', 'large', 'product', 'Great product overall'],
    instructions: 'One row per survey response. nps_score: 0–10 integer. segment: small / medium / large / enterprise. feedback_category: product / support / pricing / other. feedback_text is free-form.',
  },
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const DatabaseIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);

const UsersIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const AlertIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

// Simple CSV parser (first N rows)
function parseCSVPreview(text: string, maxRows = 8): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1, maxRows + 1).map(line => {
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { cols.push(current.trim()); current = ''; continue; }
      current += char;
    }
    cols.push(current.trim());
    return cols;
  });
  return { headers, rows };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────
function DataManagementPageContent() {
  const supabase = createClient();
  const { workspace } = useDashboardContext();

  // Files state — keyed by file type
  const [files, setFiles] = useState<Partial<Record<FileKey, File>>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview state
  const [previewKey, setPreviewKey] = useState<FileKey | null>(null);
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [previewOptions, setPreviewOptions] = useState<{ source: 'local' | 'remote', datasetId?: string, datasetPath?: string } | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<FileKey, 'idle' | 'uploading' | 'done' | 'error'>>({
    customer_accounts: 'idle', monthly_usage_metrics: 'idle',
    billing_data: 'idle', support_tickets: 'idle', nps_surveys_with_feedback: 'idle',
  });

  // Datasets history & pagination
  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [page, setPage] = useState(1);
  const [totalDatasets, setTotalDatasets] = useState(0);
  const PAGE_SIZE = 5;

  const [expandedDataset, setExpandedDataset] = useState<string | null>(null);
  const [datasetToDelete, setDatasetToDelete] = useState<DatasetRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const allFilesSelected = Object.keys(REQUIRED_FILES).every(k => files[k as FileKey]);

  // ── Fetching logic ──
  const fetchDatasets = useCallback(async () => {
    if (!workspace?.id) return;
    
    // Total count for pagination
    const { count } = await supabase
      .from('datasets')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id);
    setTotalDatasets(count || 0);

    // Paginated results
    const { data, error } = await supabase
      .from('datasets')
      .select('id,status,storage_path,total_customers,churn_rate_pct,created_at,error_message')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching datasets:', error);
    } else {
      setDatasets(data as DatasetRow[]);
    }
    setLoadingDatasets(false);
  }, [supabase, workspace?.id, page]);

  // Initial load
  useEffect(() => {
    setLoadingDatasets(true);
    fetchDatasets();
  }, [fetchDatasets]);

  // Realtime subscription
  useEffect(() => {
    if (!workspace?.id) return;

    const channel = supabase
      .channel(`datasets-realtime-${workspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'datasets',
          filter: `workspace_id=eq.${workspace.id}`,
        },
        (payload) => {
          console.log('Dataset change received:', payload);
          fetchDatasets();
        }
      )
      .subscribe((status) => {
        console.log(`Supabase Realtime status for datasets: ${status}`);
        if (status === 'SUBSCRIBED') {
          fetchDatasets(); // Fetch once more on connect to be sure
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, workspace?.id, fetchDatasets]);

  // Fallback Polling logic: if there are ANY datasets with 'pending' or 'analyzing' status,
  // we poll every 10 seconds just in case the Realtime subscription fails or drops.
  useEffect(() => {
    const hasInProgress = datasets.some(ds => ds.status === 'pending' || ds.status === 'analyzing');
    if (!hasInProgress) return;

    const interval = setInterval(() => {
      console.log('Polling datasets status fallback...');
      fetchDatasets();
    }, 10000);

    return () => clearInterval(interval);
  }, [datasets, fetchDatasets]);

  // Auto-open guide when workspace has no datasets yet
  useEffect(() => {
    if (!loadingDatasets && totalDatasets === 0) {
      setShowGuide(true);
    }
  }, [loadingDatasets, totalDatasets]);

  // Close guide on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowGuide(false); };
    if (showGuide) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGuide]);

  // Handle file multi-drop / select
  const handleMultipleFiles = useCallback((selectedFiles: FileList | File[]) => {
    const newFiles = { ...files };
    let lastKey: FileKey | null = null;
    
    Array.from(selectedFiles).forEach(file => {
      if (!file.name.endsWith('.csv')) return;
      const entry = Object.entries(REQUIRED_FILES).find(([_, meta]) => 
        file.name.includes(meta.label.replace('.csv', '')) || meta.label === file.name
      );
      if (entry) {
        newFiles[entry[0] as FileKey] = file;
        lastKey = entry[0] as FileKey;
      }
    });
    
    setFiles(newFiles as any);
    
    if (lastKey) {
      // Auto-preview the last matched file
      const fileToPreview = newFiles[lastKey];
      if (fileToPreview) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setPreviewData(parseCSVPreview(text));
          setPreviewKey(lastKey);
          setPreviewOptions({ source: 'local' });
        };
        reader.readAsText(fileToPreview);
      }
    }
  }, [files]);

  const handleDropMulti = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleMultipleFiles(e.dataTransfer.files);
    }
  }, [handleMultipleFiles]);

  const openPreview = useCallback((key: FileKey) => {
    const file = files[key];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewData(parseCSVPreview(e.target?.result as string));
      setPreviewKey(key);
      setPreviewOptions({ source: 'local' });
    };
    reader.readAsText(file);
  }, [files]);

  const openRemotePreview = useCallback(async (datasetId: string, storagePath: string, key: FileKey) => {
    const { data } = await supabase.storage.from('files').download(`${storagePath}/${key}.csv`);
    if (data) {
      const text = await data.text();
      setPreviewData(parseCSVPreview(text));
      setPreviewKey(key);
      setPreviewOptions({ source: 'remote', datasetId, datasetPath: storagePath });
    }
  }, [supabase.storage]);

  // Upload all 5 files to Supabase Storage + create dataset row
  const handleUpload = useCallback(async () => {
    if (!allFilesSelected || !workspace?.id) return;
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    // Create dataset record first to get ID
    const { data: dataset, error: dsErr } = await supabase
      .from('datasets')
      .insert({ workspace_id: workspace.id, user_id: user.id, storage_path: '', status: 'pending' })
      .select('id')
      .single();
    if (dsErr || !dataset) { setUploading(false); return; }

    const datasetId = dataset.id;
    const basePath = `datasets/${workspace.id}/${datasetId}`;

    // Upload each file
    const keys = Object.keys(REQUIRED_FILES) as FileKey[];
    for (const key of keys) {
      setUploadProgress(prev => ({ ...prev, [key]: 'uploading' }));
      const file = files[key]!;
      const { error } = await supabase.storage
        .from('files')
        .upload(`${basePath}/${key}.csv`, file, { upsert: true });
      if (error) {
        setUploadProgress(prev => ({ ...prev, [key]: 'error' }));
        await supabase.from('datasets').update({ status: 'error', error_message: error.message }).eq('id', datasetId);
        setUploading(false);
        return;
      }
      setUploadProgress(prev => ({ ...prev, [key]: 'done' }));
    }

    // Update storage_path on dataset
    await supabase.from('datasets').update({ storage_path: basePath }).eq('id', datasetId);

    // KITA OTOMATIS JALANKAN ANALISIS (MURAH = TANPA XAI/LLAMA) UNTUK MENDAPATKAN SCORE DASAR
    const apiForm = new FormData();
    keys.forEach(key => apiForm.append(key, files[key]!));
    
    fetch(`/api/analyze?dataset_id=${datasetId}&generate_xai=false`, {
      method: 'POST',
      body: apiForm
    }).then(res => {
      if (!res.ok) console.error('Analysis failed', res.statusText);
    }).catch(err => console.error('Analyze trigger fetch error:', err));

    // Reload datasets list
    const { count } = await supabase.from('datasets').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id);
    setTotalDatasets(count || 0);

    const { data: updated } = await supabase
      .from('datasets')
      .select('id,status,storage_path,total_customers,churn_rate_pct,created_at,error_message')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (updated) setDatasets(updated as DatasetRow[]);

    // Reset
    setFiles({});
    setPreviewKey(null);
    setPreviewData(null);
    setUploadProgress({ customer_accounts: 'idle', monthly_usage_metrics: 'idle', billing_data: 'idle', support_tickets: 'idle', nps_surveys_with_feedback: 'idle' });
    setUploading(false);
  }, [allFilesSelected, files, workspace?.id]);

  const handleDeleteDataset = useCallback(async () => {
    if (!datasetToDelete || !workspace?.id) return;
    setIsDeleting(true);

    try {
      // 1. Delete files from storage
      if (datasetToDelete.storage_path) {
        const { data: filesInStorage } = await supabase.storage.from('files').list(datasetToDelete.storage_path);
        if (filesInStorage && filesInStorage.length > 0) {
          const filePaths = filesInStorage.map(f => `${datasetToDelete.storage_path}/${f.name}`);
          await supabase.storage.from('files').remove(filePaths);
        }
      }

      // 2. Delete the dataset row (cascades to predictions/segments if configured in DB)
      const { error } = await supabase
        .from('datasets')
        .delete()
        .eq('id', datasetToDelete.id);

      if (error) throw error;

      // 3. Refresh list
      fetchDatasets();
      setDatasetToDelete(null);
    } catch (err) {
      console.error('Error deleting dataset:', err);
      alert('Failed to delete dataset. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [datasetToDelete, supabase, workspace?.id, fetchDatasets]);

  const statusBadgeVariant = (status: DatasetRow['status']) => {
    if (status === 'done') return 'cleaned';
    if (status === 'error') return 'raw';
    if (status === 'analyzing') return 'med';
    if (status === 'pending') return 'pending';
    return 'default';
  };

  const statusLabel = (status: DatasetRow['status']) => {
    if (status === 'done') return 'Ready';
    if (status === 'error') return 'Error';
    if (status === 'analyzing') return 'Analyzing';
    return 'Pending';
  };

  const downloadTemplate = useCallback((key: FileKey) => {
    const { headers, sample } = CSV_TEMPLATES[key];
    const csv = [headers.join(','), sample.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const latestDataset = datasets.find(ds => ds.status === 'done');
  const hasError = datasets.some(ds => ds.status === 'error');

  return (
    <div className="fade-in pb-10">
        
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[var(--b)] pb-5">
          <div>
            <p className="text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.14em] mb-1 font-mono">
              Workspace · Data Sources
            </p>
            <h1 className="font-display text-2xl font-black text-[var(--t)] leading-tight tracking-tight">
              Data Management
            </h1>
            <p className="text-[12px] text-[var(--t3)] mt-1 max-w-xl">
              Ingest customer accounts, usage logs, billing information, and support tickets to compute churn risk scores.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowGuide(true)}
              className="inline-flex items-center gap-2 text-xs font-bold border border-[var(--b)] bg-[var(--surf)] text-[var(--t2)] hover:border-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] transition-all px-4 py-2 rounded-lg font-sans cursor-pointer whitespace-nowrap"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Guides
            </button>
          </div>
        </div>

        {/* ── StatCards Row (4 cards) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Datasets"
            value={totalDatasets.toString()}
            change="Uploaded"
            changeSuffix="workspaces"
            changeNeutral={true}
          />
          <StatCard
            label="Active Records"
            value={latestDataset?.total_customers ? latestDataset.total_customers.toLocaleString('en-US') : '—'}
            change="Latest"
            changeSuffix="dataset"
            changeNeutral={true}
          />
          <StatCard
            label="Risk Baseline"
            value={latestDataset?.churn_rate_pct != null ? `${latestDataset.churn_rate_pct}%` : '—'}
            change={latestDataset?.churn_rate_pct != null ? (latestDataset.churn_rate_pct >= 30 ? 'High' : 'Normal') : undefined}
            changeSuffix="churn rate"
            changePositive={latestDataset?.churn_rate_pct == null || latestDataset.churn_rate_pct < 30}
          />
          <StatCard
            label="Pipeline Status"
            value={hasError ? 'Issues' : datasets.length > 0 ? 'Healthy' : 'No Data'}
            change={hasError ? 'Requires' : 'Fully'}
            changeSuffix={hasError ? 'attention' : 'synced'}
            changePositive={!hasError}
          />
        </div>

        {/* ── Main Layout Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Left Column: Upload datasets */}
          <Card className="flex flex-col">
            <h3 className="text-sm font-bold text-[var(--t)] mb-0.5 font-display">Upload Datasets</h3>
            <p className="text-xs text-[var(--t3)] mb-4">Upload all 5 required CSV files to begin analysis</p>

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDropMulti}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center px-6 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer mb-4 min-h-[120px]
                ${dragOver ? 'border-[var(--t)] bg-[var(--bg2)]' : 'border-[var(--b2)] hover:border-[var(--t2)] bg-[var(--surf)]'}`}
            >
              <input
                type="file"
                accept=".csv"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={e => { if (e.target.files) handleMultipleFiles(e.target.files); }}
              />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mb-3 text-[var(--t3)]">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm font-semibold text-[var(--t)]">Click or drop files here</p>
              <p className="text-[11px] text-[var(--t3)] mt-1 font-mono">Upload the 5 required CSV files</p>
            </div>

            {/* List selected files */}
            {Object.keys(files).length > 0 && (
              <div className="flex flex-col gap-2 shrink-0">
                {Object.entries(files).map(([k, file]) => {
                  const key = k as FileKey;
                  const progress = uploadProgress[key];
                  return (
                    <div key={key} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--b)] bg-[var(--bg1)] transition-all hover:border-[var(--b2)]">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
                        ${progress === 'uploading' ? 'bg-[var(--t)] text-[var(--inv-t)]' : progress === 'done' ? 'bg-[var(--s)] text-[var(--inv-t)]' : 'bg-[var(--bg2)] text-[var(--t2)]'}`}>
                        {progress === 'uploading' ? (
                          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        ) : progress === 'done' ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--t)] truncate">{file.name}</p>
                        <p className="text-[11px] text-[var(--t3)] truncate font-mono">{formatFileSize(file.size)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={e => { e.stopPropagation(); openPreview(key); }} className="text-[11px] font-bold text-[var(--p)] hover:underline px-1.5 py-0.5 font-sans">Preview</button>
                        <button onClick={e => { e.stopPropagation(); setFiles(prev => { const n = { ...prev }; delete n[key]; return n; }); }} className="text-[var(--t3)] hover:text-[var(--d)] transition-colors">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload button */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--b)] shrink-0">
              <p className="text-xs text-[var(--t3)] font-mono">
                {Object.keys(files).length} of {Object.keys(REQUIRED_FILES).length} files selected
              </p>
              <button
                onClick={handleUpload}
                disabled={!allFilesSelected || uploading}
                className="inline-flex items-center justify-center gap-2 font-medium rounded-lg text-xs font-bold bg-[var(--t)] text-[var(--inv-t)] px-4 py-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans active:scale-[0.98]"
              >
                {uploading ? 'Uploading...' : 'Upload All Files'}
              </button>
            </div>
          </Card>

          {/* Right Column: Dataset history — analytics-style table */}
          <Card padding="none">
            {/* Card Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--b)]">
              <div>
                <div className="text-sm font-bold text-[var(--t)]">Uploaded Datasets</div>
                <div className="text-[11px] text-[var(--t3)] font-mono mt-0.5">
                  {loadingDatasets ? 'Loading...' : `${totalDatasets} dataset${totalDatasets !== 1 ? 's' : ''} found`}
                </div>
              </div>
              {loadingDatasets && (
                <div className="ml-auto">
                  <svg className="animate-spin text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto" style={{ minHeight: `${PAGE_SIZE * 57 + 44}px` }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--b)]">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Dataset ID</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Uploaded</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Customers</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">High Risk %</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.05em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--b)]/50">
                  {loadingDatasets ? (
                    Array.from({ length: PAGE_SIZE }).map((_, i) => (
                      <tr key={i} style={{ height: 57 }}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3 bg-[var(--bg3)] rounded animate-pulse" style={{ width: `${60 + ((i * 6 + j) % 4) * 10}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : datasets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-[var(--t3)]">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="text-xs text-[var(--t3)]">No datasets uploaded yet</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    datasets.map(ds => (
                      <Fragment key={ds.id}>
                        <tr className="cursor-pointer transition-colors hover:bg-[var(--bg1)]">
                          <td className="px-4 py-3">
                            <span className="font-mono text-[12px] text-[var(--t)]">{ds.id.slice(0, 8)}…</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-[var(--t)] whitespace-nowrap">
                            {formatDate(ds.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              label={statusLabel(ds.status)}
                              variant={statusBadgeVariant(ds.status) as any}
                              loading={ds.status === 'pending' || ds.status === 'analyzing'}
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-[var(--t)]">
                            {ds.total_customers ? ds.total_customers.toLocaleString('en-US') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {ds.churn_rate_pct != null ? (
                              <span className={`font-mono text-xs font-bold ${ds.churn_rate_pct >= 30 ? 'text-[var(--d)]' : 'text-[var(--s)]'}`}>
                                {ds.churn_rate_pct}%
                              </span>
                            ) : <span className="font-mono text-xs text-[var(--t3)]">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {ds.status === 'done' && (
                                <a
                                  href={`/dashboard/analytics?dataset_id=${ds.id}`}
                                  className="text-xs font-semibold text-[var(--p)] hover:underline"
                                >
                                  View →
                                </a>
                              )}
                              <button
                                onClick={() => setExpandedDataset(p => p === ds.id ? null : ds.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg2)] transition-all border border-transparent hover:border-[var(--b)]"
                                title="Show files"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform duration-200 ${expandedDataset === ds.id ? 'rotate-180' : ''}`}>
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDatasetToDelete(ds); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--t2)] hover:text-[var(--d)] hover:bg-[var(--d)]/10 transition-all border border-transparent hover:border-[var(--d)]/20"
                                title="Delete dataset"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                            {ds.status === 'error' && (
                              <span className="block mt-1 text-[11px] text-[var(--d)] max-w-[120px] line-clamp-2" title={ds.error_message || ''}>{ds.error_message}</span>
                            )}
                          </td>
                        </tr>
                        {expandedDataset === ds.id && (
                          <tr className="bg-[var(--bg1)]">
                            <td colSpan={6} className="px-5 py-3 border-t border-[var(--b)]">
                              <p className="text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.1em] mb-2 font-mono">Dataset Files</p>
                              <div className="flex flex-wrap gap-1.5">
                                {(Object.keys(REQUIRED_FILES) as FileKey[]).map(k => (
                                  <button
                                    key={k}
                                    onClick={() => openRemotePreview(ds.id, ds.storage_path, k)}
                                    className="text-[11px] font-semibold text-[var(--t2)] bg-[var(--surf)] border border-[var(--b)] px-2.5 py-1 rounded-lg hover:border-[var(--t3)] hover:text-[var(--t)] transition-colors cursor-pointer"
                                  >
                                    {REQUIRED_FILES[k].label}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Inline Pagination Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--b)] text-[11px] text-[var(--t3)] font-mono">
              <span>
                {loadingDatasets
                  ? '...'
                  : totalDatasets === 0
                  ? 'No results'
                  : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(totalDatasets, page * PAGE_SIZE)} of ${totalDatasets}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1 || loadingDatasets}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                {(() => {
                  const totalPages = Math.ceil(totalDatasets / PAGE_SIZE);
                  if (totalPages <= 1) return (
                    <button className="h-7 min-w-[28px] px-1.5 rounded-lg border text-[11px] bg-[var(--t)] text-[var(--inv-t)] border-[var(--t)]">1</button>
                  );
                  const pages: (number | string)[] = totalPages <= 5
                    ? Array.from({ length: totalPages }, (_, i) => i + 1)
                    : page <= 3
                    ? [1, 2, 3, 4, '...', totalPages]
                    : page >= totalPages - 2
                    ? [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
                    : [1, '...', page - 1, page, page + 1, '...', totalPages];
                  return pages.map((pg, idx) =>
                    pg === '...' ? (
                      <span key={idx} className="px-1.5 self-center">…</span>
                    ) : (
                      <button
                        key={idx}
                        onClick={() => setPage(pg as number)}
                        className={`h-7 min-w-[28px] px-1.5 rounded-lg border text-[11px] transition-all ${
                          page === pg
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
                  disabled={page >= Math.ceil(totalDatasets / PAGE_SIZE) || loadingDatasets}
                  onClick={() => setPage(p => Math.min(Math.ceil(totalDatasets / PAGE_SIZE), p + 1))}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--b)] text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* ── CSV Format Guide Modal ── */}
        {showGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowGuide(false); }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--b)] bg-[var(--bg)] shadow-2xl overflow-hidden">

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--b)] shrink-0">
                <div>
                  <h2 className="text-sm font-bold text-[var(--t)] font-display">CSV Format Guide</h2>
                  <p className="text-[11px] text-[var(--t3)] mt-0.5 font-mono">
                    Download each template, fill in your data, then upload all 5 files to begin analysis.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowGuide(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] border border-transparent hover:border-[var(--b)] transition-all cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scrollable file list */}
              <div className="overflow-y-auto divide-y divide-[var(--b)]">
                {(Object.keys(REQUIRED_FILES) as FileKey[]).map((key, idx) => {
                  const meta = REQUIRED_FILES[key];
                  const tmpl = CSV_TEMPLATES[key];
                  return (
                    <div key={key} className="flex flex-col md:flex-row md:items-start gap-3 px-6 py-4 hover:bg-[var(--bg1)]/50 transition-colors">
                      {/* Index + file name */}
                      <div className="flex items-center gap-3 md:w-52 shrink-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono shrink-0 bg-[var(--bg2)] text-[var(--t3)]">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-[var(--t)] font-mono truncate">{meta.label}</p>
                          <p className="text-[11px] text-[var(--t3)] truncate">{meta.desc}</p>
                        </div>
                      </div>

                      {/* Columns + instructions */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.08em] mb-1.5">Columns</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {tmpl.headers.map(col => (
                            <span key={col} className="inline-block font-mono text-[10px] bg-[var(--bg2)] border border-[var(--b)] text-[var(--t2)] px-1.5 py-0.5 rounded-md">
                              {col}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-[var(--t3)] leading-relaxed">{tmpl.instructions}</p>
                      </div>

                      {/* Download template */}
                      <div className="shrink-0 md:pt-5">
                        <button
                          onClick={() => downloadTemplate(key)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--t2)] border border-[var(--b)] bg-[var(--surf)] hover:border-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] transition-all px-3 py-1.5 rounded-lg cursor-pointer font-sans whitespace-nowrap"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Template
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal footer */}
              <div className="px-6 py-3 border-t border-[var(--b)] bg-[var(--bg1)]/40 shrink-0 flex items-center justify-between">
                <p className="text-[11px] text-[var(--t3)] font-mono">All 5 files must be uploaded together to start analysis</p>
                <button
                  onClick={() => setShowGuide(false)}
                  className="inline-flex items-center gap-2 text-xs font-bold bg-[var(--t)] text-[var(--inv-t)] px-4 py-2 rounded-lg hover:opacity-90 transition-all cursor-pointer font-sans"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Bottom row: CSV Preview ── */}
        {previewData && previewKey && (
          <Card padding="none" className="mt-6">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--b)] bg-[var(--bg1)]/10">
              <div>
                <h3 className="text-sm font-bold text-[var(--t)] font-display">Data Preview</h3>
                <p className="text-xs text-[var(--t3)]">
                  {REQUIRED_FILES[previewKey].label} — first {previewData.rows.length} rows
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Tab switcher for files */}
                <div className="flex items-center gap-1">
                  {(Object.keys(REQUIRED_FILES) as FileKey[]).map(k => {
                    const showTab = previewOptions?.source === 'remote' || files[k];
                    if (!showTab) return null;
                    return (
                      <button
                        key={k}
                        onClick={() => previewOptions?.source === 'remote' ? openRemotePreview(previewOptions.datasetId!, previewOptions.datasetPath!, k) : openPreview(k)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all font-sans cursor-pointer
                          ${previewKey === k 
                            ? 'border-[var(--t)] bg-[var(--t)] text-[var(--inv-t)]' 
                            : 'border-[var(--b)] text-[var(--t2)] hover:border-[var(--b3)] hover:bg-[var(--bg2)]'}`}
                      >
                        {k.replace(/_/g, ' ').replace('nps surveys with feedback', 'nps').replace('monthly usage metrics', 'usage').replace('customer accounts', 'accounts').replace('billing data', 'billing').replace('support tickets', 'tickets')}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => { setPreviewKey(null); setPreviewData(null); }}
                  className="text-[var(--t3)] hover:text-[var(--t)] transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--b)] bg-[var(--bg1)]/40">
                    {previewData.headers.map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider font-mono whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--b)]">
                  {previewData.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-[var(--bg1)]/50 transition-colors">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-2.5 text-xs text-[var(--t2)] whitespace-nowrap max-w-xs truncate font-mono">
                          {cell || <span className="text-[var(--t4)]">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 border-t border-[var(--b)] bg-[var(--bg1)]/20">
              <p className="text-xs text-[var(--t3)] font-mono">
                Showing first {previewData.rows.length} rows · {previewData.headers.length} columns
              </p>
            </div>
          </Card>
        )}

        {/* Empty preview state */}
        {!previewData && (
          <Card className="mt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mb-2 text-[var(--t3)]">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              <p className="text-xs font-semibold text-[var(--t3)] font-sans">Select a file above then click Preview to inspect data</p>
            </div>
          </Card>
        )}

      {/* Deletion Confirmation */}
      <ActionConfirmation
        isOpen={!!datasetToDelete}
        onClose={() => setDatasetToDelete(null)}
        title="Delete Dataset"
        description={`Are you sure you want to delete dataset ${datasetToDelete?.id.slice(0, 8)}? This action cannot be undone and will remove all associated analytics.`}
        actionLabel="Delete"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteDataset}
      />
    </div>
  );
}

export default function DataManagementPage() {
  return (
    <PermissionGate permission="manage_data">
      <DataManagementPageContent />
    </PermissionGate>
  );
}

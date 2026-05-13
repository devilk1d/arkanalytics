'use client';

import { useState, useRef, useCallback, useEffect, Fragment } from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Pagination from '../../ui/Pagination';
import { createClient } from '@/lib/supabase/client';
import { useDashboardContext } from '../../context/DashboardContext';
import PermissionGate from '../../ui/PermissionGate';

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

interface CsvFile {
  key: keyof typeof REQUIRED_FILES;
  file: File | null;
}

// 5 file yang wajib diupload — nama key harus persis sama dengan Railway parameter
const REQUIRED_FILES = {
  customer_accounts: { label: 'customer_accounts.csv', desc: 'Customer accounts & plan data' },
  monthly_usage_metrics: { label: 'monthly_usage_metrics.csv', desc: 'Usage hours & feature adoption' },
  billing_data: { label: 'billing_data.csv', desc: 'Payment & billing records' },
  support_tickets: { label: 'support_tickets.csv', desc: 'Support ticket history' },
  nps_surveys_with_feedback: { label: 'nps_surveys_with_feedback.csv', desc: 'NPS scores & feedback text' },
} as const;

type FileKey = keyof typeof REQUIRED_FILES;

// Preview columns per file type
const PREVIEW_COLS: Record<FileKey, string[]> = {
  customer_accounts: ['customer_id', 'plan_type', 'contract_type', 'subscription_date', 'total_users', 'unsubscribed_date'],
  monthly_usage_metrics: ['customer_id', 'monthly_usage_hrs', 'feature_adoption_pct', 'last_login_date'],
  billing_data: ['customer_id', 'record_type', 'billing_date', 'payment_value'],
  support_tickets: ['ticket_id', 'customer_id', 'category', 'priority', 'status'],
  nps_surveys_with_feedback: ['customer_id', 'nps_score', 'segment', 'feedback_category', 'feedback_text'],
};

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
      .channel('public:datasets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'datasets',
          filter: `workspace_id=eq.${workspace.id}`,
        },
        () => {
          fetchDatasets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, workspace?.id, fetchDatasets]);

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

  const statusBadgeVariant = (status: DatasetRow['status']) => {
    if (status === 'done') return 'cleaned';
    if (status === 'error') return 'raw';
    if (status === 'analyzing') return 'med';
    return 'default';
  };

  const statusLabel = (status: DatasetRow['status']) => {
    if (status === 'done') return 'Ready';
    if (status === 'error') return 'Error';
    if (status === 'analyzing') return 'Analyzing';
    return 'Pending';
  };

  const previewCols = previewKey ? PREVIEW_COLS[previewKey] : [];

  return (
    <DashboardLayout page="Data Management">

      {/* ── Top row: Upload zone + Dataset history ── */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Upload 5 files */}
        <Card>
          <h3 className="text-sm font-bold text-black mb-0.5">Upload Datasets</h3>
          <p className="text-xs text-gray-400 mb-4">Upload all 5 required CSV files to begin analysis</p>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDropMulti}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed rounded-xl transition-colors cursor-pointer mb-4
              ${dragOver ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-black bg-white'}`}
          >
            <input
              type="file"
              accept=".csv"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={e => { if (e.target.files) handleMultipleFiles(e.target.files); }}
            />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" className="mb-3">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm font-semibold text-black">Click or drop files here</p>
            <p className="text-[10px] text-gray-400 mt-1">Upload the 5 required CSV files</p>
          </div>

          {/* List selected files */}
          {Object.keys(files).length > 0 && (
            <div className="flex flex-col gap-2">
              {Object.entries(files).map(([k, file]) => {
                const key = k as FileKey;
                const progress = uploadProgress[key];
                return (
                  <div key={key} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-white">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 
                      ${progress === 'uploading' ? 'bg-black' : progress === 'done' ? 'bg-green-500' : 'bg-gray-100'}`}>
                      {progress === 'uploading' ? (
                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                      ) : progress === 'done' ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-black truncate">{file.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{formatFileSize(file.size)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={e => { e.stopPropagation(); openPreview(key); }} className="text-[10px] font-semibold text-blue-600 hover:underline px-1.5 py-0.5">Preview</button>
                      <button onClick={e => { e.stopPropagation(); setFiles(prev => { const n = { ...prev }; delete n[key]; return n; }); }} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload button */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {Object.keys(files).length} of {Object.keys(REQUIRED_FILES).length} files selected
            </p>
            <Button
              onClick={handleUpload}
              disabled={!allFilesSelected || uploading}
              size="sm"
            >
              {uploading ? 'Uploading...' : 'Upload All Files'}
            </Button>
          </div>
        </Card>

        {/* Dataset history */}
        <Card>
          <h3 className="text-sm font-bold text-black mb-0.5">Uploaded Datasets</h3>
          <p className="text-xs text-gray-400 mb-4">Your uploaded datasets and their status</p>

          {loadingDatasets ? (
            <div className="flex items-center justify-center py-10">
              <svg className="animate-spin text-gray-300" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            </div>
          ) : datasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" className="mb-2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-xs text-gray-400">No datasets uploaded yet</p>
            </div>
          ) : (
            <div className="flex-1 min-h-[140px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                  {['Dataset ID', 'Uploaded', 'Status', 'Customers', 'High Risk%', 'Actions'].map(h => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-500 pr-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {datasets.map(ds => (
                  <Fragment key={ds.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-2">
                        <span className="text-xs font-mono text-gray-500">{ds.id.slice(0, 8)}…</span>
                      </td>
                      <td className="py-2.5 pr-2 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(ds.created_at)}
                      </td>
                      <td className="py-2.5 pr-2">
                        <Badge label={statusLabel(ds.status)} variant={statusBadgeVariant(ds.status) as any} />
                      </td>
                      <td className="py-2.5 pr-2 text-xs text-gray-600">
                        {ds.total_customers ? ds.total_customers.toLocaleString('en-US') : '—'}
                      </td>
                      <td className="py-2.5 pr-2">
                        {ds.churn_rate_pct != null ? (
                          <span className={`text-xs font-bold ${ds.churn_rate_pct >= 30 ? 'text-red-500' : 'text-green-500'}`}>
                            {ds.churn_rate_pct}%
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          {ds.status === 'done' && (
                            <a
                              href={`/dashboard/analytics?dataset_id=${ds.id}`}
                              className="text-xs font-semibold text-blue-600 hover:underline px-2 py-1.5"
                            >
                              View →
                            </a>
                          )}
                          <button 
                            onClick={() => setExpandedDataset(p => p === ds.id ? null : ds.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform duration-200 ${expandedDataset === ds.id ? 'rotate-180' : ''}`}>
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        </div>
                        {ds.status === 'error' && (
                          <span className="block mt-1 text-[10px] text-red-500 max-w-[120px] line-clamp-2" title={ds.error_message || ''}>{ds.error_message}</span>
                        )}
                      </td>
                    </tr>
                    {expandedDataset === ds.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={6} className="px-4 py-3 border-t border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Dataset Files</p>
                          <div className="flex flex-wrap gap-2">
                            {(Object.keys(REQUIRED_FILES) as FileKey[]).map(k => (
                               <button 
                                 key={k}
                                 onClick={() => openRemotePreview(ds.id, ds.storage_path, k)}
                                 className="text-[10px] font-semibold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:border-black transition-colors"
                               >
                                 {REQUIRED_FILES[k].label}
                               </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6 mb-2 font-medium">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(totalDatasets / PAGE_SIZE)}
            totalItems={totalDatasets}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </Card>
      </div>

      {/* ── Bottom row: CSV Preview ── */}
      {previewData && previewKey && (
        <Card padding="none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-black">Data Preview</h3>
              <p className="text-xs text-gray-400">
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
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all
                        ${previewKey === k ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
                    >
                      {k.replace(/_/g, ' ').replace('nps surveys with feedback', 'nps').replace('monthly usage metrics', 'usage').replace('customer accounts', 'accounts').replace('billing data', 'billing').replace('support tickets', 'tickets')}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => { setPreviewKey(null); setPreviewData(null); }}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {previewData.headers.map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {previewData.rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-gray-50 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 text-xs text-gray-700 whitespace-nowrap max-w-xs truncate font-mono">
                        {cell || <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Showing first {previewData.rows.length} rows · {previewData.headers.length} columns
            </p>
          </div>
        </Card>
      )}

      {/* Empty preview state */}
      {!previewData && (
        <Card>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" className="mb-2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <p className="text-xs font-semibold text-gray-400">Select a file above then click Preview to inspect data</p>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}

export default function DataManagementPage() {
  return (
    <PermissionGate permission="manage_data">
      <DataManagementPageContent />
    </PermissionGate>
  );
}
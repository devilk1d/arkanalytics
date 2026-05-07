'use client';

import { useState, useEffect, useRef } from 'react';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { createClient } from '@/lib/supabase/client';
import type { CustomerPrediction } from '@/types/churn';

/* ─── Interfaces ─── */
interface ChurnXai {
  score_reason: string;
  risk_factors: string[];
  feedback_signal: string;
  action: {
    retain: string;
    offer: string;
    reason: string;
  };
  error?: string;
}

/* ─── Sub-components ─── */

function RedFlagBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
      Hidden Risk
    </span>
  );
}

function LoyaltyRiskBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
      Loyalty Risk
    </span>
  );
}

function XaiPanel({ raw }: { raw: string | null }) {
  if (!raw) return null;

  let xai: ChurnXai | null = null;
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    xai = JSON.parse(cleaned);
  } catch {
    // not JSON — show as plain fallback
  }

  if (!xai || xai.error) {
    return (
      <div className="border border-blue-100 bg-blue-50 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">AI Explanation</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{xai?.error ?? raw}</p>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">AI Explanation</span>
      </div>

      <div className="border-l-2 border-blue-300 pl-3 py-0.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Mengapa Score Ini?</p>
        <p className="text-xs text-gray-700 leading-relaxed">{xai.score_reason}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-2">Faktor Risiko Utama</p>
          <div className="flex flex-col gap-1.5">
            {xai.risk_factors?.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[10px] text-red-400 mt-0.5 shrink-0">▲</span>
                <p className="text-[11px] text-gray-700 leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Sinyal Feedback</p>
          <p className="text-[11px] text-gray-700 leading-relaxed">{xai.feedback_signal}</p>
        </div>
      </div>

      {xai.action && (
        <div className="border border-gray-200 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Rekomendasi Tindakan</p>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Retensi</p>
              <span className="inline-block text-[11px] font-semibold bg-black text-white px-2 py-0.5 rounded-lg">
                {xai.action.retain}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Penawaran</p>
              <span className="inline-block text-[11px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">
                {xai.action.offer}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed border-t border-gray-100 pt-2 mt-1">
            {xai.action.reason}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Cache & Constants ─── */
const datasetFileCache = new Map<string, Map<string, Blob>>();
const FILE_KEYS = [
  'customer_accounts',
  'monthly_usage_metrics',
  'billing_data',
  'support_tickets',
  'nps_surveys_with_feedback',
] as const;

/* ─── Main Component ─── */
interface AnalyzeCustomerModalProps {
  customerId: string;
  datasetId: string;
  open: boolean;
  onClose: () => void;
  onRetain: (c: CustomerPrediction) => void;
  onSendOffer: (c: CustomerPrediction) => void;
}

export function AnalyzeCustomerModal({
  customerId,
  datasetId,
  open,
  onClose,
  onRetain,
  onSendOffer,
}: AnalyzeCustomerModalProps) {
  const [data, setData] = useState<CustomerPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'db' | 'downloading' | 'predicting'>('db');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [xaiGenerating, setXaiGenerating] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  // FIX DOUBLE CALL: gunakan ref sebagai guard
  const activeLoadKey = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !customerId) return;

    const loadKey = `${datasetId}:${customerId}`;
    if (activeLoadKey.current === loadKey) return;
    activeLoadKey.current = loadKey;

    setLoading(true);
    setError('');
    setData(null);
    setLoadingStage('db');
    setDownloadProgress(0);

    let cancelled = false;

    async function load() {
      const { data: existing } = await supabase
        .from('predictions')
        .select('*')
        .eq('dataset_id', datasetId)
        .eq('customer_id', customerId)
        .maybeSingle();

      if (cancelled) return;

      if (existing && existing.xai_churn_explanation) {
        setData(existing as unknown as CustomerPrediction);
        setLoading(false);
        activeLoadKey.current = null;
        return;
      }

      if (existing && existing.churn_score != null) {
        setData(existing as unknown as CustomerPrediction);
        setLoading(false);
        setXaiGenerating(true);

        const form = await buildFormData(datasetId, setLoadingStage, setDownloadProgress, supabase);
        if (!form || cancelled) {
          setXaiGenerating(false);
          activeLoadKey.current = null;
          return;
        }

        setLoadingStage('predicting');
        const xaiRes = await window.fetch(
          `/api/predict-single?customer_id=${encodeURIComponent(customerId)}&dataset_id=${datasetId}`,
          { method: 'POST', body: form }
        );
        if (!cancelled && xaiRes.ok) {
          const updated = await xaiRes.json();
          setData(updated as CustomerPrediction);
        }
        setXaiGenerating(false);
        activeLoadKey.current = null;
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        activeLoadKey.current = null;
        return;
      }

      const form = await buildFormData(datasetId, setLoadingStage, setDownloadProgress, supabase);
      if (!form || cancelled) {
        setError('Failed to load dataset files');
        setLoading(false);
        activeLoadKey.current = null;
        return;
      }

      setLoadingStage('predicting');
      const res = await window.fetch(
        `/api/predict-single?customer_id=${encodeURIComponent(customerId)}&dataset_id=${datasetId}`,
        { method: 'POST', body: form }
      );

      if (cancelled) return;

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody?.error ?? 'Prediction failed');
        setLoading(false);
        activeLoadKey.current = null;
        return;
      }

      setData(await res.json());
      setLoading(false);
      activeLoadKey.current = null;
    }

    load();

    return () => {
      cancelled = true;
      if (activeLoadKey.current === loadKey) {
        activeLoadKey.current = null;
      }
    };
  }, [open, customerId, datasetId, supabase]);

  async function buildFormData(
    dsId: string,
    setStage: (s: 'db' | 'downloading' | 'predicting') => void,
    setProgress: (p: number) => void,
    supabaseClient: any
  ): Promise<FormData | null> {
    const form = new FormData();
    const cached = datasetFileCache.get(dsId);
    if (cached && cached.size === FILE_KEYS.length) {
      for (const key of FILE_KEYS) {
        form.append(key, new File([cached.get(key)!], `${key}.csv`, { type: 'text/csv' }));
      }
      return form;
    }

    setStage('downloading');
    const { data: ds } = await supabaseClient.from('datasets').select('storage_path')
      .eq('id', dsId).single();
    if (!ds) return null;

    const fileBlobs = new Map<string, Blob>();
    for (let i = 0; i < FILE_KEYS.length; i++) {
      const key = FILE_KEYS[i];
      const { data: blob, error: dlErr } = await supabaseClient.storage.from('files')
        .download(`${ds.storage_path}/${key}.csv`);
      if (dlErr || !blob) return null;
      fileBlobs.set(key, blob);
      form.append(key, new File([blob], `${key}.csv`, { type: 'text/csv' }));
      setProgress(Math.round(((i + 1) / FILE_KEYS.length) * 100));
    }
    datasetFileCache.set(dsId, fileBlobs);
    return form;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-black">Customer Analysis</h2>
            <p className="text-xs text-gray-400">Detailed analysis and insights for {customerId}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <svg className="animate-spin text-gray-300" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              {loadingStage === 'downloading' ? (
                <div className="flex flex-col items-center gap-2 w-48">
                  <p className="text-xs text-gray-500 font-medium">Downloading dataset files…</p>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-1.5 bg-black rounded-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-400">{downloadProgress}% — cached for next analyze</p>
                </div>
              ) : loadingStage === 'predicting' ? (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-gray-500 font-medium">Running prediction model…</p>
                  <p className="text-[11px] text-gray-400">Generating AI explanation</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Checking database…</p>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 border border-red-200 rounded-xl bg-red-50">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Score header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="text-xl font-bold text-black">{data.customer_id}</h3>
                    <RedFlagBadge show={data.nlp_red_flag === 1} />
                    <LoyaltyRiskBadge show={(data as any).loyalty_risk_flag === 1} />
                  </div>
                  <p className="text-xs text-gray-400">{data.plan_type} · {data.contract_type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Segment: <span className="font-semibold text-black">{data.segment_label}</span>
                  </p>
                </div>
                <div className="border border-gray-200 rounded-2xl p-4 text-right min-w-28">
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Churn Score</p>
                  <p className={`text-3xl font-black ${data.risk_level === 'Low' ? 'text-green-500' : data.risk_level === 'High' ? 'text-red-500' : 'text-yellow-500'}`}>
                    {data.churn_score}
                  </p>
                  <div className="mt-1">
                    <Badge label={data.risk_level} variant={data.risk_level === 'Low' ? 'low' : data.risk_level === 'High' ? 'high' : 'med'} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    ML: {(data.tabular_proba * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {data.nlp_red_flag === 1 && (
                <div className="flex items-start gap-2.5 bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
                  <span className="text-orange-500 mt-0.5 shrink-0">⚠</span>
                  <div>
                    <p className="text-[11px] font-semibold text-orange-700 mb-0.5">Hidden Risk Detected</p>
                    <p className="text-[11px] text-orange-600 leading-relaxed">
                      Churn score tergolong aman, namun feedback customer menunjukkan sentimen negatif kuat
                      dan kata-kata churn intent. Perlu perhatian ekstra.
                    </p>
                  </div>
                </div>
              )}

              {(data as any).loyalty_risk_flag === 1 && (
                <div className="flex items-start gap-2.5 bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4">
                  <span className="text-purple-500 mt-0.5 shrink-0">⚑</span>
                  <div>
                    <p className="text-[11px] font-semibold text-purple-700 mb-0.5">Loyalty Risk — Silent At-Risk</p>
                    <p className="text-[11px] text-purple-600 leading-relaxed">
                      Customer ini loyal (churn score rendah) namun termasuk segmen Unhappy Users dengan tenure panjang.
                      Kemungkinan tetap bertahan karena sudah terbiasa menggunakan layanan, bukan karena tingkat kepuasan yang tinggi. Intervensi proaktif direkomendasikan sebelum churn score meningkat.
                    </p>
                  </div>
                </div>
              )}

              {xaiGenerating ? (
                <div className="border border-blue-100 bg-blue-50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">Generating AI Explanation…</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="h-2.5 bg-blue-100 rounded-full animate-pulse w-full" />
                    <div className="h-2.5 bg-blue-100 rounded-full animate-pulse w-4/5" />
                    <div className="h-2.5 bg-blue-100 rounded-full animate-pulse w-3/5" />
                  </div>
                </div>
              ) : (
                <XaiPanel raw={data.xai_churn_explanation ?? null} />
              )}

              <div className="grid grid-cols-2 gap-3 mb-5">
                <Button onClick={() => onRetain(data)} className="justify-center">Retain Customer</Button>
                <Button onClick={() => onSendOffer(data)} variant="secondary" className="justify-center">Send Offer</Button>
              </div>

              <p className="text-sm font-bold text-black mb-3">Top Churn Factors (SHAP)</p>
              <div className="flex flex-col gap-2 mb-5">
                {data.shap_top5?.map((factor: any, i: number) => {
                  const isIncrease = factor.direction === 'increases_churn';
                  const maxVal = Math.max(...data.shap_top5.map((f: any) => f.importance));
                  const pct = (factor.importance / maxVal) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400 w-4 text-right">{i + 1}</span>
                      <span className="text-xs text-gray-700 w-40 shrink-0">{factor.feature_label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${isIncrease ? 'bg-red-400' : 'bg-green-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] font-semibold w-14 text-right shrink-0 ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
                        {isIncrease ? '▲' : '▼'} {factor.shap_value > 0 ? '+' : ''}{factor.shap_value.toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {data.sentiment && (
                <>
                  <p className="text-sm font-bold text-black mb-3">Sentiment Analysis</p>
                  {!(data as any).has_nps_data ? (
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">No Feedback Available</p>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Customer ini belum pernah mengisi NPS survey. Rekomendasi AI tetap tersedia berdasarkan data tabular (SHAP, RFM, billing).
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="border border-gray-200 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 mb-1">Overall Sentiment</p>
                          <p className={`text-sm font-bold capitalize ${data.sentiment.label === 'negative' ? 'text-red-500'
                            : data.sentiment.label === 'positive' ? 'text-green-500'
                              : 'text-yellow-500'
                            }`}>
                            {data.sentiment.label}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">VADER: {data.sentiment.vader_compound.toFixed(3)}</p>
                        </div>
                        <div className="border border-gray-200 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 mb-1">Urgency Level</p>
                          <p className={`text-sm font-bold capitalize ${data.sentiment.urgency_level === 'high' ? 'text-red-500'
                            : data.sentiment.urgency_level === 'medium' ? 'text-yellow-500'
                              : 'text-green-500'
                            }`}>
                            {data.sentiment.urgency_level}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Score: {data.sentiment.urgency_score}</p>
                        </div>
                        <div className="border border-gray-200 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 mb-1">Main Topic</p>
                          <p className="text-xs font-bold text-black leading-tight">{data.sentiment.dominant_topic}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{(data.sentiment.pct_negative_sent).toFixed(0)}% neg sentences</p>
                        </div>
                      </div>
                      {data.sentiment.feedback_preview && data.sentiment.feedback_preview.trim() !== '' && data.sentiment.feedback_preview !== '0' && (
                        <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                          <p className="text-[10px] text-gray-400 mb-1">Customer Feedback</p>
                          <p className="text-xs text-gray-600 leading-relaxed italic">
                            &ldquo;{data.sentiment.feedback_preview}&rdquo;
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

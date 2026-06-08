'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { createClient } from '@/lib/supabase/client';
import type { CustomerPrediction } from '@/types/churn';
import { normalizeSegmentLabel } from '../segmentation/SegmentationPage';

const ANIM_DURATION = 220;

interface ChurnXai {
  score_reason: string;
  risk_factors: string[];
  feedback_signal: string;
  action: { retain: string[]; offer: string[]; reason: string; };
  error?: string;
  detail?: string;
}

function RedFlagBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--o)] bg-[var(--o)]/10 border border-[var(--o)]/30 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--o)] animate-pulse shrink-0" />
      Hidden Risk
    </span>
  );
}

function LoyaltyRiskBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--p)] bg-[var(--p)]/10 border border-[var(--p)]/30 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--p)] shrink-0" />
      Loyalty Risk
    </span>
  );
}

function XaiPanel({ raw, onRetry, isRetrying = false }: { raw: string | null; onRetry?: () => void; isRetrying?: boolean }) {
  if (!raw) return null;

  let xai: ChurnXai | null = null;
  let parseError = false;

  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    xai = JSON.parse(cleaned);
  } catch {
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        xai = JSON.parse(raw.substring(start, end + 1));
      } else {
        parseError = true;
      }
    } catch {
      parseError = true;
    }
  }

  const isInvalid = !xai || (!xai.score_reason && !xai.error && !xai.detail);

  if (parseError || isInvalid || xai?.error || xai?.detail) {
    return (
      <div className="border border-[var(--r)]/30 bg-[var(--r)]/10 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-[var(--r)]" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[11px] font-semibold text-[var(--r)] uppercase tracking-wide">AI Error</span>
          </div>
          {onRetry && (
            <button onClick={onRetry} disabled={isRetrying}
              className="text-[10px] font-bold text-[var(--r)] hover:underline disabled:opacity-50">
              {isRetrying ? 'Retrying...' : 'Retry Generation'}
            </button>
          )}
        </div>
        <p className="text-[11px] text-[var(--t2)] leading-relaxed font-mono bg-[var(--bg2)]/50 p-2 rounded-lg border border-[var(--r)]/20 overflow-hidden text-ellipsis">
          {xai?.error || xai?.detail || (parseError ? `Parse Error: ${raw.slice(0, 100)}...` : raw)}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-blue-500" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide">AI Explanation</span>
      </div>

      <div className="border-l-2 border-blue-500/50 pl-3 py-0.5">
        <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-wide mb-1">Why This Score?</p>
        <p className="text-xs text-[var(--t)] leading-relaxed">{xai!.score_reason}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--r)]/10 border border-[var(--r)]/20 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-[var(--r)] uppercase tracking-wide mb-2">Main Risk Factors</p>
          <div className="flex flex-col gap-1.5">
            {xai!.risk_factors?.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[10px] text-[var(--r)] opacity-80 mt-0.5 shrink-0">▲</span>
                <p className="text-[11px] text-[var(--t)] leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[var(--bg2)] border border-[var(--b)] rounded-xl p-3">
          <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-wide mb-2">Feedback Signal</p>
          <p className="text-[11px] text-[var(--t)] leading-relaxed">{xai!.feedback_signal}</p>
        </div>
      </div>

      {xai!.action && (
        <div className="border border-[var(--b)] rounded-xl p-3">
          <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-wide mb-2">Recommendation Actions</p>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <p className="text-[10px] text-[var(--t3)] mb-1">Retention</p>
              <div className="text-[11px] font-bold bg-[var(--t)] text-[var(--bg1)] px-4 py-2.5 rounded-xl leading-tight">
                <ul className="space-y-1">
                  {(Array.isArray(xai!.action.retain) ? xai!.action.retain : [xai!.action.retain]).map((item, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[var(--t3)] mb-1">Offer</p>
              <div className="text-[11px] font-semibold bg-[var(--bg2)] text-[var(--t)] px-4 py-2.5 rounded-xl leading-tight border border-[var(--b)]">
                <ul className="space-y-1">
                  {(Array.isArray(xai!.action.offer) ? xai!.action.offer : [xai!.action.offer]).map((item, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[var(--t2)] leading-relaxed border-t border-[var(--b)] pt-2 mt-1">
            {xai!.action.reason}
          </p>
        </div>
      )}
    </div>
  );
}

interface AnalyzeCustomerModalProps {
  customerId: string;
  datasetId: string;
  open: boolean;
  onClose: () => void;
}

export function AnalyzeCustomerModal({ customerId, datasetId, open, onClose }: AnalyzeCustomerModalProps) {
  const [data,          setData]          = useState<CustomerPrediction | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [loadingStage,  setLoadingStage]  = useState<'db' | 'predicting'>('db');
  const [xaiGenerating, setXaiGenerating] = useState(false);
  const [error,         setError]         = useState('');

  const supabase = createClient();

  const abortRef      = useRef<AbortController | null>(null);
  const loadedKeyRef  = useRef<string>('');

  /* ─── Animation ─── */
  const [mounted,  setMounted]  = useState(false);
  const [visible,  setVisible]  = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      closeTimerRef.current = setTimeout(() => setMounted(false), ANIM_DURATION);
    }
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  /* ─── Load data ─── */
  useEffect(() => {
    if (!open || !customerId || !datasetId) return;

    const loadKey = `${datasetId}:${customerId}`;
    if (loadedKeyRef.current === loadKey && data !== null) return;

    if (abortRef.current) abortRef.current.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setLoading(true);
    setError('');
    setData(null);
    setLoadingStage('db');
    setXaiGenerating(false);

    async function load() {
      try {
        // 1. Check DB first — instant return if prediction exists
        const { data: existing } = await supabase
          .from('predictions').select('*')
          .eq('dataset_id', datasetId).eq('customer_id', customerId)
          .maybeSingle();

        if (abort.signal.aborted) return;

        if (existing) {
          const normalized = {
            ...existing,
            sentiment: existing.sentiment ?? {
              label: 'neutral', tone_score: 0, negative_feedback_pct: 0,
              dissatisfaction_score: 0, urgency_level: 'low', urgency_score: 0,
              dominant_topic: 'Unknown', topic_strength: 0, feedback_preview: '',
            },
          } as unknown as CustomerPrediction;

          setData(normalized);
          setLoading(false);
          loadedKeyRef.current = loadKey;

          // If XAI missing, generate it in the background (server fetches files)
          if (!existing.xai_churn_explanation) {
            setXaiGenerating(true);
            setLoadingStage('predicting');
            try {
              const xaiRes = await window.fetch(
                `/api/predict-single?customer_id=${encodeURIComponent(customerId)}&dataset_id=${datasetId}`,
                { method: 'POST', signal: abort.signal },
              );
              if (!abort.signal.aborted) {
                if (xaiRes.ok) {
                  const updated = await xaiRes.json();
                  setData(updated as CustomerPrediction);
                } else {
                  const errBody = await xaiRes.json().catch(() => ({})) as Record<string, unknown>;
                  const errMsg  = (errBody?.error ?? errBody?.detail ?? `AI generation failed (HTTP ${xaiRes.status})`) as string;
                  setData(prev => prev ? { ...prev, xai_churn_explanation: JSON.stringify({ error: errMsg }) } as CustomerPrediction : prev);
                }
              }
            } catch (fetchErr: unknown) {
              if ((fetchErr as Error)?.name !== 'AbortError') {
                setData(prev => prev ? { ...prev, xai_churn_explanation: JSON.stringify({ error: 'Connection error — could not reach the model service.' }) } as CustomerPrediction : prev);
              }
            } finally {
              setXaiGenerating(false);
            }
          }
          return;
        }

        // 2. No DB record — run full prediction (server fetches dataset files)
        setLoadingStage('predicting');
        const res = await window.fetch(
          `/api/predict-single?customer_id=${encodeURIComponent(customerId)}&dataset_id=${datasetId}`,
          { method: 'POST', signal: abort.signal },
        );

        if (abort.signal.aborted) return;

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({})) as Record<string, unknown>;
          setError((errBody?.error ?? 'Prediction failed') as string);
          setLoading(false);
          return;
        }

        const result = await res.json();
        setData(result as CustomerPrediction);
        setLoading(false);
        loadedKeyRef.current = loadKey;

      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
        setError('Unexpected error occurred');
        setLoading(false);
      }
    }

    load();
    return () => { abort.abort(); };
  }, [open, customerId, datasetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset loadedKeyRef when modal closes so next open always re-fetches
  useEffect(() => {
    if (!open) {
      loadedKeyRef.current = '';
      if (abortRef.current) abortRef.current.abort();
    }
  }, [open]);

  const handleManualXaiRetry = useCallback(async () => {
    if (!data || xaiGenerating) return;
    setXaiGenerating(true);
    setLoadingStage('predicting');
    try {
      const xaiRes = await window.fetch(
        `/api/predict-single?customer_id=${encodeURIComponent(customerId)}&dataset_id=${datasetId}&force=true`,
        { method: 'POST' },
      );
      if (xaiRes.ok) {
        setData(await xaiRes.json() as CustomerPrediction);
      } else {
        const errBody = await xaiRes.json().catch(() => ({})) as Record<string, unknown>;
        const errMsg  = (errBody?.error ?? errBody?.detail ?? `Retry failed (HTTP ${xaiRes.status})`) as string;
        setData(prev => prev ? { ...prev, xai_churn_explanation: JSON.stringify({ error: errMsg }) } as CustomerPrediction : prev);
      }
    } catch (err) {
      console.error('XAI Retry Error:', err);
      setData(prev => prev ? { ...prev, xai_churn_explanation: JSON.stringify({ error: 'Connection error — could not reach the model service.' }) } as CustomerPrediction : prev);
    } finally {
      setXaiGenerating(false);
    }
  }, [data, xaiGenerating, datasetId, customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const backdropCls = `transition-[opacity,backdrop-filter] duration-[${ANIM_DURATION}ms] ease-out ${visible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none'}`;
  const panelCls    = `transition-[opacity,transform] duration-[${ANIM_DURATION}ms] ease-out ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-[0.97]'}`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${backdropCls}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative bg-[var(--bg1)] rounded-2xl border border-[var(--b2)] w-full max-w-2xl max-h-[90vh] m-4 shadow-2xl flex flex-col ${panelCls}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--b)] shrink-0">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-[var(--t)]" style={{ fontFamily: 'var(--app-font-display)' }}>
              Customer Analysis
            </h2>
            <p className="text-[11px] text-[var(--t3)] mt-0.5">Detailed analysis and insights for {customerId}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg3)] text-[var(--t3)] hover:text-[var(--t)] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <svg className="animate-spin text-[var(--t3)]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              {loadingStage === 'predicting' ? (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-[var(--t2)] font-medium">Running prediction model…</p>
                  <p className="text-[11px] text-[var(--t3)]">Generating AI explanation</p>
                </div>
              ) : (
                <p className="text-xs text-[var(--t3)]">Checking database…</p>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 border border-[var(--r)]/30 rounded-xl bg-[var(--r)]/10">
              <p className="text-xs text-[var(--r)]">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Score header */}
              <div className="flex items-start justify-between mb-5 gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-xl font-bold text-[var(--t)] tracking-tight" style={{ fontFamily: 'var(--app-font-display)' }}>
                      {data.customer_id}
                    </h3>
                    <RedFlagBadge show={data.nlp_red_flag === 1} />
                    <LoyaltyRiskBadge show={data.loyalty_risk_flag === 1} />
                  </div>
                  <p className="text-xs text-[var(--t3)]">{data.plan_type} · {data.contract_type}</p>
                  <p className="text-xs text-[var(--t3)] mt-0.5">
                    Segment: <span className="font-semibold text-[var(--t)]">{normalizeSegmentLabel(data.segment_label)}</span>
                  </p>
                </div>
                <div className="border border-[var(--b2)] rounded-xl p-4 text-right shrink-0 bg-[var(--bg2)] min-w-[7rem]">
                  <p className="text-[9px] font-semibold text-[var(--t3)] uppercase tracking-widest mb-1.5">Churn Score</p>
                  <p className={`text-3xl font-black leading-none ${data.risk_level === 'Low' ? 'text-[var(--g)]' : data.risk_level === 'High' ? 'text-[var(--r)]' : 'text-[var(--o)]'}`}
                    style={{ fontFamily: 'var(--app-font-display)' }}>
                    {data.churn_score}
                  </p>
                  <div className="mt-2 flex justify-end">
                    <Badge label={data.risk_level} variant={data.risk_level === 'Low' ? 'low' : data.risk_level === 'High' ? 'high' : 'med'} />
                  </div>
                </div>
              </div>

              {/* Flags */}
              {data.nlp_red_flag === 1 && (
                <div className="flex items-start gap-2.5 bg-[var(--o)]/8 border border-[var(--o)]/25 rounded-xl p-3 mb-4">
                  <span className="text-[var(--o)] mt-0.5 shrink-0 text-sm">⚠</span>
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--o)] mb-0.5">Hidden Risk Detected</p>
                    <p className="text-[11px] text-[var(--o)] opacity-90 leading-relaxed">
                      Customer perlu perhatian ekstra.
                    </p>
                  </div>
                </div>
              )}
              {data.loyalty_risk_flag === 1 && (
                <div className="flex items-start gap-2.5 bg-[var(--p)]/8 border border-[var(--p)]/25 rounded-xl p-3 mb-4">
                  <span className="text-[var(--p)] mt-0.5 shrink-0 text-sm">⚑</span>
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--p)] mb-0.5">Loyalty Risk — Silent At-Risk</p>
                    <p className="text-[11px] text-[var(--p)] opacity-90 leading-relaxed">
                      Customer ini loyal (churn score rendah) namun termasuk segmen Critical Users dengan tenure panjang. Kemungkinan tetap bertahan karena sudah terbiasa menggunakan layanan, bukan karena kepuasan tinggi. Intervensi proaktif direkomendasikan.
                    </p>
                  </div>
                </div>
              )}

              {/* XAI Panel */}
              {xaiGenerating ? (
                <div className="border border-[var(--b2)] bg-[var(--bg2)] rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="animate-spin text-[var(--t3)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span className="text-[11px] font-semibold text-[var(--t2)] uppercase tracking-wide">Generating AI Explanation…</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="h-2 bg-[var(--bg3)] rounded-full animate-pulse w-full" />
                    <div className="h-2 bg-[var(--bg3)] rounded-full animate-pulse w-4/5" />
                    <div className="h-2 bg-[var(--bg3)] rounded-full animate-pulse w-3/5" />
                  </div>
                </div>
              ) : (
                <>
                  <XaiPanel raw={data.xai_churn_explanation ?? null} onRetry={handleManualXaiRetry} isRetrying={xaiGenerating} />
                  {data.xai_churn_explanation && (
                    <div className="flex justify-end mb-2 -mt-1">
                      <button
                        onClick={handleManualXaiRetry}
                        disabled={xaiGenerating}
                        className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--t3)] hover:text-[var(--t)] disabled:opacity-50 transition-colors px-2 py-1 rounded-lg hover:bg-[var(--bg3)]"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                          <path d="M21 3v5h-5" />
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                          <path d="M8 16H3v5" />
                        </svg>
                        Regenerate
                      </button>
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-[var(--b)] my-5" />

              {/* SHAP */}
              <p className="text-[11px] font-semibold text-[var(--t3)] uppercase tracking-widest mb-3">Top Risk Factors</p>
              <div className="flex flex-col gap-2 mb-5">
                {data.shap_top5?.map((factor: any, i: number) => {
                  const isIncrease = factor.direction === 'raises_risk' || factor.direction === 'increases_churn';
                  const impact = factor.impact_score ?? factor.shap_value ?? 0;
                  const maxVal = Math.max(...data.shap_top5.map((f: any) => f.importance));
                  const pct = maxVal > 0 ? (factor.importance / maxVal) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--t4)] w-4 text-right tabular-nums">{i + 1}</span>
                      <span className="text-xs text-[var(--t2)] w-40 shrink-0 truncate">{factor.feature_label}</span>
                      <div className="flex-1 h-1 bg-[var(--bg3)] rounded-full overflow-hidden">
                        <div className={`h-1 rounded-full transition-all duration-500 ${isIncrease ? 'bg-[var(--r)]' : 'bg-[var(--g)]'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] font-semibold w-14 text-right shrink-0 tabular-nums ${isIncrease ? 'text-[var(--r)]' : 'text-[var(--g)]'}`}>
                        {isIncrease ? '+' : ''}{(impact).toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Sentiment */}
              {data.sentiment && (
                <>
                  <div className="border-t border-[var(--b)] my-5" />
                  <p className="text-[11px] font-semibold text-[var(--t3)] uppercase tracking-widest mb-3">Sentiment Analysis</p>
                  {!data.has_nps_data ? (
                    <div className="border border-[var(--b)] rounded-xl p-4 bg-[var(--bg2)] mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-[var(--t3)]" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p className="text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wide">No Feedback Available</p>
                      </div>
                      <p className="text-xs text-[var(--t2)] leading-relaxed">
                        This Customer does not have NPS survey feedback.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          {
                            label: 'Overall Sentiment',
                            value: data.sentiment.label,
                            sub: `Tone: ${((data.sentiment as any).tone_score ?? (data.sentiment as any).vader_compound ?? 0).toFixed(3)}`,
                            color: data.sentiment.label === 'negative' || data.sentiment.label?.toLowerCase().includes('dissatisfied') ? 'text-[var(--r)]' : data.sentiment.label === 'positive' || data.sentiment.label?.toLowerCase().includes('satisfied') ? 'text-[var(--g)]' : 'text-[var(--o)]',
                          },
                          {
                            label: 'Urgency Level',
                            value: data.sentiment.urgency_level,
                            sub: `Score: ${data.sentiment.urgency_score}`,
                            color: data.sentiment.urgency_level === 'high' ? 'text-[var(--r)]' : data.sentiment.urgency_level === 'medium' ? 'text-[var(--o)]' : 'text-[var(--g)]',
                          },
                          {
                            label: 'Main Topic',
                            value: data.sentiment.dominant_topic,
                            sub: `${((data.sentiment as any).negative_feedback_pct ?? (data.sentiment as any).pct_negative_sent ?? 0).toFixed(0)}% negative feedback`,
                            color: 'text-[var(--t)]',
                          },
                        ].map((item) => (
                          <div key={item.label} className="border border-[var(--b)] rounded-xl p-3 bg-[var(--bg2)]">
                            <p className="text-[10px] text-[var(--t3)] mb-1.5">{item.label}</p>
                            <p className={`text-sm font-bold capitalize leading-tight ${item.color}`} style={{ fontFamily: 'var(--app-font-display)' }}>
                              {item.value}
                            </p>
                            <p className="text-[10px] text-[var(--t4)] mt-0.5 tabular-nums">{item.sub}</p>
                          </div>
                        ))}
                      </div>

                      {/* Feedback preview from feedback_texts array */}
                      {Array.isArray(data.sentiment.feedback_texts) &&
                        data.sentiment.feedback_texts.length > 0 && (
                          <div className="border border-[var(--b)] rounded-xl p-3 bg-[var(--bg2)]">
                            <p className="text-[10px] text-[var(--t3)] mb-1.5">Customer Feedback</p>
                            <div className="flex flex-col gap-2">
                              {data.sentiment.feedback_texts.slice(0, 3).map((text: string, i: number) => (
                                <p key={i} className="text-xs text-[var(--t2)] leading-relaxed italic">
                                  &ldquo;{text}&rdquo;
                                </p>
                              ))}
                            </div>
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

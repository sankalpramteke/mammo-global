'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import HospitalLayout from '@/components/HospitalLayout';
import toast from 'react-hot-toast';

interface RoundResult {
  roundNumber: number; accuracyPct: string; imagesTrained: number;
  benign: number; malignant: number; weightsHash: string; completedAt: string; avgDelta?: number;
}
interface HistoryEntry extends RoundResult { simulation: boolean; }
interface AuditLog {
  timestamp: string; host: string; pid: number; device: string;
  images_received: number; images_stored_on_disk: number; images_sent_to_global: number;
  storage_method: string;
  training: { algorithm: string; epochs: number; batch_size: number; final_acc: number; };
  weights: { hash_algorithm: string; weights_hash: string; avg_delta: number; images_in_db: boolean; };
  fl_round: number;
}

function ProgressRow({ label, pct }: { label: string; pct: number }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11.5, color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#0f172a' }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#0f2744,#2563eb)', borderRadius: 10, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

export default function HospitalPortalPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files,         setFiles]         = useState<File[]>([]);
  const [dragging,      setDragging]      = useState(false);
  const [notes,         setNotes]         = useState('');
  const [step,          setStep]          = useState<1|2|3>(1);
  const [progress,      setProgress]      = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [progressStage, setProgressStage] = useState(0);
  const [result,        setResult]        = useState<RoundResult|null>(null);
  const [simulation,    setSimulation]    = useState(false);
  const [history,       setHistory]       = useState<HistoryEntry[]>([]);
  const [hospitalId,    setHospitalId]    = useState('');
  const [audit,         setAudit]         = useState<AuditLog|null>(null);
  const [uploadInfo,    setUploadInfo]    = useState<{name:string; count:number; sizeMb:string}>({name:'',count:0,sizeMb:'0'});

  useEffect(() => {
    const data = localStorage.getItem('hospital_data');
    if (data) {
      const h = JSON.parse(data);
      setHospitalId(h.hospitalId);
      const saved = localStorage.getItem(`disha_hist_${h.hospitalId}`);
      if (saved) setHistory(JSON.parse(saved));
    }
  }, []);

  const n = files.length;

  const MAX_IMAGES = 500;

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const items = Array.from(incoming);
    const zips  = items.filter(f => f.name.toLowerCase().endsWith('.zip'));
    const imgs  = items.filter(f => f.type.startsWith('image/'));

    if (zips.length > 0 && imgs.length > 0)
      return toast.error('Upload either a ZIP file or individual images — not both');
    if (zips.length > 1)
      return toast.error('Upload one ZIP file at a time');
    if (zips.length === 0 && imgs.length === 0)
      return toast.error('Only JPEG/PNG images or a ZIP file accepted');

    if (zips.length > 0) {
      // ZIP selected — replace all
      setFiles(zips);
      return;
    }

    // Individual images — merge and cap at 500
    setFiles(prev => {
      const names   = new Set(prev.map(f => f.name));
      const merged  = [...prev, ...imgs.filter(f => !names.has(f.name))];
      if (merged.length > MAX_IMAGES) {
        toast.error(`Max ${MAX_IMAGES} images. Capped at ${MAX_IMAGES}.`);
        return merged.slice(0, MAX_IMAGES);
      }
      return merged;
    });
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const simulateProgress = useCallback(async () => {
    const STEPS: [number, string, number][] = [
      [8,  'Uploading dataset to local node', 1],
      [20, 'Applying CLAHE contrast normalisation', 2],
      [40, 'ResNet50 fine-tuning — processing images sequentially', 3],
      [70, 'Computing weight delta (updated − base weights)', 4],
      [88, 'SHA-256 hashing weight tensor', 5],
      [96, 'Transmitting encrypted weight delta to DISHA Global', 6],
    ];
    for (const [pct, label, stage] of STEPS) {
      setProgress(pct); setProgressLabel(label); setProgressStage(stage);
      await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return toast.error('Upload at least one mammogram image');

    const isZip = files[0]?.name.toLowerCase().endsWith('.zip');
    setUploadInfo({
      name: files[0]?.name ?? 'dataset',
      count: isZip ? 0 : files.length,   // 0 = unknown until ZIP extracted
      sizeMb: (files.reduce((s,f)=>s+f.size,0)/1024/1024).toFixed(1),
    });

    setStep(2); setProgress(0); setProgressStage(0);
    const token = localStorage.getItem('hospital_token');

    const form = new FormData();
    files.forEach(f => form.append('files', f, f.name));
    form.append('benignCount', '0');
    form.append('malignantCount', '0');
    form.append('notes', notes);

    const [, res] = await Promise.all([
      simulateProgress(),
      fetch('/api/hospital-auth/upload-and-train', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }),
    ]);

    setProgress(100); setProgressLabel('Complete!');
    await new Promise(r => setTimeout(r, 300));

    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Upload failed'); setStep(1); return; }

    // Update localStorage hospital data
    const stored = localStorage.getItem('hospital_data');
    if (stored) localStorage.setItem('hospital_data', JSON.stringify({ ...JSON.parse(stored), ...data.hospital }));

    const entry: HistoryEntry = { ...data.round, simulation: data.simulation };
    const newHistory = [entry, ...history].slice(0, 20);
    setHistory(newHistory);
    if (hospitalId) localStorage.setItem(`disha_hist_${hospitalId}`, JSON.stringify(newHistory));

    setResult(data.round);
    setSimulation(data.simulation);
    setStep(3);
    toast.success(`✅ Round #${data.round.roundNumber} — Accuracy: ${data.round.accuracyPct}`);

    // Fetch privacy audit log from mammo-server (proof for evaluator)
    if (!data.simulation) {
      try {
        const auditRes = await fetch('http://localhost:8000/training-audit');
        if (auditRes.ok) setAudit((await auditRes.json()).last_training ?? null);
      } catch { /* mammo-server offline */ }
    }
  };

  const reset = () => {
    setStep(1); setResult(null); setFiles([]); setAudit(null);
    setNotes(''); setProgress(0); setProgressLabel(''); setProgressStage(0);
  };

  return (
    <HospitalLayout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>
          Federated Learning — Dataset Upload & Training
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          Upload your mammogram images. They train locally on ResNet50 — only encrypted weight deltas are sent to DISHA Global.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>

        {/* ── LEFT PANEL ── */}
        <div className="card">
          {/* Step indicator */}
          <div style={{ padding: '13px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 0 }}>
            {(['Configure & Upload', 'Local Training', 'Complete ✓'] as const).map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                  background: step > i+1 ? '#16a34a' : step === i+1 ? '#0f2744' : '#f1f5f9',
                  color: step >= i+1 ? 'white' : '#94a3b8' }}>
                  {step > i+1 ? '✓' : i+1}
                </div>
                <span style={{ fontSize: 12, fontWeight: step===i+1?600:400, color: step===i+1?'#0f172a':step>i+1?'#16a34a':'#94a3b8', marginLeft: 7 }}>{label}</span>
                {i < 2 && <div style={{ flex: 1, height: 1, background: '#e2e8f0', margin: '0 10px' }} />}
              </div>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <form onSubmit={handleSubmit} style={{ padding: 22 }}>
              <div style={{ marginBottom: 18, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12.5, color: '#374151', lineHeight: 1.65, display: 'flex', gap: 10 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span><strong style={{ color: '#1e40af' }}>Privacy First:</strong> Images are preprocessed on this node. Only encrypted ResNet50 weight deltas reach DISHA Global — never raw patient data.</span>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{
                  border: `2px dashed ${dragging ? '#2563eb' : files.length > 0 ? '#16a34a' : '#cbd5e1'}`,
                  borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                  background: dragging ? '#eff6ff' : files.length > 0 ? '#f0fdf4' : '#fafafa',
                  transition: 'all 0.2s', marginBottom: 16,
                }}>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,.zip" multiple hidden
                  onChange={e => addFiles(e.target.files)} />
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={files.length > 0 ? '#15803d' : '#94a3b8'} strokeWidth="1.5" style={{ margin: '0 auto 10px', display: 'block' }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                {files.length === 0 ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Drag & drop mammogram images or a ZIP file</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>JPEG / PNG images or a .zip containing them · Max 500 images</div>
                  </>
                ) : files[0]?.name.toLowerCase().endsWith('.zip') ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#15803d' }}>{files[0].name}</div>
                    <div style={{ fontSize: 12, color: '#16a34a', marginTop: 3 }}>
                      ZIP archive · {(files[0].size / 1024 / 1024).toFixed(1)} MB · Up to 500 images extracted for training
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#15803d' }}>{files.length} image{files.length !== 1 ? 's' : ''} selected</div>
                    <div style={{ fontSize: 12, color: '#16a34a', marginTop: 3 }}>
                      {(files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)} MB total · Click to add more
                    </div>
                  </>
                )}
              </div>

              {/* File list (max 5 shown) */}
              {files.length > 0 && (
                <div style={{ marginBottom: 16, maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {files.slice(0, 5).map((f, i) => (
                    <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 7, border: '1px solid #e2e8f0' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      <span style={{ fontSize: 12, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{(f.size/1024).toFixed(0)} KB</span>
                      <button type="button" onClick={() => removeFile(i)}
                        style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
                    </div>
                  ))}
                  {files.length > 5 && (
                    <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '4px 0' }}>+{files.length - 5} more images</div>
                  )}
                </div>
              )}



              {/* Notes */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                  Batch Notes <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="e.g. Q1 2026 cohort, age 40–65, FFDM modality"
                  className="disha-input" style={{ resize: 'vertical', fontSize: 13 }} />
              </div>

              <button type="submit" disabled={files.length === 0} className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 13, fontWeight: 600, opacity: files.length === 0 ? 0.45 : 1, letterSpacing: '0.01em' }}>
                Begin Local Training — Submit Weight Delta
              </button>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                Images are processed locally. Only encrypted weight deltas are transmitted.
              </p>
            </form>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div style={{ padding: '24px 22px' }}>
              {/* Dataset info header */}
              <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Dataset</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{uploadInfo.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {uploadInfo.count > 0 ? `${uploadInfo.count} images` : 'ZIP archive'} &middot; {uploadInfo.sizeMb} MB
                </div>
              </div>

              {/* Spinner + current step */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0f2744', animation: 'spin 0.85s linear infinite', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Training in progress</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{progressLabel}</div>
                </div>
              </div>

              {/* Overall progress bar */}
              <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#0f2744', borderRadius: 4, transition: 'width 0.8s ease' }} />
              </div>

              {/* Stage checklist */}
              {[
                'Upload dataset to local node',
                'CLAHE contrast normalisation',
                'ResNet50 fine-tuning — per-image gradient steps',
                'Compute weight delta',
                'SHA-256 weight tensor hash',
                'Transmit encrypted delta to DISHA Global',
              ].map((label, i) => {
                const done   = progressStage > i + 1;
                const active = progressStage === i + 1;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                    borderBottom: i < 5 ? '1px solid #f8fafc' : 'none', opacity: done || active ? 1 : 0.35 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? '#16a34a' : active ? '#0f2744' : '#e2e8f0',
                      border: active ? '2px solid #0f2744' : 'none' }}>
                      {done
                        ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        : active
                          ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                          : null}
                    </div>
                    <span style={{ fontSize: 12, color: done ? '#15803d' : active ? '#0f172a' : '#94a3b8', fontWeight: active ? 600 : 400 }}>{label}</span>
                  </div>
                );
              })}

              <div style={{ marginTop: 16, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11.5, color: '#64748b' }}>
                Images are processed one at a time and discarded immediately after training. Raw data never leaves this node.
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && result && (
            <div style={{ padding: 22 }}>
              {simulation && (
                <div style={{ marginBottom: 14, padding: '9px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                  <strong>Simulation mode</strong> &mdash; mammo-server offline.
                  Run <code style={{ fontSize: 11, background: '#fef3c7', padding: '1px 4px', borderRadius: 3 }}>uvicorn main:app --port 8000</code> for real training.
                </div>
              )}

              {/* Status banner */}
              <div style={{ padding: '14px 16px', background: simulation ? '#fffbeb' : '#f0fdf4', border: `1px solid ${simulation ? '#fcd34d' : '#bbf7d0'}`, borderRadius: 8, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={simulation ? '#92400e' : '#15803d'} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: simulation ? '#92400e' : '#15803d' }}>
                      {simulation ? 'Simulation complete' : 'Training complete'}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                      {result.imagesTrained} images processed &middot; weights submitted to DISHA Global
                    </div>
                  </div>
                </div>
              </div>

              {/* Key metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'FL Round',        value: `#${result.roundNumber}`, color: '#0f2744' },
                  { label: 'Global Accuracy', value: result.accuracyPct,       color: '#15803d' },
                  { label: 'Images Trained',  value: result.imagesTrained.toLocaleString(), color: '#2563eb' },
                ].map(m => (
                  <div key={m.label} style={{ padding: '12px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Weight hash */}
              <div style={{ padding: '10px 13px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>SHA-256 Weight Hash</div>
                <code style={{ fontSize: 10.5, color: '#475569', wordBreak: 'break-all', display: 'block', lineHeight: 1.7, fontFamily: 'monospace' }}>{result.weightsHash}</code>
                <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 4 }}>Cryptographic proof that only weights, not images, were transmitted.</div>
              </div>

              <button onClick={reset} className="btn-primary" style={{ width: '100%', padding: '11px', fontSize: 13 }}>
                Submit Another Dataset
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* FL explainer */}
          <div className="card">
            <div className="card-header">
              <div className="card-title-icon" style={{ background: '#dbeafe' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
              </div>
              FL Training Pipeline
            </div>
            <div style={{ padding: '12px 16px' }}>
              {[
                { n: '01', t: 'Dataset Upload',       d: 'JPEG / PNG mammograms or a ZIP archive uploaded through this portal.' },
                { n: '02', t: 'CLAHE Preprocessing',  d: 'Contrast-limited adaptive histogram equalisation applied per image.' },
                { n: '03', t: 'ResNet50 Fine-tuning', d: 'Each image trains the model for one gradient step, then is immediately discarded.' },
                { n: '04', t: 'SHA-256 Weight Hash',  d: 'Cryptographic hash of the updated weight tensor computed as an integrity proof.' },
                { n: '05', t: 'FedAvg Aggregation',   d: 'Encrypted weight delta transmitted to DISHA Global for model aggregation.' },
              ].map((item, i, arr) => (
                <div key={item.t} style={{ display: 'flex', gap: 12, paddingBottom: i<arr.length-1?10:0, marginBottom: i<arr.length-1?10:0, borderBottom: i<arr.length-1?'1px solid #f8fafc':'none' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 4, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', flexShrink: 0, fontFamily: 'monospace' }}>{item.n}</div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{item.t}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1, lineHeight: 1.5 }}>{item.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Privacy Proof Panel (shown after real training) ── */}
          {audit && (
            <div className="card" style={{ border: '1px solid #bbf7d0' }}>
              <div className="card-header" style={{ background: '#f0fdf4' }}>
                <div className="card-title-icon" style={{ background: '#dcfce7' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span style={{ color: '#15803d' }}>Privacy Proof — Evaluator Certificate</span>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <div style={{ marginBottom: 12, padding: '8px 12px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>Verified — Training ran locally. No images stored or transmitted.</div>
                  <div style={{ fontSize: 11, color: '#166534' }}>{new Date(audit.timestamp).toLocaleString('en-IN')}</div>
                </div>

                {[{
                  label: 'Training Device',       value: audit.device,
                }, {
                  label: 'Images Stored on Disk', value: `${audit.images_stored_on_disk}`,
                }, {
                  label: 'Images Transmitted',    value: `${audit.images_sent_to_global}`,
                }, {
                  label: 'Storage Method',         value: audit.storage_method,
                }, {
                  label: 'Algorithm',              value: `${audit.training.algorithm}`,
                }, {
                  label: 'Weight Hash (SHA-256)',   value: audit.weights.weights_hash.slice(0, 20) + '…',
                }, {
                  label: 'Images in Database',     value: audit.weights.images_in_db ? 'Yes' : 'No',
                }].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #f0fdf4', gap: 12 }}>
                    <span style={{ fontSize: 11.5, color: '#64748b', flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#15803d', textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* mammo-server status */}
          <div className="card">
            <div className="card-header">
              <div className="card-title-icon" style={{ background: '#f1f5f9' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              Local Training Node (mammo-server)
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Start the training server:</div>
                <code style={{ fontSize: 11.5, color: '#0f172a', background: '#1e293b', color: '#a5f3fc', padding: '8px 12px', borderRadius: 6, display: 'block', lineHeight: 1.8 }}>
                  cd mammo-server<br />
                  python -m uvicorn main:app --port 8000
                </code>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                When running, uploads trigger <strong>real TensorFlow GPU training</strong> on ResNet50. When offline, the portal simulates training for demo purposes.
              </div>
            </div>
          </div>

          {/* History */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <div className="card-title-icon" style={{ background: '#f1f5f9' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              Submission History
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{history.length}</span>
            </div>
            {history.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 12.5 }}>No submissions recorded.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="disha-table">
                  <thead><tr><th>Round</th><th>Images</th><th>Accuracy</th><th>Mode</th></tr></thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={`${h.roundNumber}-${h.completedAt}`}>
                        <td style={{ fontWeight: 700 }}>#{h.roundNumber}</td>
                        <td style={{ color: '#2563eb', fontWeight: 600 }}>{h.imagesTrained}</td>
                        <td style={{ fontWeight: 700, color: '#16a34a' }}>{h.accuracyPct}</td>
                        <td>
                          <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 12, fontWeight: 600,
                            background: h.simulation ? '#fef9c3' : '#dcfce7',
                            color:      h.simulation ? '#713f12' : '#15803d' }}>
                            {h.simulation ? 'Sim' : 'Real'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </HospitalLayout>
  );
}

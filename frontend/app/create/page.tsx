'use client';

import { useState, useEffect } from 'react';

const VENDORS: Record<string, { dot: string; icon: string }> = {
  'Anthropic':     { dot: '#cc785c', icon: 'https://www.google.com/s2/favicons?domain=anthropic.com&sz=32' },
  'OpenAI':        { dot: '#10a37f', icon: 'https://www.google.com/s2/favicons?domain=openai.com&sz=32' },
  'Google':        { dot: '#4285f4', icon: 'https://www.google.com/s2/favicons?domain=google.com&sz=32' },
  'Meta':          { dot: '#0668E1', icon: 'https://www.google.com/s2/favicons?domain=meta.com&sz=32' },
  'xAI':           { dot: '#111',    icon: 'https://www.google.com/s2/favicons?domain=x.ai&sz=32' },
  'DeepSeek':      { dot: '#4D6BFE', icon: 'https://www.google.com/s2/favicons?domain=deepseek.com&sz=32' },
  'Alibaba':       { dot: '#FF6A00', icon: 'https://www.google.com/s2/favicons?domain=qwen.ai&sz=32' },
  'Moonshot':      { dot: '#6B4FBB', icon: 'https://www.google.com/s2/favicons?domain=moonshot.ai&sz=32' },
  'Minimax':       { dot: '#0891B2', icon: 'https://www.google.com/s2/favicons?domain=minimaxi.com&sz=32' },
  'Zhipu AI':      { dot: '#059669', icon: 'https://www.google.com/s2/favicons?domain=zhipuai.cn&sz=32' },
  'Nous Research': { dot: '#F59E0B', icon: 'https://www.google.com/s2/favicons?domain=nousresearch.com&sz=32' },
};

interface Model {
  id: string;
  name: string;
  vendor: string;
  inputPrice: number;
  outputPrice: number;
  free?: boolean;
}

const MODELS: Model[] = [
  // Anthropic
  { id: 'claude-haiku-4-5',   name: 'Claude Haiku 4.5',   vendor: 'Anthropic', inputPrice: 1.05,  outputPrice: 5.25  },
  { id: 'claude-sonnet-4-0',  name: 'Claude Sonnet 4.0',  vendor: 'Anthropic', inputPrice: 3.15,  outputPrice: 15.75 },
  { id: 'claude-sonnet-4-5',  name: 'Claude Sonnet 4.5',  vendor: 'Anthropic', inputPrice: 3.15,  outputPrice: 15.75 },
  { id: 'claude-opus-4-0',    name: 'Claude Opus 4.0',    vendor: 'Anthropic', inputPrice: 15.75, outputPrice: 78.75 },
  { id: 'claude-opus-4-5',    name: 'Claude Opus 4.5',    vendor: 'Anthropic', inputPrice: 5.25,  outputPrice: 26.25 },
  { id: 'claude-opus-4-6',    name: 'Claude Opus 4.6',    vendor: 'Anthropic', inputPrice: 5.25,  outputPrice: 26.25 },
  { id: 'claude-opus-4-7',    name: 'Claude Opus 4.7',    vendor: 'Anthropic', inputPrice: 5.25,  outputPrice: 26.25 },
  // OpenAI
  { id: 'gpt-4o',          name: 'GPT-4o',              vendor: 'OpenAI', inputPrice: 2.63,  outputPrice: 10.5  },
  { id: 'gpt-4o-mini',     name: 'GPT-4o Mini',         vendor: 'OpenAI', inputPrice: 0.16,  outputPrice: 0.63  },
  { id: 'gpt-4-turbo',     name: 'GPT-4 Turbo',         vendor: 'OpenAI', inputPrice: 10.5,  outputPrice: 31.5  },
  { id: 'gpt-4-1',         name: 'GPT-4.1',             vendor: 'OpenAI', inputPrice: 2.1,   outputPrice: 8.4   },
  { id: 'gpt-5',           name: 'GPT-5',               vendor: 'OpenAI', inputPrice: 1.31,  outputPrice: 10.5  },
  { id: 'gpt-5-2',         name: 'GPT-5.2',             vendor: 'OpenAI', inputPrice: 1.84,  outputPrice: 14.7  },
  { id: 'gpt-5-3-codex',   name: 'GPT 5.3 Codex',      vendor: 'OpenAI', inputPrice: 1.84,  outputPrice: 14.7  },
  { id: 'gpt-5-mini',      name: 'GPT-5 Mini',          vendor: 'OpenAI', inputPrice: 0.26,  outputPrice: 2.1   },
  { id: 'gpt-5-nano',      name: 'GPT-5 Nano',          vendor: 'OpenAI', inputPrice: 0.05,  outputPrice: 0.42  },
  { id: 'gpt-oss-120b',    name: 'GPT OSS 120B',    vendor: 'OpenAI', inputPrice: 0.15,  outputPrice: 0.24, free: true },
  { id: 'gpt-oss-20b',     name: 'GPT OSS 20B',     vendor: 'OpenAI', inputPrice: 0.05,  outputPrice: 0.08, free: true },
  // Google
  { id: 'gemini-2-5-flash', name: 'Gemini 2.5 Flash', vendor: 'Google', inputPrice: 0.32,  outputPrice: 2.63  },
  { id: 'gemini-2-5-pro',   name: 'Gemini 2.5 Pro',   vendor: 'Google', inputPrice: 1.31,  outputPrice: 10.5  },
  { id: 'gemini-3-flash',   name: 'Gemini 3 Flash',   vendor: 'Google', inputPrice: 0.53,  outputPrice: 3.15  },
  { id: 'gemma-3n-e4b',     name: 'Gemma 3N E4B IT',  vendor: 'Google', inputPrice: 0.06,  outputPrice: 0.05  },
  { id: 'gemma-4-31b',      name: 'Gemma 4 31B IT',   vendor: 'Google', inputPrice: 0.2,   outputPrice: 0.2   },
  // Meta
  { id: 'llama-3-1-8b',        name: 'Llama 3.1 8B',                vendor: 'Meta', inputPrice: 0.05, outputPrice: 0.03 },
  { id: 'llama-3-3-70b',       name: 'Meta Llama 3.3 70B Instruct', vendor: 'Meta', inputPrice: 0.6,  outputPrice: 0.48, free: true },
  { id: 'llama-3-3-70b-turbo', name: 'Llama 3.3 70B Instruct Turbo', vendor: 'Meta', inputPrice: 0.88, outputPrice: 0.36 },
  { id: 'llama-3-8b-lite',     name: 'Llama 3 8B Instruct Lite',    vendor: 'Meta', inputPrice: 0.1,  outputPrice: 0.04 },
  // xAI
  { id: 'grok-3', name: 'Grok 3', vendor: 'xAI', inputPrice: 3.15, outputPrice: 15.75 },
  { id: 'grok-4', name: 'Grok 4', vendor: 'xAI', inputPrice: 3.15, outputPrice: 15.75 },
  // DeepSeek
  { id: 'deepseek-r1',     name: 'DeepSeek R1',     vendor: 'DeepSeek', inputPrice: 3,    outputPrice: 2.83 },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', vendor: 'DeepSeek', inputPrice: 2.1,  outputPrice: 1.78 },
  { id: 'deepseek-v3-2',   name: 'DeepSeek V3.2',   vendor: 'DeepSeek', inputPrice: 0.56, outputPrice: 0.98 },
  // Alibaba (Qwen)
  { id: 'qwen-2-5-7b',  name: 'Qwen 2.5 7B Instruct Turbo',          vendor: 'Alibaba', inputPrice: 0.3,  outputPrice: 0.12 },
  { id: 'qwen-3-235b',  name: 'Qwen 3 235B A22B Thinking 2507',      vendor: 'Alibaba', inputPrice: 0.65, outputPrice: 1.21, free: true },
  { id: 'qwen-3-coder', name: 'Qwen 3 Coder 480B A35B Instruct FP8', vendor: 'Alibaba', inputPrice: 2,    outputPrice: 0.81, free: true },
  // Moonshot (Kimi)
  { id: 'kimi-k2-5', name: 'Kimi K2.5', vendor: 'Moonshot', inputPrice: 0.5,  outputPrice: 1.13 },
  { id: 'kimi-k2-6', name: 'Kimi K2.6', vendor: 'Moonshot', inputPrice: 1.2,  outputPrice: 1.82 },
  // Minimax
  { id: 'minimax-m2-5', name: 'Minimax M2.5', vendor: 'Minimax', inputPrice: 0.3, outputPrice: 0.48 },
  { id: 'minimax-m2-7', name: 'Minimax M2.7', vendor: 'Minimax', inputPrice: 0.3, outputPrice: 0.48 },
  // Zhipu AI (GLM)
  { id: 'glm-5',   name: 'GLM 5',   vendor: 'Zhipu AI', inputPrice: 1,   outputPrice: 1.29 },
  { id: 'glm-5-1', name: 'GLM 5.1', vendor: 'Zhipu AI', inputPrice: 1.4, outputPrice: 1.78 },
  // Nous Research
  { id: 'trinity-mini', name: 'Trinity Mini', vendor: 'Nous Research', inputPrice: 0.05, outputPrice: 0.06, free: true },
];

const PRESETS = [
  {
    label: 'Island survival',
    text: 'A 200-person community is stranded on a remote island. Fresh water is scarce, there is no central authority, and resources are unevenly distributed.',
  },
  {
    label: 'Startup founding',
    text: 'A group is co-founding a company with no roles, no equity split, and a 12-week runway. Decisions are made by discussion.',
  },
  {
    label: 'Local election',
    text: 'A small town is holding an election. Three candidates have announced. Information spreads through conversation. Voting is in two weeks.',
  },
];

function fmtPrice(n: number) {
  return `$${n}`;
}

function VendorIcon({ vendor, size }: { vendor: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const v = VENDORS[vendor];
  const r = Math.round(size * 0.28);
  if (!v || failed) {
    return (
      <i
        className="vi-fb"
        style={{
          width: size,
          height: size,
          borderRadius: r,
          background: v?.dot || '#c7c7cc',
          fontSize: Math.round(size * 0.52),
        }}
      >
        {(vendor || '?')[0]}
      </i>
    );
  }
  return (
    <img
      src={v.icon}
      className="vi"
      width={size}
      height={size}
      style={{ borderRadius: r }}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

function ModelBtn({ modelId, onClick }: { modelId: string; onClick: () => void }) {
  const m = MODELS.find((x) => x.id === modelId) || MODELS[0];
  return (
    <button className="model-btn" onClick={onClick}>
      <VendorIcon vendor={m.vendor} size={20} />
      <span className="model-btn-name">{m.name}</span>
      {m.free && <span className="model-btn-free">Free</span>}
      <span className="model-btn-prices">
        {fmtPrice(m.inputPrice)}<span className="mbp-unit">/M</span><span className="mbp-sub">in</span>
        <span className="mbp-sep">,</span>
        {fmtPrice(m.outputPrice)}<span className="mbp-unit">/M</span><span className="mbp-sub">out</span>
      </span>
      <span className="model-btn-chevron">▾</span>
    </button>
  );
}

function ModelPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? MODELS.filter((m) => m.name.toLowerCase().includes(q) || m.vendor.toLowerCase().includes(q))
    : MODELS;

  const groups: { vendor: string; items: Model[] }[] = [];
  const seen: Record<string, Model[]> = {};
  filtered.forEach((m) => {
    if (!seen[m.vendor]) { seen[m.vendor] = []; groups.push({ vendor: m.vendor, items: seen[m.vendor] }); }
    seen[m.vendor].push(m);
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Choose a model</span>
          <input
            className="modal-search"
            placeholder="Search models or providers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          {groups.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#86868b', fontSize: 14 }}>
              No models found
            </div>
          )}
          {groups.map(({ vendor, items }) => (
            <div className="vendor-section" key={vendor}>
              <div className="vendor-head">
                <VendorIcon vendor={vendor} size={16} />
                <span className="vendor-lbl">{vendor}</span>
              </div>
              <div className="mc-grid">
                {items.map((m) => (
                  <button
                    key={m.id}
                    className={`mc-card${current === m.id ? ' mc-selected' : ''}`}
                    onClick={() => onSelect(m.id)}
                  >
                    <div className="mc-top">
                      <VendorIcon vendor={m.vendor} size={22} />
                      <div className="mc-info">
                        <div className="mc-name">{m.name}</div>
                        {m.free && <span className="mc-free">Free</span>}
                      </div>
                    </div>
                    <div className="mc-prices">
                      <div className="mc-price-cell">
                        <div className="mc-price-dir">Input</div>
                        <div className="mc-price-val">{fmtPrice(m.inputPrice)}/M</div>
                      </div>
                      <div className="mc-price-cell">
                        <div className="mc-price-dir">Output</div>
                        <div className="mc-price-val">{fmtPrice(m.outputPrice)}/M</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStepper({
  value,
  onChange,
  min = 1,
  max = 200,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
    setDraft(null);
  };

  return (
    <div className="mini-stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        −
      </button>
      {draft !== null ? (
        <input
          className="mval mval-input"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(draft);
            if (e.key === 'Escape') setDraft(null);
          }}
        />
      ) : (
        <span className="mval" style={{ cursor: 'text' }} onClick={() => setDraft(String(value))}>
          {value}
        </span>
      )}
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        +
      </button>
    </div>
  );
}

interface Row {
  uid: number;
  modelId: string;
  calls: number;
  population: number;
}

let nextId = 3;

export default function CreatePage() {
  const [composer, setComposer] = useState('claude-sonnet-4-5');
  const [rows, setRows] = useState<Row[]>([
    { uid: 1, modelId: 'claude-sonnet-4-5', calls: 10, population: 8 },
    { uid: 2, modelId: 'gpt-5',             calls: 10, population: 8 },
  ]);
  const [context, setContext] = useState('');
  const [launched, setLaunched] = useState(false);
  const [pickerFor, setPickerFor] = useState<'composer' | 'new' | number | null>(null);

  const composerModel = MODELS.find((m) => m.id === composer) || MODELS[0];

  const removeRow = (uid: number) => setRows((p) => p.filter((r) => r.uid !== uid));
  const updateRow = (uid: number, key: keyof Row, val: string | number) =>
    setRows((p) => p.map((r) => (r.uid === uid ? { ...r, [key]: val } : r)));

  const handlePickerSelect = (id: string) => {
    if (pickerFor === 'composer') {
      setComposer(id);
    } else if (pickerFor === 'new') {
      const uid = nextId++;
      setRows((p) => [...p, { uid, modelId: id, calls: 10, population: 8 }]);
    } else if (pickerFor !== null) {
      updateRow(pickerFor as number, 'modelId', id);
    }
    setPickerFor(null);
  };

  const totalPop   = rows.reduce((s, r) => s + r.population, 0);
  const totalCalls = rows.reduce((s, r) => s + r.calls, 0);
  const canLaunch  = rows.length > 0;

  const handleLaunch = () => {
    if (!canLaunch) return;
    setLaunched(true);
    setTimeout(() => setLaunched(false), 2500);
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }

        .create-page {
          background: #f5f5f7;
          color: #1d1d1f;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }

        .create-header {
          background: #fff;
          border-bottom: 1px solid #e0e0e0;
          height: 48px;
          display: flex;
          align-items: center;
          padding: 0 28px;
          gap: 10px;
        }
        .mark {
          display: inline-grid;
          grid-template-columns: repeat(3, 5px);
          grid-template-rows: repeat(3, 5px);
          gap: 3px;
        }
        .mark i { width: 5px; height: 5px; border-radius: 50%; display: block; }
        .mark i:nth-child(1){background:#ec6453}
        .mark i:nth-child(2){background:#f0c14a}
        .mark i:nth-child(3){background:#3eb495}
        .mark i:nth-child(4){background:#a479d8}
        .mark i:nth-child(5){background:#3a86ff}
        .mark i:nth-child(6){background:#e264a0}
        .mark i:nth-child(7){background:#3fc499}
        .mark i:nth-child(8){background:#f08a3a}
        .mark i:nth-child(9){background:#6c6bd9}
        .wordmark {
          font-size: 15px; font-weight: 600; letter-spacing: -0.3px;
          color: #1d1d1f;
        }

        .create-body {
          max-width: 960px;
          margin: 0 auto;
          padding: 24px 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .card {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 18px;
          padding: 20px 22px;
        }
        .card-label {
          font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
          text-transform: uppercase; color: #86868b;
          margin-bottom: 14px;
          display: flex; justify-content: space-between; align-items: center;
        }

        /* Model button */
        .model-btn {
          appearance: none; border: 1px solid #e0e0e0;
          background: #fff; border-radius: 10px;
          padding: 9px 12px;
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 500; color: #1d1d1f;
          letter-spacing: -0.1px; text-align: left;
          transition: border-color 0.15s, background 0.15s;
          width: 100%;
          min-width: 0;
        }
        .model-btn:hover { border-color: #b0b0b8; background: #fafafa; }
        .model-btn:focus { outline: none; border-color: #0066cc; }
        .model-btn-name {
          flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          min-width: 0;
        }
        .model-btn-free {
          font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
          color: #1c8a4a; background: rgba(28,138,74,0.1);
          border-radius: 9999px; padding: 2px 7px; flex-shrink: 0;
        }
        .model-btn-prices {
          font-size: 11px; color: #86868b; letter-spacing: -0.1px;
          flex-shrink: 0; white-space: nowrap;
          display: flex; align-items: baseline; gap: 1px;
        }
        .mbp-unit { font-size: 10px; color: #b0b0b8; }
        .mbp-sub  { font-size: 9px; color: #b0b0b8; }
        .mbp-sep  { color: #c7c7cc; margin: 0 4px; }
        .model-btn-chevron {
          flex-shrink: 0; color: #b0b0b8; font-size: 11px; line-height: 1; margin-left: 2px;
        }

        /* Model rows */
        .model-list { display: flex; flex-direction: column; gap: 8px; }
        .model-row {
          display: flex; align-items: center; gap: 10px;
          background: #f5f5f7; border-radius: 12px;
          padding: 10px 12px;
          transition: background 0.15s;
        }
        .model-btns-pair { display: flex; gap: 6px; flex: 1; min-width: 0; }
        .model-btns-pair .model-btn { flex: 1; min-width: 0; background: #fff; }

        .counter-group { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .counter-label { font-size: 11px; color: #86868b; letter-spacing: -0.1px; }
        .mini-stepper {
          display: inline-flex; align-items: center;
          background: #fff; border: 1px solid #e0e0e0;
          border-radius: 8px; overflow: hidden;
        }
        .mini-stepper button {
          width: 28px; height: 28px;
          border: 0; background: transparent;
          font-size: 16px; color: #1d1d1f;
          display: grid; place-items: center;
          transition: background 0.1s;
        }
        .mini-stepper button:hover { background: #f0f0f2; }
        .mini-stepper button:disabled { color: #c7c7cc; }
        .mini-stepper .mval {
          min-width: 40px; text-align: center;
          font-size: 13px; font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.2px;
          border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;
          height: 28px; line-height: 28px;
        }
        .mval-input {
          width: 40px; border: 0; outline: 0; padding: 0;
          background: transparent; font-family: inherit;
          font-variant-numeric: tabular-nums;
        }

        .divider-label { width: 1px; height: 20px; background: #e0e0e0; margin: 0 2px; }

        .remove-btn {
          appearance: none; background: transparent; border: 0;
          width: 28px; height: 28px; border-radius: 50%;
          display: grid; place-items: center;
          color: #86868b; font-size: 16px;
          transition: background 0.12s, color 0.12s;
          flex-shrink: 0;
        }
        .remove-btn:hover { background: #ffe5e5; color: #d00; }

        .add-model-btn {
          appearance: none; background: transparent;
          border: 1.5px dashed #d2d2d7; border-radius: 12px;
          width: 100%; padding: 10px;
          font-size: 13px; font-weight: 500; color: #0066cc;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          transition: background 0.15s, border-color 0.15s;
          margin-top: 4px;
        }
        .add-model-btn:hover { background: rgba(0,102,204,0.04); border-color: #0066cc; }
        .add-model-btn:active { transform: scale(0.98); }

        .bottom-row { display: flex; gap: 12px; }
        .bottom-row .card { flex: 1; }

        .totals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .total-cell {
          background: #f5f5f7; border-radius: 12px;
          padding: 14px 16px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .total-cell .t-label { font-size: 11px; color: #86868b; letter-spacing: -0.1px; }
        .total-cell .t-num {
          font-size: 30px; font-weight: 600;
          letter-spacing: -1px; font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .total-cell .t-sub { font-size: 11px; color: #86868b; margin-top: 2px; }
        .swatches { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
        .swatches i { width: 8px; height: 8px; border-radius: 50%; display: block; }

        .ctx-shell {
          border: 1px solid #e0e0e0; border-radius: 12px;
          background: #fff; transition: border-color 0.15s;
        }
        .ctx-shell:focus-within { border-color: #0066cc; }
        .ctx-shell textarea {
          width: 100%; border: 0; outline: 0; resize: none;
          padding: 13px 15px;
          font-family: inherit; font-size: 14px; line-height: 1.55;
          color: #1d1d1f; background: transparent; border-radius: 12px;
          height: 88px;
        }
        .ctx-shell textarea::placeholder { color: #86868b; }
        .ctx-foot {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 12px; border-top: 1px solid #f0f0f2; flex-wrap: wrap;
        }
        .preset-chip {
          appearance: none; background: transparent;
          border: 1px solid #e0e0e0; border-radius: 9999px;
          padding: 4px 10px; font-size: 11px; color: #1d1d1f;
          transition: background 0.12s, border-color 0.12s;
        }
        .preset-chip:hover { background: #f5f5f7; border-color: #c7c7cc; }

        .launch-row {
          display: flex; align-items: center; justify-content: space-between; gap: 20px;
          padding: 4px 0;
        }
        .launch-summary { font-size: 13px; color: #86868b; }
        .launch-summary b { color: #1d1d1f; }
        .btn-launch {
          appearance: none; border: 0;
          background: #1d1d1f; color: #fff;
          font-size: 15px; font-weight: 500; letter-spacing: -0.2px;
          padding: 12px 26px; border-radius: 9999px;
          transition: background 0.15s, transform 0.1s;
        }
        .btn-launch:hover { background: #3a3a3c; }
        .btn-launch:active { transform: scale(0.95); }
        .btn-launch:disabled { background: #c7c7cc; cursor: not-allowed; }
        .btn-launch.success { background: #1c8a4a; }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.32);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: mo-in 0.14s ease;
        }
        @keyframes mo-in { from { opacity: 0 } to { opacity: 1 } }
        .modal-box {
          background: #fff; border-radius: 20px;
          width: 100%; max-width: 880px;
          max-height: min(82vh, 720px);
          display: flex; flex-direction: column;
          box-shadow: 0 28px 80px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.05);
          overflow: hidden;
          animation: mb-in 0.18s cubic-bezier(0.34,1.2,0.64,1);
        }
        @keyframes mb-in {
          from { opacity: 0; transform: translateY(14px) scale(0.97) }
          to   { opacity: 1; transform: none }
        }
        .modal-head {
          padding: 14px 18px;
          border-bottom: 1px solid #f0f0f2;
          display: flex; align-items: center; gap: 10px;
          flex-shrink: 0;
        }
        .modal-title {
          font-size: 14px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.2px;
          white-space: nowrap;
        }
        .modal-search {
          flex: 1; border: 1px solid #e0e0e0; border-radius: 9999px;
          padding: 7px 14px; font-size: 13px; outline: none; font-family: inherit;
          background: #f5f5f7; color: #1d1d1f;
          transition: border-color 0.15s, background 0.15s;
        }
        .modal-search:focus { border-color: #0066cc; background: #fff; }
        .modal-search::placeholder { color: #86868b; }
        .modal-close {
          appearance: none; background: #f5f5f7; border: 0;
          width: 30px; height: 30px; border-radius: 50%;
          display: grid; place-items: center;
          font-size: 17px; color: #1d1d1f; line-height: 1;
          transition: background 0.12s; flex-shrink: 0;
        }
        .modal-close:hover { background: #e8e8ea; }
        .modal-body {
          overflow-y: auto; padding: 18px 20px 24px;
          flex: 1;
        }

        /* Vendor groups */
        .vendor-section { margin-bottom: 22px; }
        .vendor-section:last-child { margin-bottom: 0; }
        .vendor-head {
          display: flex; align-items: center; gap: 7px; margin-bottom: 9px;
        }
        .vendor-lbl {
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; color: #86868b;
        }

        /* Model cards grid */
        .mc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
          gap: 7px;
        }
        .mc-card {
          appearance: none; background: #f5f5f7; border: 1.5px solid transparent;
          border-radius: 14px; padding: 13px 13px 11px; text-align: left;
          transition: border-color 0.14s, background 0.14s, transform 0.1s;
          display: flex; flex-direction: column; gap: 9px;
        }
        .mc-card:hover { border-color: #c7c7cc; background: #ebebed; }
        .mc-card:hover:not(.mc-selected) { transform: translateY(-1px); }
        .mc-card.mc-selected {
          border-color: #0066cc; background: rgba(0,102,204,0.06);
        }
        .mc-card:active { transform: scale(0.97) !important; }
        .mc-top { display: flex; align-items: flex-start; gap: 8px; }
        .mc-info { flex: 1; min-width: 0; }
        .mc-name {
          font-size: 12.5px; font-weight: 600; color: #1d1d1f;
          letter-spacing: -0.2px; line-height: 1.35;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .mc-free {
          display: inline-block; margin-top: 3px;
          font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
          color: #1c8a4a; background: rgba(28,138,74,0.12);
          border-radius: 9999px; padding: 1px 7px;
        }
        .mc-prices { display: flex; gap: 5px; }
        .mc-price-cell {
          flex: 1; background: #fff; border-radius: 8px; padding: 7px 9px;
        }
        .mc-selected .mc-price-cell { background: rgba(255,255,255,0.75); }
        .mc-price-dir { font-size: 10px; color: #86868b; margin-bottom: 2px; letter-spacing: -0.1px; }
        .mc-price-val {
          font-size: 12px; font-weight: 600; color: #1d1d1f;
          font-variant-numeric: tabular-nums; letter-spacing: -0.2px;
        }

        /* Vendor icon shared */
        .vi {
          border-radius: 5px; object-fit: contain; flex-shrink: 0; display: block;
        }
        .vi-fb {
          border-radius: 5px; flex-shrink: 0; display: grid; place-items: center;
          font-weight: 700; color: #fff; font-style: normal; line-height: 1;
        }
      `}</style>

      {pickerFor !== null && (
        <ModelPicker
          current={
            pickerFor === 'composer' ? composer :
            pickerFor === 'new'      ? null :
            rows.find((r) => r.uid === pickerFor)?.modelId ?? null
          }
          onSelect={handlePickerSelect}
          onClose={() => setPickerFor(null)}
        />
      )}

      <div className="create-page">
        <header className="create-header">
          <span className="mark" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i /><i /><i />
          </span>
          <span className="wordmark">societyAI</span>
        </header>

        <div className="create-body">
          {/* Composer agent */}
          <div className="card">
            <div className="card-label">Composer agent</div>
            <ModelBtn modelId={composer} onClick={() => setPickerFor('composer')} />
          </div>

          {/* Population model rows */}
          <div className="card">
            <div className="card-label">
              <span>Population models</span>
              <span>{rows.length} model{rows.length === 1 ? '' : 's'}</span>
            </div>
            <div className="model-list">
              {rows.map((row) => (
                <div className="model-row" key={row.uid}>
                  <ModelBtn modelId={row.modelId} onClick={() => setPickerFor(row.uid)} />

                  <div className="counter-group">
                    <span className="counter-label">Calls</span>
                    <MiniStepper
                      value={row.calls}
                      onChange={(v) => updateRow(row.uid, 'calls', v)}
                      min={1}
                      max={500}
                    />
                  </div>

                  <div className="divider-label" />

                  <div className="counter-group">
                    <span className="counter-label">Population</span>
                    <MiniStepper
                      value={row.population}
                      onChange={(v) => updateRow(row.uid, 'population', v)}
                      min={1}
                      max={200}
                    />
                  </div>

                  <button className="remove-btn" onClick={() => removeRow(row.uid)} title="Remove">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button className="add-model-btn" onClick={() => setPickerFor('new')}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add a model
            </button>
          </div>

          {/* Bottom: totals + context */}
          <div className="bottom-row">
            <div className="card" style={{ flex: '0 0 260px' }}>
              <div className="card-label">Totals</div>
              <div className="totals-grid">
                <div className="total-cell">
                  <span className="t-label">Total population</span>
                  <span className="t-num">{totalPop}</span>
                  <div className="swatches">
                    {rows.map((r) => {
                      const v = VENDORS[MODELS.find((x) => x.id === r.modelId)?.vendor ?? ''];
                      return v ? <i key={r.uid} style={{ background: v.dot }} /> : null;
                    })}
                  </div>
                </div>
                <div className="total-cell">
                  <span className="t-label">Total LLM calls</span>
                  <span className="t-num">{totalCalls}</span>
                  <span className="t-sub">
                    across {rows.length} model{rows.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            <div className="card" style={{ flex: 1 }}>
              <div
                className="card-label"
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <span>General context</span>
                <span>{context.length}/4000</span>
              </div>
              <div className="ctx-shell">
                <textarea
                  placeholder="Describe the world every individual inhabits — setting, constraints, shared events, background knowledge."
                  value={context}
                  maxLength={4000}
                  onChange={(e) => setContext(e.target.value)}
                />
                <div className="ctx-foot">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      className="preset-chip"
                      onClick={() => setContext(p.text)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Launch */}
          <div className="launch-row">
            <div className="launch-summary">
              Composer: <b>{composerModel.name}</b>&nbsp;·&nbsp;
              <b>{rows.length}</b> model{rows.length === 1 ? '' : 's'}&nbsp;·&nbsp;
              <b>{totalPop}</b>&nbsp;individuals&nbsp;·&nbsp;
              <b>{totalCalls}</b> LLM calls
            </div>
            <button
              className={`btn-launch${launched ? ' success' : ''}`}
              disabled={!canLaunch}
              onClick={handleLaunch}
            >
              {launched ? 'Sandbox created ✓' : 'Create sandbox →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

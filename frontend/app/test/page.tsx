'use client';

import { useState, useEffect, useRef } from 'react';

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
  { id: 'gpt-4o',          name: 'GPT-4o',          vendor: 'OpenAI', inputPrice: 2.63,  outputPrice: 10.5  },
  { id: 'gpt-4o-mini',     name: 'GPT-4o Mini',     vendor: 'OpenAI', inputPrice: 0.16,  outputPrice: 0.63  },
  { id: 'gpt-4-turbo',     name: 'GPT-4 Turbo',     vendor: 'OpenAI', inputPrice: 10.5,  outputPrice: 31.5  },
  { id: 'gpt-4-1',         name: 'GPT-4.1',         vendor: 'OpenAI', inputPrice: 2.1,   outputPrice: 8.4   },
  { id: 'gpt-5',           name: 'GPT-5',           vendor: 'OpenAI', inputPrice: 1.31,  outputPrice: 10.5  },
  { id: 'gpt-5-2',         name: 'GPT-5.2',         vendor: 'OpenAI', inputPrice: 1.84,  outputPrice: 14.7  },
  { id: 'gpt-5-3-codex',   name: 'GPT 5.3 Codex',  vendor: 'OpenAI', inputPrice: 1.84,  outputPrice: 14.7  },
  { id: 'gpt-5-mini',      name: 'GPT-5 Mini',      vendor: 'OpenAI', inputPrice: 0.26,  outputPrice: 2.1   },
  { id: 'gpt-5-nano',      name: 'GPT-5 Nano',      vendor: 'OpenAI', inputPrice: 0.05,  outputPrice: 0.42  },
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

function VendorIcon({ vendor, size }: { vendor: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const v = VENDORS[vendor];
  const r = Math.round(size * 0.28);
  if (!v || failed) {
    return (
      <i
        className="vi-fb"
        style={{
          width: size, height: size, borderRadius: r,
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
                        <div className="mc-price-val">${m.inputPrice}/M</div>
                      </div>
                      <div className="mc-price-cell">
                        <div className="mc-price-dir">Output</div>
                        <div className="mc-price-val">${m.outputPrice}/M</div>
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

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UsageInfo {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export default function TestPage() {
  const [modelId, setModelId] = useState('deepseek-v3-2');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [userMessage, setUserMessage] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0];

  const handleSend = async () => {
    if (!userMessage.trim() || loading) return;
    setLoading(true);
    setResponse(null);
    setError(null);
    setUsage(null);
    setLatency(null);
    setRawJson(null);

    const messages: Message[] = [];
    if (systemPrompt.trim()) {
      messages.push({ role: 'system', content: systemPrompt.trim() });
    }
    messages.push({ role: 'user', content: userMessage.trim() });

    const t0 = Date.now();
    try {
      const res = await fetch('/api/clod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.name,
          messages,
          temperature,
          max_completion_tokens: maxTokens,
        }),
      });

      const elapsed = Date.now() - t0;
      setLatency(elapsed);

      const data = await res.json();
      setRawJson(JSON.stringify(data, null, 2));

      if (!res.ok) {
        const msg = data?.error?.message ?? data?.error ?? JSON.stringify(data);
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      } else {
        const content = data?.choices?.[0]?.message?.content;
        setResponse(content ?? '(no content in response)');
        if (data?.usage) setUsage(data.usage as UsageInfo);
      }
    } catch (err) {
      setLatency(Date.now() - t0);
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleKeyDownWrapper(e);
    }
  };

  const handleKeyDownWrapper = (e: React.KeyboardEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }

        .test-page {
          background: #f5f5f7;
          color: #1d1d1f;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }

        .test-header {
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
        .header-badge {
          font-size: 11px; font-weight: 600; letter-spacing: 0.4px;
          text-transform: uppercase; color: #86868b;
          background: #f0f0f2; border-radius: 6px;
          padding: 3px 8px; margin-left: 4px;
        }

        .test-body {
          max-width: 860px;
          margin: 0 auto;
          padding: 24px 24px 48px;
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

        /* Model selector button */
        .model-sel-btn {
          appearance: none; border: 1px solid #e0e0e0;
          background: #f5f5f7; border-radius: 10px;
          padding: 10px 14px;
          display: flex; align-items: center; gap: 9px;
          font-size: 13.5px; font-weight: 500; color: #1d1d1f;
          letter-spacing: -0.1px; text-align: left;
          transition: border-color 0.15s, background 0.15s;
          width: 100%;
        }
        .model-sel-btn:hover { border-color: #b0b0b8; background: #ebebed; }
        .model-sel-btn:focus { outline: none; border-color: #0066cc; }
        .model-sel-name { flex: 1; }
        .model-sel-vendor { font-size: 12px; color: #86868b; }
        .model-sel-free {
          font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
          color: #1c8a4a; background: rgba(28,138,74,0.1);
          border-radius: 9999px; padding: 2px 7px;
        }
        .model-sel-prices {
          font-size: 11px; color: #86868b;
          white-space: nowrap;
        }
        .model-sel-chevron { color: #b0b0b8; font-size: 11px; }

        /* Config row */
        .config-row {
          display: flex; gap: 16px; align-items: flex-end; margin-top: 14px;
        }
        .config-field { display: flex; flex-direction: column; gap: 5px; }
        .config-field label {
          font-size: 11px; font-weight: 600; letter-spacing: 0.3px;
          text-transform: uppercase; color: #86868b;
        }
        .config-input {
          border: 1px solid #e0e0e0; border-radius: 8px;
          padding: 7px 10px; font-size: 13px; font-family: inherit;
          background: #f5f5f7; color: #1d1d1f; outline: none;
          width: 90px;
          transition: border-color 0.15s, background 0.15s;
        }
        .config-input:focus { border-color: #0066cc; background: #fff; }

        /* System prompt */
        .sys-shell {
          border: 1px solid #e0e0e0; border-radius: 10px;
          background: #f5f5f7; transition: border-color 0.15s;
        }
        .sys-shell:focus-within { border-color: #0066cc; background: #fff; }
        .sys-shell textarea {
          width: 100%; border: 0; outline: 0; resize: none;
          padding: 10px 13px;
          font-family: inherit; font-size: 13px; line-height: 1.55;
          color: #1d1d1f; background: transparent; border-radius: 10px;
          height: 64px;
        }
        .sys-shell textarea::placeholder { color: #b0b0b8; }

        /* Message composer */
        .msg-shell {
          border: 1px solid #e0e0e0; border-radius: 14px;
          background: #fff; overflow: hidden;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .msg-shell:focus-within {
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0,102,204,0.12);
        }
        .msg-shell textarea {
          width: 100%; border: 0; outline: 0; resize: none;
          padding: 14px 16px;
          font-family: inherit; font-size: 14px; line-height: 1.6;
          color: #1d1d1f; background: transparent;
          min-height: 100px;
        }
        .msg-shell textarea::placeholder { color: #b0b0b8; }
        .msg-foot {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 12px; border-top: 1px solid #f0f0f2;
        }
        .msg-hint { font-size: 11px; color: #b0b0b8; }
        .btn-send {
          appearance: none; border: 0;
          background: #1d1d1f; color: #fff;
          font-size: 13px; font-weight: 500; letter-spacing: -0.1px;
          padding: 8px 18px; border-radius: 9999px;
          transition: background 0.15s, transform 0.1s;
          display: flex; align-items: center; gap: 6px;
        }
        .btn-send:hover:not(:disabled) { background: #3a3a3c; }
        .btn-send:active:not(:disabled) { transform: scale(0.96); }
        .btn-send:disabled { background: #c7c7cc; cursor: not-allowed; }

        /* Spinner */
        .spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Response */
        .response-box {
          border: 1px solid #e0e0e0; border-radius: 14px;
          overflow: hidden;
          animation: fade-in 0.2s ease;
        }
        @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .response-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px; border-bottom: 1px solid #f0f0f2;
          background: #fafafa;
        }
        .response-head-left { display: flex; align-items: center; gap: 8px; }
        .response-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; color: #86868b;
        }
        .response-model-tag {
          font-size: 11px; color: #86868b; background: #f0f0f2;
          border-radius: 6px; padding: 2px 8px;
        }
        .response-meta { display: flex; align-items: center; gap: 10px; }
        .meta-chip {
          font-size: 11px; color: #86868b;
          display: flex; align-items: center; gap: 4px;
        }
        .meta-chip b { color: #1d1d1f; font-weight: 600; }
        .btn-raw {
          appearance: none; border: 1px solid #e0e0e0; background: transparent;
          border-radius: 6px; padding: 3px 9px;
          font-size: 11px; font-weight: 500; color: #86868b;
          transition: background 0.12s, color 0.12s;
        }
        .btn-raw:hover { background: #f0f0f2; color: #1d1d1f; }
        .btn-raw.active { background: #1d1d1f; color: #fff; border-color: #1d1d1f; }
        .response-content {
          padding: 18px 20px;
          font-size: 14px; line-height: 1.7; color: #1d1d1f;
          white-space: pre-wrap; word-break: break-word;
        }
        .response-content.raw {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 12px; line-height: 1.6; color: #1d1d1f;
          background: #f8f8f9;
        }

        /* Error */
        .error-box {
          border: 1px solid #ffd0cc; background: #fff5f4;
          border-radius: 14px; padding: 16px 18px;
          font-size: 13px; color: #c0392b; line-height: 1.6;
          animation: fade-in 0.2s ease;
        }
        .error-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; color: #e05545;
          margin-bottom: 6px;
        }

        /* Loading placeholder */
        .loading-box {
          border: 1px solid #e0e0e0; border-radius: 14px;
          padding: 32px 20px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          animation: fade-in 0.15s ease;
        }
        .loading-spinner {
          width: 28px; height: 28px; border-radius: 50%;
          border: 3px solid #e0e0e0;
          border-top-color: #1d1d1f;
          animation: spin 0.8s linear infinite;
        }
        .loading-label {
          font-size: 13px; color: #86868b;
        }

        /* Modal (same as create page) */
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
          padding: 14px 18px; border-bottom: 1px solid #f0f0f2;
          display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        }
        .modal-title { font-size: 14px; font-weight: 600; color: #1d1d1f; white-space: nowrap; }
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
          font-size: 17px; color: #1d1d1f;
          transition: background 0.12s; flex-shrink: 0;
        }
        .modal-close:hover { background: #e8e8ea; }
        .modal-body { overflow-y: auto; padding: 18px 20px 24px; flex: 1; }
        .vendor-section { margin-bottom: 22px; }
        .vendor-section:last-child { margin-bottom: 0; }
        .vendor-head { display: flex; align-items: center; gap: 7px; margin-bottom: 9px; }
        .vendor-lbl {
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; color: #86868b;
        }
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
        .mc-card.mc-selected { border-color: #0066cc; background: rgba(0,102,204,0.06); }
        .mc-card:active { transform: scale(0.97) !important; }
        .mc-top { display: flex; align-items: flex-start; gap: 8px; }
        .mc-info { flex: 1; min-width: 0; }
        .mc-name {
          font-size: 12.5px; font-weight: 600; color: #1d1d1f;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .mc-free {
          display: inline-block; margin-top: 3px;
          font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
          color: #1c8a4a; background: rgba(28,138,74,0.12);
          border-radius: 9999px; padding: 1px 7px;
        }
        .mc-prices { display: flex; gap: 5px; }
        .mc-price-cell { flex: 1; background: #fff; border-radius: 8px; padding: 7px 9px; }
        .mc-selected .mc-price-cell { background: rgba(255,255,255,0.75); }
        .mc-price-dir { font-size: 10px; color: #86868b; margin-bottom: 2px; }
        .mc-price-val { font-size: 12px; font-weight: 600; color: #1d1d1f; }
        .vi { border-radius: 5px; object-fit: contain; flex-shrink: 0; display: block; }
        .vi-fb {
          border-radius: 5px; flex-shrink: 0; display: grid; place-items: center;
          font-weight: 700; color: #fff; font-style: normal; line-height: 1;
        }
      `}</style>

      {pickerOpen && (
        <ModelPicker
          current={modelId}
          onSelect={(id) => { setModelId(id); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <div className="test-page">
        <header className="test-header">
          <span className="mark" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i /><i /><i />
          </span>
          <span className="wordmark">societyAI</span>
          <span className="header-badge">LLM Test</span>
        </header>

        <div className="test-body">

          {/* Model + Config */}
          <div className="card">
            <div className="card-label">Model</div>
            <button className="model-sel-btn" onClick={() => setPickerOpen(true)}>
              <VendorIcon vendor={model.vendor} size={22} />
              <span className="model-sel-name">{model.name}</span>
              <span className="model-sel-vendor">{model.vendor}</span>
              {model.free && <span className="model-sel-free">Free</span>}
              <span className="model-sel-prices">
                ${model.inputPrice}/M in · ${model.outputPrice}/M out
              </span>
              <span className="model-sel-chevron">▾</span>
            </button>

            <div className="config-row">
              <div className="config-field">
                <label>Temperature</label>
                <input
                  className="config-input"
                  type="number"
                  min={0}
                  max={2}
                  step={0.05}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="config-field">
                <label>Max tokens</label>
                <input
                  className="config-input"
                  type="number"
                  min={1}
                  max={8192}
                  step={64}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 512)}
                />
              </div>
            </div>
          </div>

          {/* System prompt */}
          <div className="card">
            <div className="card-label">System prompt</div>
            <div className="sys-shell">
              <textarea
                placeholder="Optional system instructions…"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>
          </div>

          {/* User message */}
          <div className="card">
            <div className="card-label">User message</div>
            <div className="msg-shell">
              <textarea
                ref={textareaRef}
                placeholder="Type your message…"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="msg-foot">
                <span className="msg-hint">⌘ + Enter to send</span>
                <button
                  className="btn-send"
                  disabled={!userMessage.trim() || loading}
                  onClick={handleSend}
                >
                  {loading ? (
                    <><div className="spinner" /> Sending</>
                  ) : (
                    'Send →'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="loading-box">
              <div className="loading-spinner" />
              <span className="loading-label">Waiting for {model.name}…</span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="error-box">
              <div className="error-label">Error</div>
              {error}
            </div>
          )}

          {/* Response */}
          {!loading && response !== null && (
            <div className="response-box">
              <div className="response-head">
                <div className="response-head-left">
                  <span className="response-label">Response</span>
                  <span className="response-model-tag">{model.name}</span>
                </div>
                <div className="response-meta">
                  {latency !== null && (
                    <span className="meta-chip"><b>{(latency / 1000).toFixed(2)}s</b></span>
                  )}
                  {usage && (
                    <span className="meta-chip">
                      <b>{usage.total_tokens}</b> tokens
                      ({usage.prompt_tokens} in · {usage.completion_tokens} out)
                    </span>
                  )}
                  {rawJson && (
                    <button
                      className={`btn-raw${showRaw ? ' active' : ''}`}
                      onClick={() => setShowRaw((v) => !v)}
                    >
                      {showRaw ? 'Hide JSON' : 'Raw JSON'}
                    </button>
                  )}
                </div>
              </div>
              <div className={`response-content${showRaw ? ' raw' : ''}`}>
                {showRaw ? rawJson : response}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

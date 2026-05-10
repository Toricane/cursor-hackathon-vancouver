'use client';

import { useState } from 'react';

const PROFESSIONS = [
  'Engineer', 'Teacher', 'Doctor', 'Farmer', 'Merchant',
  'Artist', 'Nurse', 'Lawyer', 'Chef', 'Driver',
  'Carpenter', 'Scientist', 'Journalist', 'Builder', 'Clerk',
];

const REACTIONS = ['Supportive', 'Neutral', 'Skeptical', 'Opposed', 'Undecided'];

const REACTION_COLORS: Record<string, string> = {
  Supportive: '#3eb495',
  Neutral:    '#86868b',
  Skeptical:  '#f0c14a',
  Opposed:    '#ec6453',
  Undecided:  '#a479d8',
};

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

interface Individual {
  id: number;
  age: number;
  profession: string;
  income: number;
  reaction: string;
}

function generatePopulation(count: number): Individual[] {
  const rng = seededRand(42);
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    age: Math.floor(rng() * 60) + 18,
    profession: PROFESSIONS[Math.floor(rng() * PROFESSIONS.length)],
    income: Math.floor(rng() * 120000) + 20000,
    reaction: REACTIONS[Math.floor(rng() * REACTIONS.length)],
  }));
}

const POPULATION = generatePopulation(80);

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
}

export default function SimulationPage() {
  const [selected, setSelected] = useState<Individual | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'composer'; text: string }[]>([
    { role: 'composer', text: 'Hello. I am overseeing this simulation. Ask me anything about the population or current state.' },
  ]);

  const handleSend = () => {
    const t = chatInput.trim();
    if (!t) return;
    setChatLog((p) => [...p, { role: 'user', text: t }]);
    setChatInput('');
    setTimeout(() => {
      setChatLog((p) => [
        ...p,
        { role: 'composer', text: '(Composer response will appear here once connected to the backend.)' },
      ]);
    }, 400);
  };

  const reactionCounts = REACTIONS.reduce<Record<string, number>>((acc, r) => {
    acc[r] = POPULATION.filter((p) => p.reaction === r).length;
    return acc;
  }, {});

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; cursor: pointer; }
        input, textarea { font-family: inherit; }

        .sim-page {
          background: #f5f5f7;
          color: #1d1d1f;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ─── Header ─── */
        .sim-header {
          background: #fff;
          border-bottom: 1px solid #e0e0e0;
          height: 48px;
          display: flex;
          align-items: center;
          padding: 0 28px;
          gap: 10px;
          flex-shrink: 0;
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
          font-size: 15px; font-weight: 600; letter-spacing: -0.3px; color: #1d1d1f;
        }
        .header-sep { width: 1px; height: 18px; background: #e0e0e0; }
        .header-badge {
          font-size: 11px; font-weight: 600; letter-spacing: 0.4px;
          text-transform: uppercase; color: #3a86ff;
          background: rgba(58,134,255,0.1); border-radius: 9999px;
          padding: 3px 9px;
        }
        .header-status {
          margin-left: auto;
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: #86868b;
        }
        .status-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #3eb495;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* ─── Main layout ─── */
        .sim-body {
          flex: 1;
          display: flex;
          gap: 10px;
          padding: 10px;
          overflow: hidden;
          min-height: 0;
        }

        /* ─── Left: population panel (60%) ─── */
        .pop-panel {
          flex: 0 0 60%;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }
        .panel-head {
          padding: 14px 18px 10px;
          border-bottom: 1px solid #f0f0f2;
          flex-shrink: 0;
        }
        .panel-title {
          font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
          text-transform: uppercase; color: #86868b;
          display: flex; align-items: center; justify-content: space-between;
        }
        .panel-count {
          font-size: 13px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.2px;
        }
        .legend {
          display: flex; gap: 10px; flex-wrap: wrap;
          margin-top: 8px;
        }
        .legend-item {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: #86868b;
        }
        .legend-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .legend-n { font-weight: 600; color: #1d1d1f; }

        .pop-grid-wrap {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px 20px;
        }
        .pop-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-content: flex-start;
        }

        .person-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.12s, box-shadow 0.12s, opacity 0.12s;
          flex-shrink: 0;
          border: 2px solid transparent;
        }
        .person-dot:hover {
          transform: scale(1.35);
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          z-index: 1;
        }
        .person-dot.selected {
          border-color: #1d1d1f;
          transform: scale(1.4);
          box-shadow: 0 3px 10px rgba(0,0,0,0.22);
        }

        /* ─── Right column (40%) ─── */
        .right-col {
          flex: 0 0 40%;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
          overflow: hidden;
        }

        /* ─── Individual panel (top right, ~50% of right col) ─── */
        .individual-panel {
          flex: 1;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
        }
        .ind-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px 18px;
        }
        .ind-empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #c7c7cc;
        }
        .ind-empty-icon {
          width: 36px; height: 36px; border-radius: 50%;
          border: 2px dashed #e0e0e0;
          display: grid; place-items: center;
          font-size: 16px;
        }
        .ind-empty p { font-size: 12px; letter-spacing: -0.1px; }

        .ind-card { display: flex; flex-direction: column; gap: 12px; }
        .ind-avatar-row { display: flex; align-items: center; gap: 12px; }
        .ind-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          display: grid; place-items: center;
          font-size: 13px; font-weight: 700; color: #fff;
          flex-shrink: 0;
        }
        .ind-name { font-size: 14px; font-weight: 600; letter-spacing: -0.3px; }
        .ind-sub  { font-size: 12px; color: #86868b; margin-top: 1px; }
        .ind-reaction-badge {
          margin-left: auto; flex-shrink: 0;
          font-size: 11px; font-weight: 600; letter-spacing: 0.2px;
          border-radius: 9999px; padding: 3px 10px; color: #fff;
        }

        .ind-stats {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 7px;
        }
        .ind-stat {
          background: #f5f5f7; border-radius: 10px;
          padding: 10px 12px;
        }
        .ind-stat-label { font-size: 10px; color: #86868b; letter-spacing: 0.2px; margin-bottom: 3px; }
        .ind-stat-val { font-size: 16px; font-weight: 600; letter-spacing: -0.5px; color: #1d1d1f; }

        .ind-reaction-bar {
          background: #f5f5f7; border-radius: 10px; padding: 10px 12px;
        }
        .ind-reaction-label { font-size: 10px; color: #86868b; letter-spacing: 0.2px; margin-bottom: 6px; }
        .ind-reaction-row { display: flex; align-items: center; gap: 8px; }
        .ind-reaction-track {
          flex: 1; height: 6px; background: #e0e0e0; border-radius: 9999px; overflow: hidden;
        }
        .ind-reaction-fill { height: 100%; border-radius: 9999px; }
        .ind-reaction-name { font-size: 12px; font-weight: 600; color: #1d1d1f; flex-shrink: 0; }

        /* ─── Composer panel (bottom right, ~50% of right col) ─── */
        .composer-panel {
          flex: 1;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
        }
        .chat-log {
          flex: 1;
          overflow-y: auto;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .chat-msg {
          max-width: 85%;
          padding: 8px 12px;
          border-radius: 14px;
          font-size: 12.5px;
          line-height: 1.5;
          letter-spacing: -0.1px;
        }
        .chat-msg.user {
          background: #1d1d1f; color: #fff;
          border-bottom-right-radius: 4px;
          align-self: flex-end;
        }
        .chat-msg.composer {
          background: #f5f5f7; color: #1d1d1f;
          border-bottom-left-radius: 4px;
          align-self: flex-start;
        }
        .chat-input-row {
          display: flex; gap: 6px;
          padding: 10px 12px;
          border-top: 1px solid #f0f0f2;
          flex-shrink: 0;
        }
        .chat-input {
          flex: 1;
          border: 1px solid #e0e0e0; border-radius: 9999px;
          padding: 7px 14px; font-size: 12.5px; outline: none;
          background: #f5f5f7; color: #1d1d1f;
          transition: border-color 0.15s, background 0.15s;
        }
        .chat-input:focus { border-color: #0066cc; background: #fff; }
        .chat-input::placeholder { color: #b0b0b8; }
        .chat-send {
          appearance: none; border: 0;
          background: #1d1d1f; color: #fff;
          border-radius: 9999px;
          padding: 7px 14px;
          font-size: 12px; font-weight: 500;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .chat-send:hover { background: #3a3a3c; }
        .chat-send:disabled { background: #c7c7cc; }
      `}</style>

      <div className="sim-page">
        {/* Header */}
        <header className="sim-header">
          <span className="mark" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i /><i /><i />
          </span>
          <span className="wordmark">societyAI</span>
          <div className="header-sep" />
          <span className="header-badge">Simulation</span>
          <div className="header-status">
            <span className="status-dot" />
            Running · Round 1
          </div>
        </header>

        {/* Body */}
        <div className="sim-body">

          {/* ── Left: Population ── */}
          <div className="pop-panel">
            <div className="panel-head">
              <div className="panel-title">
                <span>Population</span>
                <span className="panel-count">{POPULATION.length} individuals</span>
              </div>
              <div className="legend">
                {REACTIONS.map((r) => (
                  <div className="legend-item" key={r}>
                    <span className="legend-dot" style={{ background: REACTION_COLORS[r] }} />
                    {r} <span className="legend-n">{reactionCounts[r]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pop-grid-wrap">
              <div className="pop-grid">
                {POPULATION.map((p) => (
                  <div
                    key={p.id}
                    className={`person-dot${selected?.id === p.id ? ' selected' : ''}`}
                    style={{ background: REACTION_COLORS[p.reaction] }}
                    title={`#${p.id} · ${p.profession} · Age ${p.age}`}
                    onClick={() => setSelected(selected?.id === p.id ? null : p)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="right-col">

            {/* Individual analyzer */}
            <div className="individual-panel">
              <div className="panel-head">
                <div className="panel-title">
                  <span>Individual</span>
                  {selected && <span className="panel-count">#{selected.id}</span>}
                </div>
              </div>
              <div className="ind-body">
                {!selected ? (
                  <div className="ind-empty">
                    <div className="ind-empty-icon">○</div>
                    <p>Click a dot to inspect</p>
                  </div>
                ) : (
                  <div className="ind-card">
                    <div className="ind-avatar-row">
                      <div
                        className="ind-avatar"
                        style={{ background: REACTION_COLORS[selected.reaction] }}
                      >
                        {selected.profession[0]}
                      </div>
                      <div>
                        <div className="ind-name">Individual #{selected.id}</div>
                        <div className="ind-sub">{selected.profession}</div>
                      </div>
                      <div
                        className="ind-reaction-badge"
                        style={{ background: REACTION_COLORS[selected.reaction] }}
                      >
                        {selected.reaction}
                      </div>
                    </div>

                    <div className="ind-stats">
                      <div className="ind-stat">
                        <div className="ind-stat-label">AGE</div>
                        <div className="ind-stat-val">{selected.age}</div>
                      </div>
                      <div className="ind-stat">
                        <div className="ind-stat-label">INCOME</div>
                        <div className="ind-stat-val">{fmt(selected.income)}</div>
                      </div>
                      <div className="ind-stat">
                        <div className="ind-stat-label">PROFESSION</div>
                        <div className="ind-stat-val" style={{ fontSize: 13 }}>{selected.profession}</div>
                      </div>
                      <div className="ind-stat">
                        <div className="ind-stat-label">ID</div>
                        <div className="ind-stat-val">#{String(selected.id).padStart(3, '0')}</div>
                      </div>
                    </div>

                    <div className="ind-reaction-bar">
                      <div className="ind-reaction-label">REACTION TO CHANGE</div>
                      <div className="ind-reaction-row">
                        <div className="ind-reaction-track">
                          <div
                            className="ind-reaction-fill"
                            style={{
                              background: REACTION_COLORS[selected.reaction],
                              width: selected.reaction === 'Supportive' ? '88%'
                                   : selected.reaction === 'Neutral'    ? '50%'
                                   : selected.reaction === 'Skeptical'  ? '35%'
                                   : selected.reaction === 'Opposed'    ? '15%'
                                   : '55%',
                            }}
                          />
                        </div>
                        <span className="ind-reaction-name">{selected.reaction}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Composer chat */}
            <div className="composer-panel">
              <div className="panel-head">
                <div className="panel-title">
                  <span>Composer</span>
                  <span style={{ fontSize: 10, color: '#3eb495', fontWeight: 600, letterSpacing: 0.3 }}>ONLINE</span>
                </div>
              </div>
              <div className="chat-log">
                {chatLog.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="chat-input-row">
                <input
                  className="chat-input"
                  placeholder="Ask the composer…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                />
                <button
                  className="chat-send"
                  onClick={handleSend}
                  disabled={!chatInput.trim()}
                >
                  Send
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Citizen,
  GroupConversation,
  REACTIONS,
  Reaction,
  SimulationState,
} from '@/lib/simulation/types';

const REACTION_COLORS: Record<string, string> = {
  Supportive: '#3eb495',
  Neutral:    '#86868b',
  Skeptical:  '#f0c14a',
  Opposed:    '#ec6453',
  Undecided:  '#a479d8',
};

const MODEL_LABELS: Record<string, string> = {
  'claude-haiku-4-5':   'Claude Haiku 4.5',
  'claude-sonnet-4-0':  'Claude Sonnet 4.0',
  'claude-sonnet-4-5':  'Claude Sonnet 4.5',
  'claude-opus-4-0':    'Claude Opus 4.0',
  'claude-opus-4-5':    'Claude Opus 4.5',
  'claude-opus-4-6':    'Claude Opus 4.6',
  'claude-opus-4-7':    'Claude Opus 4.7',
  'gpt-4o':             'GPT-4o',
  'gpt-4o-mini':        'GPT-4o Mini',
  'gpt-4-turbo':        'GPT-4 Turbo',
  'gpt-4-1':            'GPT-4.1',
  'gpt-5':              'GPT-5',
  'gpt-5-2':            'GPT-5.2',
  'gpt-5-3-codex':      'GPT 5.3 Codex',
  'gpt-5-mini':         'GPT-5 Mini',
  'gpt-5-nano':         'GPT-5 Nano',
  'gpt-oss-120b':       'GPT OSS 120B',
  'gpt-oss-20b':        'GPT OSS 20B',
  'gemini-2-5-flash':   'Gemini 2.5 Flash',
  'gemini-2-5-pro':     'Gemini 2.5 Pro',
  'gemini-3-flash':     'Gemini 3 Flash',
  'gemma-3n-e4b':       'Gemma 3N E4B IT',
  'gemma-4-31b':        'Gemma 4 31B IT',
  'llama-3-1-8b':       'Llama 3.1 8B',
  'llama-3-3-70b':      'Meta Llama 3.3 70B Instruct',
  'llama-3-3-70b-turbo':'Llama 3.3 70B Instruct Turbo',
  'llama-3-8b-lite':    'Llama 3 8B Instruct Lite',
  'grok-3':             'Grok 3',
  'grok-4':             'Grok 4',
  'deepseek-r1':        'DeepSeek R1',
  'deepseek-v4-pro':    'DeepSeek V4 Pro',
  'deepseek-v3-2':      'DeepSeek V3.2',
  'qwen-2-5-7b':        'Qwen 2.5 7B Instruct Turbo',
  'qwen-3-235b':        'Qwen 3 235B A22B Thinking 2507',
  'qwen-3-coder':       'Qwen 3 Coder 480B A35B Instruct FP8',
  'kimi-k2-5':          'Kimi K2.5',
  'kimi-k2-6':          'Kimi K2.6',
  'minimax-m2-5':       'Minimax M2.5',
  'minimax-m2-7':       'Minimax M2.7',
  'glm-5':              'GLM 5',
  'glm-5-1':            'GLM 5.1',
  'trinity-mini':       'Trinity Mini',
};

function modelLabel(id: string) {
  return MODEL_LABELS[id] || id;
}

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
}

function GroupModal({
  group,
  citizensById,
  onClose,
}: {
  group: GroupConversation;
  citizensById: Map<number, Citizen>;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const members = group.memberIds
    .map((id) => citizensById.get(id))
    .filter((c): c is Citizen => Boolean(c));

  const stanceById = new Map(group.finalStances.map((s) => [s.citizenId, s]));

  return (
    <div className="grp-modal-overlay" onClick={onClose}>
      <div className="grp-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="grp-modal-head">
          <div>
            <div className="grp-modal-title">
              Group {group.groupId} · Round {group.round}
            </div>
            <div className="grp-modal-sub">
              {members.length} agents · {modelLabel(group.modelId)}
            </div>
          </div>
          <button className="grp-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="grp-modal-body">
          <div className="grp-section">
            <div className="grp-section-label">Summary</div>
            <div className="grp-summary-text">{group.summary}</div>
          </div>

          <div className="grp-section">
            <div className="grp-section-label">Members</div>
            <div className="grp-members-grid">
              {members.map((m) => {
                const stance = stanceById.get(m.id);
                const reaction = stance?.reaction ?? m.reaction;
                return (
                  <div className="grp-member" key={m.id}>
                    <span
                      className="grp-member-dot"
                      style={{ background: REACTION_COLORS[reaction] }}
                    />
                    <div className="grp-member-info">
                      <div className="grp-member-name">{m.name} <span className="grp-member-id">#{m.id}</span></div>
                      <div className="grp-member-bio">{m.bio}</div>
                    </div>
                    <span
                      className="grp-member-stance"
                      style={{ background: REACTION_COLORS[reaction] }}
                    >
                      {reaction}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grp-section">
            <div className="grp-section-label">Conversation</div>
            <div className="grp-exchanges">
              {group.exchanges.map((round, idx) => (
                <div className="grp-exchange" key={idx}>
                  <div className="grp-exchange-label">Exchange {idx + 1}</div>
                  <div className="grp-exchange-msgs">
                    {round.map((m, mi) => {
                      const c = citizensById.get(m.citizenId);
                      return (
                        <div className="grp-msg" key={`${idx}-${mi}-${m.citizenId}`}>
                          <span
                            className="grp-msg-avatar"
                            style={{ background: REACTION_COLORS[m.reaction] }}
                          >
                            {(c?.name?.[0] ?? '?').toUpperCase()}
                          </span>
                          <div className="grp-msg-body">
                            <div className="grp-msg-meta">
                              <span className="grp-msg-name">{c?.name ?? `#${m.citizenId}`}</span>
                              <span
                                className="grp-msg-reaction"
                                style={{ color: REACTION_COLORS[m.reaction] }}
                              >
                                {m.reaction}
                              </span>
                            </div>
                            <div className="grp-msg-text">{m.text}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grp-section">
            <div className="grp-section-label">Final stances</div>
            <div className="grp-stances">
              {group.finalStances.map((s) => {
                const c = citizensById.get(s.citizenId);
                return (
                  <div className="grp-stance" key={s.citizenId}>
                    <span
                      className="grp-stance-dot"
                      style={{ background: REACTION_COLORS[s.reaction] }}
                    />
                    <div className="grp-stance-body">
                      <div className="grp-stance-name">
                        {c?.name ?? `#${s.citizenId}`}{' '}
                        <span className="grp-stance-reaction">{s.reaction}</span>
                      </div>
                      <div className="grp-stance-text">{s.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function groupReactionTotals(group: GroupConversation): Record<Reaction, number> {
  const totals: Record<Reaction, number> = {
    Supportive: 0,
    Neutral: 0,
    Skeptical: 0,
    Opposed: 0,
    Undecided: 0,
  };
  for (const s of group.finalStances) {
    totals[s.reaction] = (totals[s.reaction] ?? 0) + 1;
  }
  return totals;
}

export default function SimulationPage() {
  const searchParams = useSearchParams();
  const simulationId = searchParams.get('sid');

  const [state, setState] = useState<SimulationState | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isRoundLoading, setIsRoundLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thoughtsCollapsed, setThoughtsCollapsed] = useState(false);
  const [roundSummaryCollapsed, setRoundSummaryCollapsed] = useState(false);
  const [niaCollapsed, setNiaCollapsed] = useState(true);

  const selected = useMemo(
    () => state?.citizens.find((citizen) => citizen.id === selectedId) ?? null,
    [state, selectedId],
  );

  const citizensById = useMemo(() => {
    const map = new Map<number, Citizen>();
    state?.citizens.forEach((c) => map.set(c.id, c));
    return map;
  }, [state]);

  const expandedGroup = useMemo(
    () => state?.groups.find((g) => g.groupId === expandedGroupId) ?? null,
    [state, expandedGroupId],
  );

  useEffect(() => {
    if (!simulationId) {
      return;
    }

    let active = true;
    (async () => {
      try {
        const response = await fetch(`/api/simulations/${simulationId}`);
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || 'Failed to load simulation');
        }
        const body = (await response.json()) as { state: SimulationState };
        if (!active) return;
        setError(null);
        setState(body.state);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load simulation');
      }
    })();

    return () => {
      active = false;
    };
  }, [simulationId]);

  const handleRunRound = async () => {
    if (!simulationId) return;
    setIsRoundLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/simulations/${simulationId}/round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakerCount: 8 }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to run round');
      }
      const body = (await response.json()) as { state: SimulationState };
      setState(body.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run round');
    } finally {
      setIsRoundLoading(false);
    }
  };

  const handleSend = async () => {
    const t = chatInput.trim();
    if (!t || !simulationId) return;
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch(`/api/simulations/${simulationId}/composer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: t }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Composer request failed');
      }

      const body = (await response.json()) as { state: SimulationState };
      setState(body.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Composer request failed');
    } finally {
      setIsChatLoading(false);
    }
  };

  const reactionCounts = REACTIONS.reduce<Record<string, number>>((acc, r) => {
    acc[r] = state?.reactionCounts[r as Reaction] ?? 0;
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
        .round-btn {
          appearance: none;
          border: 1px solid #d0d0d4;
          background: #fff;
          color: #1d1d1f;
          border-radius: 9999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
        }
        .round-btn:disabled { color: #a5a5aa; border-color: #e0e0e0; }
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
          flex: 0 0 auto;
          max-height: 38%;
          overflow-y: auto;
          padding: 16px 20px 18px;
        }
        .pop-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-content: flex-start;
        }

        .groups-section {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          border-top: 1px solid #f0f0f2;
        }
        .groups-head {
          padding: 12px 18px 8px;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .groups-title {
          font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
          text-transform: uppercase; color: #86868b;
        }
        .groups-count {
          font-size: 12px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.2px;
        }
        .groups-list {
          flex: 1; min-height: 0; overflow-y: auto;
          padding: 0 16px 16px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .groups-empty {
          font-size: 12px; color: #86868b;
          line-height: 1.5; padding: 14px 12px;
          background: #f8f8fa; border: 1px dashed #e0e0e0;
          border-radius: 12px;
        }
        .round-summary-card {
          background: linear-gradient(135deg, #f4f8ff 0%, #f8f4ff 100%);
          border: 1px solid #e2e6f3;
          border-radius: 14px;
          padding: 12px 14px;
          display: flex; flex-direction: column; gap: 7px;
          margin-bottom: 8px;
        }
        .round-summary-head {
          display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
        }
        .round-summary-title {
          font-size: 11px; font-weight: 700; letter-spacing: 0.4px;
          text-transform: uppercase; color: #3a86ff;
        }
        .round-summary-meta {
          font-size: 11px; color: #86868b; letter-spacing: -0.1px;
        }
        .round-summary-text {
          font-size: 12.5px; line-height: 1.55; color: #1d1d1f;
          letter-spacing: -0.05px;
        }
        .round-shifts {
          background: rgba(255,255,255,0.65);
          border: 1px solid #e6e9f3;
          border-radius: 10px;
          padding: 8px 10px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .round-shifts-head {
          display: flex; align-items: baseline; justify-content: space-between; gap: 6px;
        }
        .round-shifts-title {
          font-size: 10px; font-weight: 600; letter-spacing: 0.4px;
          text-transform: uppercase; color: #86868b;
        }
        .round-shifts-count {
          font-size: 10.5px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.1px;
        }
        .round-shifts-empty {
          font-size: 11.5px; color: #86868b; line-height: 1.4;
        }
        .round-shifts-list {
          display: flex; flex-direction: column; gap: 4px;
          max-height: 180px; overflow-y: auto;
        }
        .round-shift {
          display: flex; align-items: center; gap: 6px;
          font-size: 11.5px; color: #1d1d1f;
          padding: 3px 0;
        }
        .round-shift-name {
          font-weight: 600; color: #1d1d1f; letter-spacing: -0.1px;
          flex: 1; min-width: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .round-shift-pill {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.2px;
          color: #fff; border-radius: 9999px;
          padding: 2px 7px;
          flex-shrink: 0;
        }
        .round-shift-arrow {
          color: #86868b; font-size: 11px; flex-shrink: 0;
        }
        .group-card {
          appearance: none; text-align: left;
          background: #f8f8fa;
          border: 1px solid #ececef;
          border-radius: 14px;
          padding: 12px 14px;
          display: flex; flex-direction: column; gap: 7px;
          transition: border-color 0.12s, background 0.12s, transform 0.1s;
        }
        .group-card:hover {
          background: #fff;
          border-color: #c7c7cc;
          transform: translateY(-1px);
        }
        .group-card:active { transform: scale(0.99); }
        .group-card-head {
          display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
        }
        .group-card-title {
          font-size: 13px; font-weight: 600; letter-spacing: -0.2px; color: #1d1d1f;
        }
        .group-card-meta {
          font-size: 11px; color: #86868b; letter-spacing: -0.1px;
        }
        .group-card-summary {
          font-size: 12px; line-height: 1.5; color: #1d1d1f;
          letter-spacing: -0.05px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .group-card-foot {
          display: flex; align-items: center; gap: 5px;
          flex-wrap: wrap;
        }
        .group-pill {
          display: inline-flex; align-items: center; gap: 4px;
          color: #fff;
          border-radius: 9999px;
          padding: 2px 8px 2px 6px;
          font-size: 10px; letter-spacing: 0.1px;
        }
        .group-pill-n { font-weight: 700; font-variant-numeric: tabular-nums; }
        .group-pill-r { font-weight: 500; opacity: 0.95; }
        .group-card-cta {
          margin-left: auto;
          font-size: 11px; font-weight: 500; color: #0066cc;
          letter-spacing: -0.1px;
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
          font-size: 14px; font-weight: 700; color: #fff;
          flex-shrink: 0;
        }
        .ind-id-block { min-width: 0; flex: 1; }
        .ind-name {
          font-size: 14px; font-weight: 600; letter-spacing: -0.3px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ind-sub  { font-size: 12px; color: #86868b; margin-top: 1px; }
        .ind-reaction-badge {
          margin-left: auto; flex-shrink: 0;
          font-size: 11px; font-weight: 600; letter-spacing: 0.2px;
          border-radius: 9999px; padding: 3px 10px; color: #fff;
        }
        .ind-bio {
          font-size: 12px; line-height: 1.5; color: #4a4a52;
          background: #fafafc; border: 1px solid #f0f0f2;
          border-radius: 10px; padding: 9px 12px;
          letter-spacing: -0.05px;
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
        .ind-thought {
          background: #f5f5f7;
          border-radius: 10px;
          padding: 10px 12px;
        }
        .ind-thought-label { font-size: 10px; color: #86868b; letter-spacing: 0.2px; margin-bottom: 5px; }
        .ind-thought-text { font-size: 12px; line-height: 1.5; color: #1d1d1f; }

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
        .round-thoughts {
          border-bottom: 1px solid #f0f0f2;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .round-thoughts.collapsed { gap: 0; }

        /* ─── Nia sources panel ─── */
        .nia-panel {
          border-bottom: 1px solid #f0f0f2;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .nia-panel.collapsed { gap: 0; }
        .nia-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .nia-panel-title {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.3px;
          color: #86868b;
          text-transform: uppercase;
        }
        .nia-badge {
          display: inline-flex; align-items: center;
          background: linear-gradient(135deg, #6c4cff, #ff4cb1);
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.5px;
          border-radius: 9999px;
          padding: 2px 7px;
          text-transform: uppercase;
        }
        .nia-source-list {
          display: flex; flex-direction: column; gap: 5px;
          max-height: 180px; overflow-y: auto;
        }
        .nia-source-item {
          display: flex; flex-direction: column; gap: 2px;
          background: #f8f8fa;
          border: 1px solid #ececef;
          border-radius: 8px;
          padding: 6px 8px;
        }
        .nia-source-link {
          font-size: 11.5px;
          font-weight: 600;
          color: #1d1d1f;
          letter-spacing: -0.1px;
          text-decoration: none;
          line-height: 1.35;
          word-break: break-word;
        }
        .nia-source-link:hover { color: #0066cc; text-decoration: underline; }
        .nia-source-meta {
          display: flex; align-items: center; gap: 6px;
        }
        .nia-source-cat {
          font-size: 8.5px; font-weight: 700; letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #fff;
          background: #86868b;
          padding: 1px 6px; border-radius: 9999px;
        }
        .nia-source-cat.documentation { background: #3a86ff; }
        .nia-source-cat.github { background: #1d1d1f; }
        .nia-source-cat.other { background: #6c4cff; }
        .nia-source-summary {
          font-size: 11px; color: #4a4a52; line-height: 1.4;
          letter-spacing: -0.05px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .nia-empty {
          font-size: 11px; color: #86868b; line-height: 1.4;
        }
        .round-thoughts-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .round-thoughts-title {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.3px;
          color: #86868b;
          text-transform: uppercase;
        }
        .collapse-btn {
          appearance: none;
          background: transparent;
          border: 0;
          color: #86868b;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          padding: 2px 4px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: color 0.12s, background 0.12s;
        }
        .collapse-btn:hover { color: #1d1d1f; background: #f5f5f7; }
        .collapse-caret {
          font-size: 9px;
          line-height: 1;
          transition: transform 0.15s ease;
        }
        .collapse-caret.collapsed { transform: rotate(-90deg); }
        .round-thought-item {
          font-size: 11.5px;
          line-height: 1.4;
          color: #1d1d1f;
          background: #f8f8fa;
          border-radius: 8px;
          padding: 6px 8px;
          display: flex; align-items: baseline; gap: 6px;
          flex-wrap: wrap;
        }
        .round-thought-dot {
          width: 7px; height: 7px; border-radius: 50%;
          align-self: center;
          flex-shrink: 0;
        }
        .round-thought-text { color: #1d1d1f; }
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
        .sim-error {
          background: #fff1f2;
          color: #9f1239;
          border: 1px solid #fecdd3;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 12px;
        }

        /* ─── Group modal ─── */
        .grp-modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.36);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: grp-mo-in 0.14s ease;
        }
        @keyframes grp-mo-in { from { opacity: 0 } to { opacity: 1 } }
        .grp-modal-box {
          background: #fff; border-radius: 20px;
          width: 100%; max-width: 880px;
          max-height: min(86vh, 820px);
          display: flex; flex-direction: column;
          box-shadow: 0 28px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05);
          overflow: hidden;
          animation: grp-mb-in 0.18s cubic-bezier(0.34,1.2,0.64,1);
          color: #1d1d1f;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          color-scheme: light;
        }
        @keyframes grp-mb-in {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
        .grp-modal-head {
          padding: 16px 20px;
          border-bottom: 1px solid #f0f0f2;
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; flex-shrink: 0;
        }
        .grp-modal-title {
          font-size: 15px; font-weight: 600; letter-spacing: -0.3px;
          color: #1d1d1f;
        }
        .grp-modal-sub {
          font-size: 12px; color: #86868b; margin-top: 2px;
        }
        .grp-modal-close {
          appearance: none; background: #f5f5f7; border: 0;
          width: 32px; height: 32px; border-radius: 50%;
          display: grid; place-items: center;
          font-size: 18px; color: #1d1d1f; line-height: 1;
          transition: background 0.12s;
        }
        .grp-modal-close:hover { background: #e8e8ea; }
        .grp-modal-body {
          flex: 1; min-height: 0; overflow-y: auto;
          padding: 18px 20px 24px;
          display: flex; flex-direction: column; gap: 18px;
        }

        .grp-section {
          display: flex; flex-direction: column; gap: 9px;
        }
        .grp-section-label {
          font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
          text-transform: uppercase; color: #86868b;
        }
        .grp-summary-text {
          font-size: 13px; line-height: 1.55; color: #1d1d1f;
          background: #fafafc; border: 1px solid #f0f0f2;
          border-radius: 12px; padding: 12px 14px;
          letter-spacing: -0.05px;
        }

        .grp-members-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 8px;
        }
        .grp-member {
          display: flex; align-items: center; gap: 9px;
          background: #fafafc; border: 1px solid #f0f0f2;
          border-radius: 12px; padding: 9px 11px;
        }
        .grp-member-dot {
          width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
        }
        .grp-member-info { flex: 1; min-width: 0; }
        .grp-member-name {
          font-size: 12.5px; font-weight: 600; letter-spacing: -0.2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .grp-member-id { color: #b0b0b8; font-weight: 500; margin-left: 4px; }
        .grp-member-bio {
          font-size: 11px; color: #86868b; line-height: 1.4;
          margin-top: 2px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .grp-member-stance {
          font-size: 10px; font-weight: 600; letter-spacing: 0.2px;
          color: #fff;
          border-radius: 9999px;
          padding: 2px 8px;
          flex-shrink: 0;
        }

        .grp-exchanges {
          display: flex; flex-direction: column; gap: 10px;
        }
        .grp-exchange {
          background: #fafafc; border: 1px solid #f0f0f2;
          border-radius: 12px; padding: 12px 14px;
        }
        .grp-exchange-label {
          font-size: 10px; font-weight: 700; letter-spacing: 0.4px;
          text-transform: uppercase; color: #86868b;
          margin-bottom: 9px;
        }
        .grp-exchange-msgs {
          display: flex; flex-direction: column; gap: 8px;
        }
        .grp-msg {
          display: flex; gap: 9px; align-items: flex-start;
        }
        .grp-msg-avatar {
          width: 22px; height: 22px; border-radius: 50%;
          color: #fff; font-weight: 700; font-size: 10.5px;
          display: grid; place-items: center; flex-shrink: 0;
        }
        .grp-msg-body { flex: 1; min-width: 0; }
        .grp-msg-meta {
          display: flex; align-items: baseline; gap: 7px;
          margin-bottom: 2px;
        }
        .grp-msg-name {
          font-size: 12px; font-weight: 600; letter-spacing: -0.2px;
          color: #1d1d1f;
        }
        .grp-msg-reaction {
          font-size: 10px; font-weight: 600; letter-spacing: 0.2px;
        }
        .grp-msg-text {
          font-size: 12.5px; line-height: 1.5; color: #1d1d1f;
          letter-spacing: -0.05px;
        }

        .grp-stances {
          display: flex; flex-direction: column; gap: 7px;
        }
        .grp-stance {
          display: flex; gap: 9px; align-items: flex-start;
          background: #fafafc; border: 1px solid #f0f0f2;
          border-radius: 12px; padding: 10px 12px;
        }
        .grp-stance-dot {
          width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
          margin-top: 3px;
        }
        .grp-stance-body { flex: 1; min-width: 0; }
        .grp-stance-name {
          font-size: 12.5px; font-weight: 600; letter-spacing: -0.2px;
          color: #1d1d1f;
        }
        .grp-stance-reaction {
          font-size: 10.5px; font-weight: 500; color: #86868b;
          letter-spacing: 0.2px; margin-left: 6px;
        }
        .grp-stance-text {
          font-size: 12px; line-height: 1.5; color: #1d1d1f;
          margin-top: 2px; letter-spacing: -0.05px;
        }
      `}</style>

      {expandedGroup && (
        <GroupModal
          group={expandedGroup}
          citizensById={citizensById}
          onClose={() => setExpandedGroupId(null)}
        />
      )}

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
            <button className="round-btn" onClick={handleRunRound} disabled={!state || isRoundLoading}>
              {isRoundLoading ? 'Running...' : 'Run round'}
            </button>
            <span className="status-dot" />
            {state ? `Running · Round ${state.round}` : simulationId ? 'Loading...' : 'No simulation id'}
          </div>
        </header>

        {/* Body */}
        <div className="sim-body">

          {/* ── Left: Population ── */}
          <div className="pop-panel">
            <div className="panel-head">
              <div className="panel-title">
                <span>Population</span>
                <span className="panel-count">{state?.citizens.length ?? 0} individuals</span>
              </div>
              {!simulationId && <div className="sim-error">Missing simulation id. Start from /create.</div>}
              {error && <div className="sim-error">{error}</div>}
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
                {(state?.citizens ?? []).map((p) => (
                  <div
                    key={p.id}
                    className={`person-dot${selectedId === p.id ? ' selected' : ''}`}
                    style={{ background: REACTION_COLORS[p.reaction] || '#86868b' }}
                    title={`${p.name} · ${p.profession} · Age ${p.age}`}
                    onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                  />
                ))}
              </div>
            </div>

            <div className="groups-section">
              <div className="groups-head">
                <span className="groups-title">Groups</span>
                <span className="groups-count">
                  {state?.groups.length ?? 0} group{(state?.groups.length ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
              <div className="groups-list">
                {state?.latestRoundNarrative && (
                  <div className="round-summary-card">
                    <div className="round-summary-head">
                      <span className="round-summary-title">Round {state.latestRoundNarrative.round} summary</span>
                      <button
                        className="collapse-btn"
                        onClick={() => setRoundSummaryCollapsed((v) => !v)}
                        aria-expanded={!roundSummaryCollapsed}
                        aria-label={roundSummaryCollapsed ? 'Expand round summary' : 'Collapse round summary'}
                      >
                        <span className={`collapse-caret${roundSummaryCollapsed ? ' collapsed' : ''}`}>▾</span>
                        {roundSummaryCollapsed ? 'Show' : 'Hide'}
                      </button>
                    </div>
                    {!roundSummaryCollapsed && (
                      <>
                        <div className="round-summary-text">{state.latestRoundNarrative.text}</div>
                        <div className="round-shifts">
                          <div className="round-shifts-head">
                            <span className="round-shifts-title">Stance shifts</span>
                            <span className="round-shifts-count">
                              {state.latestRoundNarrative.stanceShifts.length} of {state.citizens.length} changed
                            </span>
                          </div>
                          {state.latestRoundNarrative.stanceShifts.length === 0 ? (
                            <div className="round-shifts-empty">No citizens shifted their stance this round.</div>
                          ) : (
                            <div className="round-shifts-list">
                              {state.latestRoundNarrative.stanceShifts.map((shift) => (
                                <div className="round-shift" key={shift.citizenId}>
                                  <span className="round-shift-name">{shift.name}</span>
                                  <span
                                    className="round-shift-pill"
                                    style={{ background: REACTION_COLORS[shift.from] }}
                                  >
                                    {shift.from}
                                  </span>
                                  <span className="round-shift-arrow">→</span>
                                  <span
                                    className="round-shift-pill"
                                    style={{ background: REACTION_COLORS[shift.to] }}
                                  >
                                    {shift.to}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="round-summary-meta">
                          Synthesized from {state.groups.length} group{state.groups.length === 1 ? '' : 's'} · {modelLabel(state.composerModel)}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {(state?.groups ?? []).length === 0 && (
                  <div className="groups-empty">
                    Run a round to surface group summaries. Each round splits the population into groups of {8} for a four-exchange conversation.
                  </div>
                )}
                {(state?.groups ?? []).map((g) => {
                  const totals = groupReactionTotals(g);
                  return (
                    <button
                      key={g.groupId}
                      className="group-card"
                      onClick={() => setExpandedGroupId(g.groupId)}
                    >
                      <div className="group-card-head">
                        <span className="group-card-title">Group {g.groupId}</span>
                        <span className="group-card-meta">
                          {g.memberIds.length} agents · {modelLabel(g.modelId)}
                        </span>
                      </div>
                      <div className="group-card-summary">{g.summary}</div>
                      <div className="group-card-foot">
                        {REACTIONS.map((r) => (
                          totals[r] > 0 ? (
                            <span className="group-pill" key={r} style={{ background: REACTION_COLORS[r] }}>
                              <span className="group-pill-n">{totals[r]}</span>
                              <span className="group-pill-r">{r}</span>
                            </span>
                          ) : null
                        ))}
                        <span className="group-card-cta">Open conversation →</span>
                      </div>
                    </button>
                  );
                })}
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
                        {(selected.name?.[0] ?? selected.profession[0] ?? '?').toUpperCase()}
                      </div>
                      <div className="ind-id-block">
                        <div className="ind-name">{selected.name}</div>
                        <div className="ind-sub">{selected.profession} · #{String(selected.id).padStart(3, '0')}</div>
                      </div>
                      <div
                        className="ind-reaction-badge"
                        style={{ background: REACTION_COLORS[selected.reaction] }}
                      >
                        {selected.reaction}
                      </div>
                    </div>
                    {selected.bio && (
                      <div className="ind-bio">{selected.bio}</div>
                    )}

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

                    <div className="ind-thought">
                      <div className="ind-thought-label">LATEST THOUGHT</div>
                      <div className="ind-thought-text">{selected.lastMessage || 'No thought recorded yet.'}</div>
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
              {state && state.niaSources && state.niaSources.length > 0 && (
                <div className={`nia-panel${niaCollapsed ? ' collapsed' : ''}`}>
                  <div className="nia-panel-head">
                    <span className="nia-panel-title">
                      <span className="nia-badge">Nia</span>
                      Web context grounding · {state.niaSources.length} source{state.niaSources.length === 1 ? '' : 's'}
                    </span>
                    <button
                      className="collapse-btn"
                      onClick={() => setNiaCollapsed((v) => !v)}
                      aria-expanded={!niaCollapsed}
                      aria-label={niaCollapsed ? 'Expand Nia sources' : 'Collapse Nia sources'}
                    >
                      <span className={`collapse-caret${niaCollapsed ? ' collapsed' : ''}`}>▾</span>
                      {niaCollapsed ? 'Show' : 'Hide'}
                    </button>
                  </div>
                  {!niaCollapsed && (
                    <div className="nia-source-list">
                      {state.niaSources.map((src) => (
                        <div className="nia-source-item" key={src.url}>
                          <a
                            className="nia-source-link"
                            href={src.url}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            {src.title}
                          </a>
                          <div className="nia-source-meta">
                            <span className={`nia-source-cat ${src.category}`}>{src.category}</span>
                          </div>
                          {src.summary && (
                            <div className="nia-source-summary">{src.summary}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className={`round-thoughts${thoughtsCollapsed ? ' collapsed' : ''}`}>
                <div className="round-thoughts-head">
                  <div className="round-thoughts-title">Recent agent thoughts</div>
                  <button
                    className="collapse-btn"
                    onClick={() => setThoughtsCollapsed((v) => !v)}
                    aria-expanded={!thoughtsCollapsed}
                    aria-label={thoughtsCollapsed ? 'Expand recent agent thoughts' : 'Collapse recent agent thoughts'}
                  >
                    <span className={`collapse-caret${thoughtsCollapsed ? ' collapsed' : ''}`}>▾</span>
                    {thoughtsCollapsed ? 'Show' : 'Hide'}
                  </button>
                </div>
                {!thoughtsCollapsed && (
                  <>
                    {(state?.recentUtterances ?? []).slice(0, 3).map((u) => {
                      const c = citizensById.get(u.citizenId);
                      return (
                        <div className="round-thought-item" key={`${u.citizenId}-${u.text.slice(0, 12)}`}>
                          <span
                            className="round-thought-dot"
                            style={{ background: REACTION_COLORS[u.reaction] }}
                          />
                          <b>{c?.name ?? `#${u.citizenId}`}</b>
                          <span className="round-thought-text"> {u.text}</span>
                        </div>
                      );
                    })}
                    {(!state?.recentUtterances || state.recentUtterances.length === 0) && (
                      <div className="round-thought-item">Run a round to see latest agent thoughts.</div>
                    )}
                  </>
                )}
              </div>
              <div className="chat-log">
                {(state?.composerChat ?? []).map((m, i) => (
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
                  disabled={!chatInput.trim() || !state || isChatLoading}
                >
                  {isChatLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

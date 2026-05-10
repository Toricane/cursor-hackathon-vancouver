# SocietyOS
## A Living Policy Debate Simulator

Enter a real civic question. Watch a population of AI citizens debate it in real time.

---

## The Demo

**1. Compose**
The user types a policy question — *"Should Vancouver build a taller downtown skyline?"*

A Composer Agent makes one API call and returns a JSON array of 30–100 citizens: a retired transit worker, a 24-year-old renter, a condo developer, a city councillor. Each has a name, a one-line bio, and a starting stance (support / oppose / undecided).

**2. Simulate**
The simulation runs in rounds. Each round, all 64 agents are randomly divided into groups of 8. Within each group:

1. Every agent states their current stance — 8 opening messages
2. All 8 agents respond to the conversation — one CLōD call emulates all 8, producing 8 more messages
3. Steps repeat for two more sub-rounds — 3 exchanges total
4. Each agent submits a final updated stance
5. The group's conversation is summarized

Each group requires ~4 CLōD calls. After every round, groups reshuffle — agents carry their updated stances into new conversations, spreading influence across the full population over time.

Dot colors update each round to reflect current stance. The canvas shows group summaries by default; click any group to read the full conversation.

**3. Inspect**
Click any dot. A side panel shows:
- Name and bio
- Current stance
- Last thing they said

That's it. The agent feels real in three lines.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js, Tailwind CSS |
| Database + Realtime | Supabase |
| LLM Inference | CLōD |
| Deployment | Vercel |

---

## CLōD Integration
Every agent response is a real CLōD API call. The batching strategy — multiple agents per call where possible — keeps costs low and throughput high. Model selection is surfaced in the UI. CLōD is the engine, not a footnote.

---

## Stretch Goals
- Inject a mid-simulation event and watch agents react
- Auto-label emerging factions
- Nia integration: ground the Composer in real-world data before generating agents

---

## Why It Works as a Demo
A colored dot map reacting live to a policy question is immediately watchable. Clicking an agent and reading their one-line reasoning makes the system legible in seconds. The Vancouver skyline example — a real survey running right now — makes it land as relevant, not hypothetical.
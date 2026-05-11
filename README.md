# societyAI

Watch a population of AI citizens debate and respond to policy changes in real time

By Prajwal Prashanth and Eric Chen

## Inspiration
We were inspired by Vancouver's efforts to get survey data in-person at the lookout tower for whether the skyline should increase in height in downtown Vancouver. We wanted to build a solution which incorporates many agents representing various demographics to generate and simulate conversations without actually surveying people.

## What it does
SocietyAI simulates a population of AI citizens debating a civic issue in real time. Users enter a policy question, then watch dozens of generated citizens with different backgrounds, opinions, and motivations discuss it in small groups. Their stances update over time, and users can inspect individual agents or group summaries to understand why opinions shifted.

## How we built it
We built SocietyAI with Next.js, Tailwind CSS, Supabase, and LLM-powered agents. A composer agent generates a realistic population from the user’s prompt. The simulation then runs in rounds, grouping citizens together, generating conversations, summarizing debates, and updating each agent’s stance as they encounter new arguments.

## Challenges we ran into
The biggest challenge was making the simulation feel both fast and believable. Running many independent agents can get slow and expensive, so we had to batch multiple agent responses into fewer model calls while still preserving each citizen’s personality and reasoning. We also had to tune the UI so the debate was easy to understand at a glance.

## Accomplishments that we're proud of
We’re proud that SocietyAI turns a complex civic process into something visual, interactive, and immediately understandable. The live dots, evolving stances, and inspectable conversations make the simulation feel like a real society reacting to an issue, not just a chatbot answering a prompt.

## What we learned
We learned that agent simulations become much more compelling when they are grounded in simple, legible interactions. Small details like a one-line bio, a clear stance, and a final reason for changing opinion make each agent feel human without overwhelming the user.

## What's next for SocietyAI
Next, we want to ground simulations in real-world data, add major events that can shift the debate mid-simulation, and automatically identify emerging factions or consensus points. Long term, SocietyAI could become a tool for exploring public opinion, testing policy ideas, and making civic conversations more accessible.

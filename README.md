# 💳 LetPay

**Let your AI agent pay. Fund with your card. Set limits. Done.**

LetPay is the payment layer for AI agents. No crypto. No complexity. Your agent gets a virtual Visa card, funded by your regular credit card, with spending controls you set.

> Every AI agent will need a wallet. We're building the one that works for normal people.

---

## The Problem

AI agents are spending money — APIs, groceries, travel, domains. But giving them payment access today means:

- 🔴 **Crypto wallets** (lobster.cash, Skyfire, Coinbase) — requires stablecoins, not mass-market
- 🔴 **US-only** (Privacy.com) — doesn't work in Europe
- 🔴 **Enterprise APIs** (Visa, PayPal) — not built for consumers
- 🔴 **Sharing your card** — no controls, no limits, no visibility

**LetPay fills the gap:** real money, real cards, real controls, works in EU + US.

## How It Works

```
1. Sign up at letpay.ai
2. Add your credit/debit card
3. Your agent gets a virtual Visa — instantly
4. Set spending rules — monthly limits, per-tx caps, merchant categories
5. Install the agent skill — one command
6. Your agent pays, you stay in control
```

## Features

- 💳 **Fund with any card** — credit, debit, bank transfer
- 🌍 **EU + US** — powered by Stripe Issuing
- 🔒 **Human-in-the-loop** — approve big purchases from Telegram
- 📊 **Live dashboard** — every transaction, real-time
- ⚡ **Instant alerts** — Telegram/email on every spend
- 🛑 **Kill switch** — freeze everything, instantly
- 🏪 **Merchant controls** — whitelist/blacklist categories
- 🤖 **Agent-native** — OpenClaw skill + MCP server

## Quick Start

```bash
# OpenClaw
openclaw plugins install @letpay/agent

# Then tell your agent:
"Set up LetPay"
```

## Architecture

```
AI Agent (OpenClaw / Claude / any MCP client)
    │
    ▼
LetPay MCP Server
    │  → Check balance
    │  → Request payment (amount, merchant, reason)
    │  → Check spending rules
    │
    ▼
LetPay API (Node.js / TypeScript)
    │  → Enforce limits (monthly, per-tx, MCC)
    │  → Human approval if above threshold
    │  → Issue/retrieve virtual card
    │
    ▼
Stripe Issuing + Connect
    │  → Virtual Visa created
    │  → Card details returned to agent
    │  → Agent uses card at checkout
    │
    ▼
Stripe Webhooks → LetPay → User
    → Transaction confirmed
    → Telegram notification
    → Dashboard updated
```

## Project Structure

```
letpay/
├── apps/
│   ├── api/              # Backend API (Node.js + Hono)
│   ├── web/              # Dashboard (Next.js)
│   └── telegram-bot/     # Notification + approval bot
├── packages/
│   ├── core/             # Business logic, Stripe integration
│   ├── db/               # Database schema + migrations (Drizzle + Supabase)
│   ├── mcp-server/       # MCP server for agent integration
│   └── openclaw-skill/   # OpenClaw skill package
├── docs/                 # Technical documentation
├── docker-compose.yml
└── turbo.json            # Monorepo config
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Card Issuing** | Stripe Issuing + Connect |
| **Backend** | Node.js, TypeScript, Hono |
| **Database** | Supabase (Postgres) + Drizzle ORM |
| **Dashboard** | Next.js 15, Tailwind, shadcn/ui |
| **Auth** | Supabase Auth + Passkeys |
| **Agent Integration** | MCP Server + OpenClaw Skill |
| **Notifications** | Telegram Bot API |
| **Monorepo** | Turborepo |
| **Deploy** | Vercel (web) + Railway/Fly (API) |

## Roadmap

- [x] Research & architecture
- [x] Technical spec
- [ ] 🔨 Stripe Issuing sandbox setup
- [ ] 🔨 Core API — wallet CRUD, funding, card issuing
- [ ] 🔨 OpenClaw skill — balance, pay, history
- [ ] 🔨 MCP server — universal agent integration
- [ ] 🔨 Telegram bot — notifications + approval buttons
- [ ] 🔨 Web dashboard — balance, transactions, limits
- [ ] 🔨 Publish to ClawHub
- [ ] Multi-agent wallets
- [ ] Merchant category controls
- [ ] Team/business accounts
- [ ] B2B white-label API

## Contributing

We're building in the open. PRs, issues, and ideas welcome.

## License

[MIT](LICENSE)

---

**Built by [Albert Salgueda](https://github.com/albertsalgueda)**

# 💳 LetPay

**The open-source payment layer for AI agents.**

Give your agent a virtual card. Fund it with your card. Set spending rules. Done.

[![Build](https://github.com/albertsalgueda/letpay/actions/workflows/ci.yml/badge.svg)](https://github.com/albertsalgueda/letpay/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why LetPay?

AI agents are spending money — APIs, subscriptions, domains, services. But giving them payment access today is painful:

| Solution | Problem |
|----------|---------|
| Crypto wallets (Skyfire, x402) | Requires stablecoins — not mass-market |
| US-only cards (Privacy.com, Slash) | Doesn't work in Europe |
| Enterprise APIs (Visa, PayPal) | Not built for individual developers |
| Sharing your card | No controls, no limits, no visibility |

**LetPay fills the gap**: real money, real cards, real controls. Open source. Works in EU + US.

## How It Works

```
User                          LetPay                         Card Provider
  │                              │                               │
  ├── Sign up ──────────────────►│                               │
  ├── Create wallet ────────────►├── Issue virtual card ────────►│
  ├── Fund wallet (Stripe) ─────►├── Credit balance              │
  │                              │                               │
Agent                            │                               │
  ├── letpay_pay(€15, OpenAI) ──►├── Check rules                 │
  │                              ├── ✅ Auto-approve (< threshold)│
  │◄── Card details (PAN/CVV) ──┤                               │
  ├── Uses card at checkout ─────┼──────────────────────────────►│
  │                              │◄── Webhook: charge confirmed  │
  │                              ├── Record transaction          │
  │                              ├── Notify user (Telegram)      │
```

## Features

- 💳 **Virtual Visa cards** — one per agent, isolated spending
- 🔒 **Spending rules** — monthly limits, per-transaction caps, merchant category controls
- 🤖 **MCP server** — works with any MCP-compatible agent (Claude, OpenClaw, etc.)
- 👤 **Human-in-the-loop** — approve big purchases via Telegram
- 📊 **Dashboard** — real-time transactions, wallet management, API keys
- ⚡ **Instant alerts** — Telegram notifications on every spend
- 🛑 **Kill switch** — freeze any wallet instantly
- 🌍 **EU + US** — multi-provider architecture (Stripe, Wallester, more coming)
- 🔌 **Provider-agnostic** — swap card issuers without changing your agent code

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/albertsalgueda/letpay.git
cd letpay
pnpm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your credentials (or use USE_MOCKS=true for local dev)
```

### 3. Run with Mocks (no API keys needed)

```bash
# Start the database
docker compose up -d postgres

# Push the schema
cd packages/db && DATABASE_URL=postgresql://letpay:letpay@localhost:5432/letpay npx drizzle-kit push && cd ../..

# Start the API
pnpm --filter @letpay/api dev

# Start the dashboard (separate terminal)
pnpm --filter @letpay/web dev
```

API runs on `http://localhost:3001`, dashboard on `http://localhost:3000`.

### 4. Connect Your Agent (MCP)

```json
{
  "mcpServers": {
    "letpay": {
      "command": "npx",
      "args": ["@letpay/mcp-server"],
      "env": {
        "LETPAY_API_KEY": "your-api-key",
        "LETPAY_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

Your agent now has 4 tools: `letpay_balance`, `letpay_pay`, `letpay_history`, `letpay_request_topup`.

## Architecture

```
letpay/
├── apps/
│   ├── api/              # REST API (Hono + Node.js)
│   ├── web/              # Dashboard (Next.js 15)
│   └── telegram-bot/     # Notifications + approval bot (grammy)
├── packages/
│   ├── core/             # Business logic, rules engine, provider interfaces
│   ├── db/               # Database schema + migrations (Drizzle + Postgres)
│   └── mcp-server/       # MCP server for agent integration
```

### Provider Architecture

LetPay uses a **provider interface pattern** — card issuers and payment processors are pluggable:

```typescript
// packages/core/src/cards/interface.ts
interface CardIssuingService {
  createVirtualCard(params): Promise<CardInfo>;
  getCardDetails(cardId): Promise<CardDetails>;
  freezeCard(cardId): Promise<void>;
  approveAuthorization(authId): Promise<void>;
  declineAuthorization(authId, reason): Promise<void>;
  // ...
}
```

Current implementations:
- `MockCardIssuingService` — for local development
- Stripe Issuing — coming soon
- Wallester — coming soon
- **Your provider** — implement the interface, submit a PR

### Rules Engine

Every transaction is evaluated against configurable rules:

```
1. Sufficient balance?          → Decline if not
2. Per-transaction limit?       → Decline if exceeded
3. Monthly limit?               → Decline if exceeded
4. Merchant category blocked?   → Decline if MCC in blocklist
5. Merchant category allowed?   → Decline if MCC not in allowlist
6. Above approval threshold?    → Route to human approval
7. All clear                    → Auto-approve ✅
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **API** | Node.js, TypeScript, Hono |
| **Database** | PostgreSQL + Drizzle ORM |
| **Dashboard** | Next.js 15, Tailwind CSS |
| **Auth** | Supabase Auth |
| **Agent Integration** | MCP (Model Context Protocol) |
| **Notifications** | Telegram Bot (grammy) |
| **Payments** | Stripe (funding) |
| **Card Issuing** | Provider-agnostic interface |
| **Monorepo** | pnpm workspaces + Turborepo |
| **CI** | GitHub Actions |

## API Reference

### Agent Endpoints

```
POST /v1/agent/pay          # Request a payment
GET  /v1/agent/balance      # Check wallet balances
GET  /v1/agent/history      # Recent transactions
```

### Wallet Management

```
POST   /v1/wallets              # Create wallet
GET    /v1/wallets              # List wallets
GET    /v1/wallets/:id          # Get wallet
PATCH  /v1/wallets/:id          # Update wallet
POST   /v1/wallets/:id/freeze   # Freeze wallet
POST   /v1/wallets/:id/unfreeze # Unfreeze wallet
POST   /v1/wallets/:id/topup    # Fund wallet
GET    /v1/wallets/:id/balance  # Get balance
GET    /v1/wallets/:id/rules    # Get spending rules
PUT    /v1/wallets/:id/rules    # Update spending rules
```

### Approvals

```
GET  /v1/approvals                # List pending approvals
POST /v1/approvals/:id/approve    # Approve
POST /v1/approvals/:id/deny       # Deny
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `letpay_balance` | Check wallet balance and monthly spending |
| `letpay_pay` | Request a payment (returns card details if approved) |
| `letpay_history` | View recent transactions |
| `letpay_request_topup` | Ask the user to add funds |

## Self-Hosting

### Docker Compose (recommended)

```bash
docker compose up
```

This starts PostgreSQL, the API, the web dashboard, and the Telegram bot.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SUPABASE_URL` | For auth | Supabase project URL |
| `SUPABASE_ANON_KEY` | For auth | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | For auth | Supabase secret key |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For payments | Stripe webhook signing secret |
| `TELEGRAM_BOT_TOKEN` | For notifications | Telegram bot token from @BotFather |
| `USE_MOCKS` | No | Set to `true` for local dev without real APIs |

## Deployment

### Vercel (Dashboard)

```bash
cd apps/web
vercel deploy
```

### Railway / Fly.io (API + Bot)

The API and Telegram bot need long-running processes. Deploy to Railway, Fly.io, or any container platform.

```bash
# API
docker build -f apps/api/Dockerfile -t letpay-api .
# Bot
docker build -f apps/telegram-bot/Dockerfile -t letpay-bot .
```

## Contributing

We're building in the open. Contributions welcome!

### Adding a Card Provider

1. Implement `CardIssuingService` interface in `packages/core/src/cards/`
2. Add tests in `packages/core/__tests__/cards/`
3. Register in `apps/api/src/deps.ts`
4. Submit a PR

### Development

```bash
pnpm install
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm dev          # Start API + web in dev mode
```

## Roadmap

- [x] Core rules engine
- [x] MCP server (4 tools)
- [x] REST API with auth
- [x] Web dashboard
- [x] Telegram bot (notifications + approvals)
- [x] Stripe payment integration
- [x] Mock mode for local dev
- [ ] Stripe Issuing provider
- [ ] Wallester provider
- [ ] Slash API provider (US)
- [ ] Multi-agent wallets
- [ ] Receipt/invoice capture
- [ ] Team accounts
- [ ] OpenClaw skill (ClawHub)
- [ ] AP2 protocol support
- [ ] x402 support

## License

[MIT](LICENSE) — use it however you want.

---

**Built by [Albert Salgueda](https://github.com/albertsalgueda)**

*Every AI agent will need a wallet. This is the open-source one.*

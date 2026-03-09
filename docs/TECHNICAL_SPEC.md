# LetPay — Technical Specification

## Overview

LetPay provides AI agents with spending capability via virtual Visa cards, funded by users' regular payment methods (credit/debit cards, bank transfers). The system enforces spending rules server-side, provides real-time notifications, and offers a human-approval flow for transactions above configurable thresholds.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S AI AGENT                       │
│            (OpenClaw / Claude / any MCP client)          │
└──────────────────┬──────────────────────────────────────┘
                   │ MCP Protocol / REST API
                   ▼
┌─────────────────────────────────────────────────────────┐
│                   LETPAY MCP SERVER                      │
│  Tools: balance, request_payment, history, request_topup │
│  Transport: stdio (OpenClaw) / SSE (remote)             │
└──────────────────┬──────────────────────────────────────┘
                   │ Internal API calls
                   ▼
┌─────────────────────────────────────────────────────────┐
│                    LETPAY API                            │
│                 (Node.js + Hono)                         │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Auth Module  │  │ Wallet Module│  │ Rules Engine  │  │
│  │ (Supabase)   │  │ (CRUD, Fund) │  │ (Limits, MCC) │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │          │
│  ┌──────┴──────────────────┴───────────────────┴──────┐  │
│  │              Stripe Integration Layer              │  │
│  │    Connect · Issuing · Payment Intents · Webhooks  │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           │                             │
│  ┌────────────────────────┴──────────────────────────┐  │
│  │           Notification Service                     │  │
│  │         Telegram Bot · Email · Webhooks            │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
┌────────────┐ ┌────────┐ ┌──────────┐
│  Supabase  │ │ Stripe │ │ Telegram │
│  (Postgres)│ │  API   │ │  Bot API │
└────────────┘ └────────┘ └──────────┘
```

---

## 2. Stripe Integration (Core)

### 2.1 Stripe Products Used

| Product | Purpose | Pricing |
|---|---|---|
| **Stripe Connect** (Custom accounts) | Each LetPay user = a connected account. Handles KYC/KYB. | Free |
| **Stripe Issuing** | Create virtual Visa cards per user/agent | €0.10 per virtual card |
| **Stripe Identity** | KYC verification for connected accounts | €1.50 per verification |
| **Payment Intents** | User funds their wallet (card → Stripe balance) | 2.5% + €0.25 per top-up |
| **Financial Accounts** | Hold user funds (issuing balance) | Free |
| **Webhooks** | Real-time transaction events | Free |

### 2.2 Onboarding Flow

```
User signs up on letpay.ai
    │
    ▼
Create Stripe Connected Account (type: custom)
    │  → Collect: name, email, DOB, address
    │  → Stripe Identity verifies ID document
    │
    ▼
Create Financial Account (linked to connected account)
    │  → This holds the user's agent spending funds
    │
    ▼
User adds payment method (card/bank)
    │  → Stripe Payment Intent → funds Financial Account
    │
    ▼
Create Cardholder + Virtual Card (Stripe Issuing)
    │  → Card linked to Financial Account
    │  → Spending limits set via Stripe API
    │
    ▼
Agent can now use the card
```

### 2.3 Stripe Issuing — Card Controls

Stripe Issuing supports **real-time authorization** — we get a webhook for every attempted transaction and can approve/deny it programmatically:

```typescript
// Webhook: issuing_authorization.request
// We have ~2 seconds to approve or decline

async function handleAuthorizationRequest(authorization: Stripe.Issuing.Authorization) {
  const wallet = await getWalletByCardId(authorization.card.id);
  const rules = await getSpendingRules(wallet.id);

  // Check 1: Monthly limit
  const monthlySpend = await getMonthlySpend(wallet.id);
  if (monthlySpend + authorization.amount > rules.monthlyLimit) {
    return { approved: false, reason: 'monthly_limit_exceeded' };
  }

  // Check 2: Per-transaction limit
  if (authorization.amount > rules.perTransactionLimit) {
    return { approved: false, reason: 'transaction_limit_exceeded' };
  }

  // Check 3: Merchant Category Code
  if (rules.blockedMCCs.includes(authorization.merchant_data.category_code)) {
    return { approved: false, reason: 'merchant_category_blocked' };
  }

  // Check 4: Human approval required?
  if (authorization.amount > rules.approvalThreshold) {
    // Hold authorization, send Telegram approval request
    await requestHumanApproval(wallet.userId, authorization);
    return { approved: false, reason: 'pending_human_approval' };
  }

  return { approved: true };
}
```

### 2.4 Geographic Coverage

- **Platform registered in:** Spain (EEA) ✅
- **Can issue cards to:** All EEA countries + UK
- **US support:** Requires separate Stripe account (US entity) or Stripe Connect cross-border (available)
- **Card network:** Visa
- **Currency:** EUR (primary), USD (secondary), multi-currency via Stripe

---

## 3. Database Schema (Supabase / Postgres)

```sql
-- Users (extends Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  stripe_account_id TEXT UNIQUE,           -- Stripe Connected Account ID
  stripe_customer_id TEXT UNIQUE,          -- For payment methods
  kyc_status TEXT DEFAULT 'pending',       -- pending | verified | failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Wallets (one user can have multiple)
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Agent',
  stripe_card_id TEXT UNIQUE,              -- Stripe Issuing Card ID
  stripe_cardholder_id TEXT UNIQUE,        -- Stripe Cardholder ID
  stripe_financial_account_id TEXT,        -- Funding source
  status TEXT DEFAULT 'active',            -- active | frozen | cancelled
  balance_cents INTEGER DEFAULT 0,         -- Cached balance (source of truth = Stripe)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spending Rules (per wallet)
CREATE TABLE spending_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL UNIQUE,
  monthly_limit_cents INTEGER DEFAULT 5000,        -- €50 default
  per_transaction_limit_cents INTEGER DEFAULT 2500, -- €25 default
  approval_threshold_cents INTEGER DEFAULT 1000,    -- Ask human above €10
  blocked_mccs TEXT[] DEFAULT ARRAY[                 -- Default blocked categories
    '7995',  -- Gambling
    '5933',  -- Pawn shops
    '5967'   -- Direct marketing - inbound telemarketing
  ],
  allowed_mccs TEXT[],                              -- If set, ONLY these allowed
  auto_approve BOOLEAN DEFAULT true,                -- Auto-approve under threshold?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (mirror of Stripe events)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  stripe_authorization_id TEXT UNIQUE,
  stripe_transaction_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'eur',
  merchant_name TEXT,
  merchant_category TEXT,
  merchant_mcc TEXT,
  status TEXT DEFAULT 'pending',           -- pending | approved | declined | refunded
  decline_reason TEXT,
  agent_reason TEXT,                        -- Why the agent wanted to pay
  approval_status TEXT,                     -- auto | human_approved | human_denied
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Top-ups (user funding their wallet)
CREATE TABLE topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',           -- pending | succeeded | failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval Requests (human-in-the-loop)
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  stripe_authorization_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  merchant_name TEXT,
  agent_reason TEXT,
  status TEXT DEFAULT 'pending',           -- pending | approved | denied | expired
  telegram_message_id TEXT,                -- For inline button callback
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,         -- Auto-deny after timeout
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys (for programmatic access)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,           -- SHA-256 of the API key
  key_prefix TEXT NOT NULL,                -- First 8 chars for identification
  name TEXT DEFAULT 'default',
  scopes TEXT[] DEFAULT ARRAY['read', 'pay'],
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_topups_user ON topups(user_id);
CREATE INDEX idx_approval_requests_pending ON approval_requests(status) WHERE status = 'pending';
```

---

## 4. API Design

### 4.1 REST API (Hono)

Base URL: `https://api.letpay.ai/v1`

#### Auth
All requests require `Authorization: Bearer <api_key>` or Supabase JWT.

#### Endpoints

```
# Wallets
POST   /wallets                    Create a new agent wallet
GET    /wallets                    List user's wallets
GET    /wallets/:id                Get wallet details + balance
PATCH  /wallets/:id                Update wallet (name, status)
DELETE /wallets/:id                Cancel wallet (freezes card)
POST   /wallets/:id/freeze         Freeze wallet immediately
POST   /wallets/:id/unfreeze       Unfreeze wallet

# Funding
POST   /wallets/:id/topup          Create top-up (Stripe checkout session)
GET    /wallets/:id/balance         Get real-time balance from Stripe

# Spending Rules
GET    /wallets/:id/rules           Get spending rules
PUT    /wallets/:id/rules           Update spending rules

# Transactions
GET    /wallets/:id/transactions    List transactions (paginated)
GET    /transactions/:id            Get transaction details

# Approvals
GET    /approvals                   List pending approvals
POST   /approvals/:id/approve       Approve a pending transaction
POST   /approvals/:id/deny          Deny a pending transaction

# Card Details (sensitive — rate limited, logged)
POST   /wallets/:id/card            Get virtual card details (PAN, expiry, CVC)
                                    → Returns Stripe Issuing Elements ephemeral key
                                    → Client-side rendering only (PCI compliant)

# Agent Integration
POST   /agent/pay                   Agent requests payment
GET    /agent/balance               Agent checks balance
GET    /agent/history               Agent gets recent transactions

# Webhooks (Stripe → LetPay)
POST   /webhooks/stripe             Stripe webhook endpoint
```

### 4.2 Request/Response Examples

#### Agent requests payment
```http
POST /v1/agent/pay
Authorization: Bearer lp_sk_abc123...

{
  "wallet_id": "wal_xxx",
  "amount": 1499,
  "currency": "eur",
  "merchant": "OpenAI",
  "reason": "GPT-4 API credits for code review task"
}
```

Response (auto-approved):
```json
{
  "status": "approved",
  "approval_type": "auto",
  "card": {
    "ephemeral_key": "ek_xxx",
    "card_id": "ic_xxx"
  },
  "message": "Payment approved. Use the ephemeral key with Stripe.js to retrieve card details."
}
```

Response (needs human approval):
```json
{
  "status": "pending_approval",
  "approval_id": "apr_xxx",
  "message": "Amount exceeds auto-approval threshold. User has been notified via Telegram.",
  "expires_at": "2026-03-09T01:10:00Z"
}
```

---

## 5. MCP Server

The MCP (Model Context Protocol) server allows any MCP-compatible agent to use LetPay.

### 5.1 Tools Exposed

```typescript
// Tool: letpay_balance
// Description: Check the current balance of your LetPay wallet
{
  name: "letpay_balance",
  parameters: {
    wallet_id: { type: "string", description: "Wallet ID (optional, uses default)" }
  },
  returns: {
    balance_cents: number,
    currency: string,
    monthly_spent_cents: number,
    monthly_limit_cents: number
  }
}

// Tool: letpay_pay
// Description: Request a payment through your LetPay wallet
{
  name: "letpay_pay",
  parameters: {
    amount_cents: { type: "number", description: "Amount in cents (e.g., 1499 = €14.99)" },
    currency: { type: "string", default: "eur" },
    merchant: { type: "string", description: "Who you're paying" },
    reason: { type: "string", description: "Why you need to pay (shown to user for approval)" }
  },
  returns: {
    status: "approved" | "pending_approval" | "declined",
    card_number?: string,     // Only if approved
    card_expiry?: string,     // Only if approved
    card_cvc?: string,        // Only if approved
    decline_reason?: string
  }
}

// Tool: letpay_history
// Description: View recent transactions
{
  name: "letpay_history",
  parameters: {
    days: { type: "number", default: 7 },
    limit: { type: "number", default: 10 }
  },
  returns: {
    transactions: Array<{
      amount_cents: number,
      merchant: string,
      status: string,
      created_at: string
    }>
  }
}

// Tool: letpay_request_topup
// Description: Ask the user to add more funds to the wallet
{
  name: "letpay_request_topup",
  parameters: {
    suggested_amount_cents: { type: "number" },
    reason: { type: "string", description: "Why more funds are needed" }
  },
  returns: {
    status: "requested",
    message: string    // "User has been notified to top up"
  }
}
```

### 5.2 MCP Server Config

```json
// openclaw.json
{
  "mcpServers": {
    "letpay": {
      "command": "npx",
      "args": ["@letpay/mcp-server"],
      "env": {
        "LETPAY_API_KEY": "lp_sk_..."
      }
    }
  }
}
```

---

## 6. OpenClaw Skill

```yaml
# SKILL.md frontmatter
---
name: letpay
description: "Let your AI agent pay. Check balance, make payments, view transaction history via LetPay virtual cards."
tools: ["letpay_balance", "letpay_pay", "letpay_history", "letpay_request_topup"]
---
```

The skill instructs the agent:
1. Before any purchase, always call `letpay_balance` to check funds
2. Always provide a clear `reason` when calling `letpay_pay`
3. If balance is low, call `letpay_request_topup` with explanation
4. Never store or log card details — use them immediately and discard
5. If a payment is declined, inform the user with the reason
6. Prefer smaller purchases; split large ones when possible

---

## 7. Telegram Bot (Notifications + Approvals)

### 7.1 Notification Messages

**Transaction approved (auto):**
```
💳 LetPay Transaction

✅ €14.99 at OpenAI
Agent reason: "GPT-4 API credits for code review task"

Balance: €85.01 / €100.00 monthly limit
```

**Approval request:**
```
🔔 LetPay — Approval Needed

Your agent wants to spend €49.99 at Amazon
Reason: "Buying USB-C cables for home office setup"

Monthly spend so far: €50.01 / €100.00

[✅ Approve]  [❌ Deny]

⏰ Auto-denies in 5 minutes
```

**Low balance alert:**
```
⚠️ LetPay — Low Balance

Your agent wallet "Work Agent" has €3.21 remaining.
Monthly limit: €100.00 | Spent: €96.79

[💰 Top Up €50]  [💰 Top Up €100]
```

### 7.2 Bot Commands

```
/balance       — Check all wallet balances
/freeze        — Freeze all wallets (emergency)
/unfreeze      — Unfreeze wallets
/history       — Recent transactions
/limits        — View/edit spending limits
/link          — Link Telegram to LetPay account
```

---

## 8. Security Model

### 8.1 Card Detail Handling

```
NEVER store PAN/CVC in our database.

Flow:
1. Agent calls letpay_pay → approved
2. API creates Stripe Ephemeral Key (60-second TTL)
3. Agent receives card details via Stripe.js / direct API
4. Agent uses card at checkout
5. Card details expire / are not persisted

For MCP (where browser isn't available):
- API returns card details directly over encrypted MCP channel
- MCP server holds details in memory only
- Details are wiped after single use or 60-second timeout
```

### 8.2 Authentication Layers

| Layer | Method |
|---|---|
| User → Dashboard | Supabase Auth (email/password + passkeys) |
| User → Telegram Bot | One-time link code (6 digits) |
| Agent → MCP Server | API key (stored in env, never in agent memory) |
| Agent → REST API | API key with scoped permissions |
| Stripe → LetPay | Webhook signature verification |
| LetPay → Stripe | Secret key (server-side only) |

### 8.3 Rate Limits

| Endpoint | Limit |
|---|---|
| `POST /agent/pay` | 10 requests/minute per wallet |
| `POST /wallets/:id/card` | 5 requests/minute per wallet |
| `GET /agent/balance` | 30 requests/minute per wallet |
| Webhook processing | No limit (Stripe-controlled) |

### 8.4 Default Blocked MCCs

```
7995  — Betting/casino gambling
7994  — Video game arcades
5933  — Pawn shops
5966  — Direct marketing — outbound telemarketing
5967  — Direct marketing — inbound telemarketing
6051  — Non-financial institutions — foreign currency
6211  — Security brokers/dealers
6012  — Financial institutions — merchandise and services
```

---

## 9. Deployment

### 9.1 Infrastructure

```
┌─────────────────────────────┐
│  Vercel                     │
│  ├── apps/web (Next.js)     │
│  └── Edge Functions         │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Railway / Fly.io           │
│  ├── apps/api (Hono)        │  ← Needs long-running for webhooks
│  └── apps/telegram-bot      │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Supabase                   │
│  ├── Postgres database      │
│  ├── Auth                   │
│  ├── Realtime (dashboard)   │
│  └── Storage (receipts)     │
└─────────────────────────────┘

┌─────────────────────────────┐
│  npm Registry               │
│  ├── @letpay/mcp-server     │
│  └── @letpay/agent (skill)  │
└─────────────────────────────┘
```

### 9.2 Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ISSUING_WEBHOOK_SECRET=whsec_...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC...

# App
API_URL=https://api.letpay.ai
WEB_URL=https://letpay.ai
ENCRYPTION_KEY=...  # For API key encryption at rest
```

---

## 10. MVP Scope & Timeline

### Week 1-2: Foundation
- [ ] Turborepo setup with all packages
- [ ] Supabase project + schema migration
- [ ] Stripe Connect onboarding flow (test mode)
- [ ] Stripe Issuing — create cardholder + virtual card
- [ ] Fund wallet via Stripe Payment Intent
- [ ] Basic REST API (Hono): wallets, balance, topup

### Week 3-4: Agent Integration
- [ ] MCP server: `letpay_balance`, `letpay_pay`, `letpay_history`
- [ ] OpenClaw skill: SKILL.md + scripts
- [ ] Stripe Issuing authorization webhook (approve/decline logic)
- [ ] Spending rules engine (limits, MCC blocking)
- [ ] Telegram bot: transaction notifications

### Week 5-6: Dashboard + Polish
- [ ] Next.js dashboard: signup, wallets, transactions, rules
- [ ] Telegram bot: approval flow (inline buttons)
- [ ] Human approval flow: request → Telegram → approve/deny → release card
- [ ] Low balance alerts
- [ ] Publish @letpay/mcp-server to npm
- [ ] Publish skill to ClawHub
- [ ] Landing page (letpay.ai)

### Post-MVP
- [ ] Passkey authentication
- [ ] Multi-wallet support
- [ ] Team accounts
- [ ] B2B API + docs
- [ ] Analytics dashboard (spending patterns, categories)
- [ ] Receipt/invoice storage
- [ ] US entity for US card issuing

---

## 11. Cost Estimates (Running)

| Service | Monthly Cost (at 1,000 users) |
|---|---|
| Supabase (Pro) | $25 |
| Vercel (Pro) | $20 |
| Railway (API + bot) | $20 |
| Stripe fees | Pass-through to users |
| Domain (letpay.ai) | ~$6/mo amortized |
| **Total infra** | **~$71/month** |

Revenue at 1,000 users (500 free, 400 Pro, 100 Business):
- Subscriptions: (400 × €9.99) + (100 × €29.99) = **€6,995/mo**
- Transaction markup: ~€750/mo (est. 0.5% on €150K volume)
- **Total: ~€7,745/mo**

**Margin: ~99% at this stage** (infra costs are negligible vs. revenue)

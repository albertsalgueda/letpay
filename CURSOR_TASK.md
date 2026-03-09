# Cursor Task: Complete LetPay MVP

## STEP 1: Read these files thoroughly before doing anything

- README.md
- docs/TECHNICAL_SPEC.md  
- packages/core/src/cards/interface.ts
- packages/core/src/cards/mock.ts
- packages/core/src/payments/interface.ts
- packages/core/src/payments/mock.ts
- packages/core/src/rules/engine.ts
- packages/core/src/services/authorization.service.ts
- packages/core/src/services/wallet.service.ts
- packages/core/src/services/approval.service.ts
- packages/core/src/index.ts
- packages/db/src/schema/ (all files)
- apps/api/src/app.ts and apps/api/src/deps.ts
- apps/api/src/routes/agent.ts
- apps/api/src/routes/webhooks.ts
- apps/api/src/middleware/auth.ts
- packages/mcp-server/src/server.ts
- packages/mcp-server/src/tools/pay.ts
- apps/web/src/app/page.tsx
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/lib/api-client.ts
- docker-compose.yml, turbo.json, package.json, .env.example

## STEP 2: Implement ALL of the following

Work methodically. Commit after each major phase. Git user is already configured.

### PHASE A: Stripe Payment Integration

- Implement real Stripe PaymentIntents in `packages/core/src/payments/` (mock exists, create `stripe.ts` implementation of the interface)
- Handle wallet top-ups via Stripe checkout sessions
- Stripe webhook handler for `payment_intent.succeeded` to credit wallet balance
- Keep `USE_MOCKS=true` flag so everything works without real keys
- Ensure the mock payment service still works for local dev

### PHASE B: Supabase Auth

- Wire up real Supabase client in `packages/db/src/client.ts`
- Update `apps/api` auth middleware to validate real Supabase JWTs (with mock fallback when USE_MOCKS=true)
- Add Supabase Auth to `apps/web`: login with email/password, signup, session management
- Protect all `/dashboard` routes (redirect to `/login` if not authenticated)
- Add auth context/provider in the web app
- Ensure mock auth still works for local dev without Supabase

### PHASE C: Web Dashboard (apps/web)

Make every page functional and polished with Tailwind CSS. Clean, modern, minimal design.

- **Landing page (/)** — Hero section with tagline "Let your AI agent pay", features grid (6 features from README), pricing hint, CTA button, footer
- **/login and /signup** — Centered card with form, error handling, link between them
- **/dashboard** — Overview cards (total balance across wallets, wallet count, monthly spend, pending approvals), recent transactions table (5 most recent)
- **/dashboard/wallets** — Grid/list of wallets showing name, balance, status badge, card last4. "Create Wallet" button
- **/dashboard/wallets/[id]** — Wallet detail page: balance display, card info (masked PAN), recent transactions, spending rules editor (monthly limit, per-tx limit, approval threshold, MCC blocklist), freeze/unfreeze toggle
- **/dashboard/wallets/new** — Create wallet form (name, initial funding amount)
- **/dashboard/transactions** — Full paginated transactions table with columns: date, merchant, amount, status badge, wallet name. Filter by wallet
- **/dashboard/approvals** — Pending approvals with merchant, amount, agent reason, approve/deny buttons. Show resolved approvals too
- **/dashboard/settings** — API key management: list keys (masked), create new key, copy to clipboard, revoke
- **Sidebar** should highlight active route, show wallet count badge
- Use fetch to call the API via the existing api-client.ts (extend as needed)
- Responsive design (mobile-friendly sidebar collapse)

### PHASE D: Telegram Bot

- Create `apps/telegram-bot/` package from scratch
- Add to pnpm-workspace.yaml and turbo.json  
- Use `grammy` library (lightweight, TypeScript-native)
- Features:
  - Transaction notification messages (formatted with emoji, amount, merchant, balance remaining)
  - Approval request with inline keyboard buttons (Approve / Deny)  
  - Handle callback queries for approval responses
  - Low balance alerts
  - Commands: /start, /balance, /freeze, /unfreeze, /history, /link
  - /link generates a 6-digit code to connect Telegram user to LetPay account
- Add telegram_chat_id column to users table (new migration)
- Add notification service implementation that sends via Telegram
- Ensure bot works with USE_MOCKS=true

### PHASE E: Integration & Polish

- Ensure end-to-end flow works with mocks:
  1. User signs up (web or mock)
  2. Creates wallet (gets mock virtual card)
  3. Agent calls MCP `letpay_pay` tool
  4. Rules engine evaluates
  5. If approved: card details returned to agent
  6. If needs approval: Telegram notification sent, user approves via inline button
  7. Transaction recorded, notification sent
  8. Dashboard shows everything
- Update docker-compose.yml to include all services (postgres, api, web, telegram-bot)
- Ensure `pnpm build` passes for all packages
- Ensure `pnpm test` passes for all packages (add tests for new code)
- Update README.md roadmap checkboxes

### PHASE F: Final

- Run `pnpm build && pnpm test`
- Fix any failures
- `git add -A && git commit -m "Complete MVP: Stripe integration, Supabase auth, web dashboard, Telegram bot, e2e flow" && git push origin main`

## CONSTRAINTS

- TypeScript everywhere
- Keep the dependency injection / interface pattern throughout
- pnpm workspaces + turborepo
- Hono for API, Next.js 15 for web, grammy for Telegram
- Drizzle ORM for database
- Everything must work with USE_MOCKS=true (no real API keys needed)
- Do NOT delete or break existing working tests
- Commit after each phase completes

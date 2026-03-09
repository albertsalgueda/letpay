export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InsufficientFundsError extends DomainError {
  constructor(balanceCents: number, requiredCents: number) {
    super(
      `Insufficient funds: balance ${balanceCents} cents, required ${requiredCents} cents`,
      'INSUFFICIENT_FUNDS',
      402,
    );
  }
}

export class WalletFrozenError extends DomainError {
  constructor(walletId: string) {
    super(`Wallet ${walletId} is frozen`, 'WALLET_FROZEN', 403);
  }
}

export class WalletNotFoundError extends DomainError {
  constructor(walletId: string) {
    super(`Wallet ${walletId} not found`, 'WALLET_NOT_FOUND', 404);
  }
}

export class RuleDeniedError extends DomainError {
  constructor(reason: string) {
    super(`Transaction denied: ${reason}`, 'RULE_DENIED', 403);
  }
}

export class ApprovalRequiredError extends DomainError {
  constructor(
    public readonly approvalRequestId: string,
    reason: string,
  ) {
    super(`Approval required: ${reason}`, 'APPROVAL_REQUIRED', 202);
  }
}

export class ApprovalExpiredError extends DomainError {
  constructor(approvalId: string) {
    super(`Approval request ${approvalId} has expired`, 'APPROVAL_EXPIRED', 410);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class RateLimitError extends DomainError {
  constructor(retryAfterSeconds: number) {
    super(`Rate limit exceeded. Retry after ${retryAfterSeconds}s`, 'RATE_LIMITED', 429);
  }
}

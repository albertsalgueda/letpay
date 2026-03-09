const linkCodes = new Map<string, { userId: string; expiresAt: number }>();

export function generateLinkCode(userId: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  linkCodes.set(code, { userId, expiresAt: Date.now() + 10 * 60 * 1000 });
  return code;
}

export function consumeLinkCode(code: string): string | null {
  const entry = linkCodes.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    linkCodes.delete(code);
    return null;
  }
  linkCodes.delete(code);
  return entry.userId;
}

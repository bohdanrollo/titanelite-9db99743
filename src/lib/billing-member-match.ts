export type BillingMember = { id: string; email: string | null };

/** Metadata and stored customer bindings take precedence; ambiguity is never guessed. */
export function matchBillingMember(
  members: BillingMember[],
  metadataIds: (string | null | undefined)[],
  boundIds: string[],
  email: string | null | undefined,
): string | null {
  const validIds = new Set(members.map((member) => member.id));
  const explicit = [...new Set([...metadataIds, ...boundIds].filter(
    (id): id is string => !!id && validIds.has(id),
  ))];
  if (explicit.length) return explicit.length === 1 ? explicit[0] : null;
  // Unknown metadata must not silently fall through to a different account.
  if (metadataIds.some(Boolean) || boundIds.length) return null;
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  const matches = members.filter((member) => member.email?.trim().toLowerCase() === normalized);
  return matches.length === 1 ? matches[0].id : null;
}
import { resolveMx } from "node:dns/promises";

/** Vrai si le domaine peut recevoir des e-mails. En cas de lenteur ou de panne DNS on laisse passer (jamais bloquer un vrai artisan à tort). */
export async function domainCanReceiveMail(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || !domain.includes(".")) return false;
  try {
    const mx = await Promise.race([
      resolveMx(domain),
      new Promise<null>((r) => setTimeout(() => r(null), 2500)),
    ]);
    if (mx === null) return true;
    return mx.length > 0;
  } catch (e) {
    const code = (e as { code?: string }).code;
    return !(code === "ENOTFOUND" || code === "ENODATA");
  }
}

/** Les domaines jetables sont refusés par la base elle-même ; ce test sert à afficher un message clair. */
export function isDisposableError(msg: string): boolean {
  return /email_jetable|database error saving new user/i.test(msg);
}

/** Empreinte (SHA-256 salée) du numéro de pièce : on ne stocke jamais le numéro lui-même. */
import { createHmac } from "node:crypto";
export function documentHash(docType: string, number: string): { hash: string; last4: string } | null {
  const clean = number.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length < 5 || clean.length > 30) return null;
  const secret = process.env.IDENTITY_HASH_SECRET || process.env.CRON_SECRET || process.env.UNSUBSCRIBE_SECRET || "bricolo-dev";
  const hash = createHmac("sha256", secret).update(clean).digest("hex"); // même numéro = même empreinte, quel que soit le type de pièce
  void docType;
  return { hash, last4: clean.slice(-4) };
}

export async function ipHash(headers: Headers): Promise<string | null> {
  const ip = (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || headers.get("x-real-ip");
  if (!ip) return null;
  const secret = process.env.CRON_SECRET || process.env.UNSUBSCRIBE_SECRET || "bricolo-dev";
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}

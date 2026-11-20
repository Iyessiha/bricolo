import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
import { tooMany } from "@/lib/rate-limit";
import { turnstileOk, turnstileEnabled } from "@/lib/turnstile";

describe("limite de requêtes", () => {
  it("laisse passer jusqu'au maximum puis bloque", () => {
    const k = "t:" + Math.random();
    for (let i = 0; i < 3; i++) expect(tooMany(k, 3, 60_000)).toBe(false);
    expect(tooMany(k, 3, 60_000)).toBe(true);
  });
  it("les clés sont indépendantes", () => { const a = "a:" + Math.random(); for (let i = 0; i < 5; i++) tooMany(a, 2, 60_000); expect(tooMany("b:" + Math.random(), 2, 60_000)).toBe(false); });
  it("la fenêtre se libère avec le temps", () => {
    vi.useFakeTimers(); const k = "w:" + Math.random();
    tooMany(k, 1, 1000); expect(tooMany(k, 1, 1000)).toBe(true);
    vi.advanceTimersByTime(1500); expect(tooMany(k, 1, 1000)).toBe(false); vi.useRealTimers();
  });
});

describe("Turnstile", () => {
  const fd = (t?: string) => { const f = new FormData(); if (t) f.set("cf-turnstile-response", t); return f; };
  afterEach(() => { delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY; delete process.env.TURNSTILE_SECRET_KEY; vi.restoreAllMocks(); });
  it("sans clés : la vérification est ignorée", async () => { expect(turnstileEnabled()).toBe(false); expect(await turnstileOk(fd())).toBe(true); });
  describe("avec clés", () => {
    beforeEach(() => { process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "s"; process.env.TURNSTILE_SECRET_KEY = "k"; });
    it("refuse sans jeton", async () => expect(await turnstileOk(fd())).toBe(false));
    it("accepte quand Cloudflare valide", async () => { vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true })))); expect(await turnstileOk(fd("tok"))).toBe(true); });
    it("refuse quand Cloudflare invalide", async () => { vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false })))); expect(await turnstileOk(fd("tok"))).toBe(false); });
    it("ne bloque pas les vrais utilisateurs si Cloudflare est injoignable", async () => { vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("réseau"); })); expect(await turnstileOk(fd("tok"))).toBe(true); });
  });
});

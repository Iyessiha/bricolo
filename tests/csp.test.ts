import { describe, it, expect } from "vitest";
import { buildCsp } from "@/lib/csp";

describe("politique de sécurité des contenus", () => {
  const prod = buildCsp({ supabaseUrl: "https://abc.supabase.co", dev: false, extraHosts: ["pixel.exemple.com"] });
  it("interdit l'intégration du site dans un cadre et les objets", () => { expect(prod).toContain("frame-ancestors 'none'"); expect(prod).toContain("object-src 'none'"); });
  it("pas d'évaluation de code en production", () => expect(prod).not.toContain("'unsafe-eval'"));
  it("autorise Supabase et le domaine ajouté", () => { expect(prod).toContain("https://abc.supabase.co"); expect(prod).toContain("https://pixel.exemple.com"); });
  it("autorise Cloudflare Turnstile", () => { expect(prod).toContain("script-src"); expect(prod.match(/challenges\.cloudflare\.com/g)?.length).toBeGreaterThanOrEqual(3); });
  it("autorise Google Analytics et Google Ads (collecte, conversions, Google du pays)", () => {
    expect(prod).toMatch(/connect-src[^;]*https:\/\/analytics\.google\.com\b/);
    expect(prod).toMatch(/script-src[^;]*https:\/\/googleads\.g\.doubleclick\.net/);
    expect(prod).toMatch(/img-src[^;]*https:\/\/www\.google\.ci/);
  });
  it("autorise l'évaluation en développement seulement", () => expect(buildCsp({ dev: true })).toContain("'unsafe-eval'"));
});

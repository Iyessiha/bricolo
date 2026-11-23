import { describe, expect, it } from "vitest";
import { composeHeadline } from "@/lib/compose";

describe("composeHeadline", () => {
  it("accepte un verbe à l'infinitif et normalise", () => {
    expect(composeHeadline("Réparer votre climatiseur")).toEqual({ ok: true, value: "Je vais réparer votre climatiseur" });
    expect(composeHeadline("je vais  peindre votre maison")).toEqual({ ok: true, value: "Je vais peindre votre maison" });
    expect(composeHeadline("faire mon travail avec soin")).toMatchObject({ ok: true });
  });
  it("refuse les fautes courantes", () => {
    for (const bad of ["réparé votre portail", "je suis un professionnel", "vous satisfait pleinement", "meuble de menuiserie", "le revêtement de votre bâtiment"]) {
      expect(composeHeadline(bad).ok).toBe(false);
    }
  });
  it("refuse trop court ou trop long", () => {
    expect(composeHeadline("peindre").ok).toBe(false);
    expect(composeHeadline("réparer " + "x".repeat(70)).ok).toBe(false);
  });
});

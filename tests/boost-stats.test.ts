import { describe, it, expect } from "vitest";
import { liftPct } from "@/lib/boost-stats";

describe("liftPct", () => {
  it("calcule la variation en %", () => { expect(liftPct(10, 15)).toBe(50); expect(liftPct(10, 5)).toBe(-50); });
  it("refuse de conclure avec trop peu de données", () => { expect(liftPct(1, 2)).toBeNull(); });
  it("ne calcule pas de pourcentage sans base de comparaison", () => { expect(liftPct(0, 12)).toBeNull(); });
});

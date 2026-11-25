import { describe, it, expect } from "vitest";
import { countryToSet } from "@/lib/country-detect";

describe("détection du pays", () => {
  it("prend le pays de la connexion au premier passage", () => expect(countryToSet({ geo: "BF" })).toBe("bf"));
  it("ignore un pays hors des 7", () => expect(countryToSet({ geo: "FR" })).toBeNull());
  it("ne change pas un choix déjà fait", () => expect(countryToSet({ cookie: "sn", geo: "BF" })).toBeNull());
  it("?pays= est prioritaire sur le cookie et la connexion", () => expect(countryToSet({ param: "ml", cookie: "ci", geo: "BF" })).toBe("ml"));
  it("?pays= identique au cookie : rien à faire", () => expect(countryToSet({ param: "bf", cookie: "bf" })).toBeNull());
  it("?pays= invalide est ignoré", () => expect(countryToSet({ param: "xx", geo: "TG" })).toBe("tg"));
  it("sans information : null (Côte d’Ivoire par défaut)", () => expect(countryToSet({})).toBeNull());
});

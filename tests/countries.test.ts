import { describe, it, expect } from "vitest";
import { COUNTRIES, isCountry, countryName } from "@/lib/countries";

describe("pays", () => {
  it("couvre les 7 pays de la zone", () => expect(COUNTRIES.map((c) => c.code).sort()).toEqual(["bf", "bj", "ci", "ml", "ne", "sn", "tg"]));
  it("refuse un code inconnu ou non textuel", () => { expect(isCountry("fr")).toBe(false); expect(isCountry(undefined)).toBe(false); expect(isCountry("ci")).toBe(true); });
  it("nom lisible", () => expect(countryName("sn")).toBe("Sénégal"));
});

import { describe, it, expect } from "vitest";
import { normalizePhone } from "@/lib/phone";

describe("numéros de téléphone", () => {
  it("ajoute l'indicatif du pays à un numéro local", () => expect(normalizePhone("07 00 00 00 00", "+225")).toBe("225070000000".slice(0, 3) + "0700000000"));
  it("garde un numéro déjà international", () => { expect(normalizePhone("+221 77 123 45 67", "+225")).toBe("221771234567"); expect(normalizePhone("00221771234567", "+225")).toBe("221771234567"); });
  it("refuse un numéro trop court ou vide", () => { expect(normalizePhone("123", "+225")).toBeNull(); expect(normalizePhone("", "+225")).toBeNull(); });
});

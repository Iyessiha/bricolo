import { describe, it, expect } from "vitest";
import { findContact, contactError } from "../src/lib/contact-guard";

describe("findContact", () => {
  it("repère les numéros de téléphone", () => {
    expect(findContact("56204365")).toBe("telephone");
    expect(findContact("Appelez le 07 08 09 10 11")).toBe("telephone");
    expect(findContact("whatsapp +226 56 20 43 65")).toBe("telephone");
    expect(findContact("01.02.03.04.05")).toBe("telephone");
    expect(findContact("0708091011")).toBe("telephone");
  });
  it("laisse passer les prix et les années", () => {
    expect(findContact("Dès 50 000 FCFA par pièce")).toBeNull();
    expect(findContact("Maison clé en main 10 000 000 FCFA")).toBeNull();
    expect(findContact("10000000 FCFA")).toBeNull();
    expect(findContact("Depuis 2015, plus de 120 chantiers, 3 équipes")).toBeNull();
    expect(findContact("")).toBeNull();
  });
  it("repère e-mails et liens de messagerie", () => {
    expect(findContact("écrivez à moi@exemple.com")).toBe("email");
    expect(findContact("wa.me/22656204365")).toBe("lien");
  });
});
describe("contactError", () => {
  it("nomme le champ fautif", () => {
    expect(contactError({ "Présentation": "ok", "Promesse": "appel 56204365" })).toMatch(/^Promesse/);
    expect(contactError({ "Présentation": "Bonjour" })).toBeNull();
  });
});

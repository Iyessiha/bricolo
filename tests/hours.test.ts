import { describe, it, expect } from "vitest";
import { cleanHours, openStatus } from "@/lib/hours";

describe("cleanHours", () => {
  it("garde les horaires valides et rejette les autres", () => {
    expect(cleanHours({ "1": ["08:00", "17:00"], "2": ["18:00", "09:00"], "3": ["8h", "12h"], "9": ["08:00", "10:00"] })).toEqual({ "1": ["08:00", "17:00"] });
  });
  it("ignore les entrées qui ne sont pas un objet", () => {
    expect(cleanHours(null)).toEqual({});
    expect(cleanHours("x")).toEqual({});
  });
});

describe("openStatus", () => {
  it("24 h/24", () => expect(openStatus({}, true, "ci").state).toBe("open"));
  it("sans horaires : aucun statut", () => expect(openStatus({}, false, "ci").state).toBe("none"));
  it("ouvert un lundi à 10 h (Abidjan)", () => {
    const monday10 = new Date("2026-11-16T10:00:00Z"); // lundi
    expect(openStatus({ "1": ["08:00", "17:00"] }, false, "ci", monday10).state).toBe("open");
  });
  it("fermé un lundi à 20 h", () => {
    expect(openStatus({ "1": ["08:00", "17:00"] }, false, "ci", new Date("2026-11-16T20:00:00Z")).state).toBe("closed");
  });
  it("tient compte du décalage d'une heure au Bénin", () => {
    // 16h30 UTC = 17h30 à Cotonou : déjà fermé, alors qu'à Abidjan c'est encore ouvert
    const t = new Date("2026-11-16T16:30:00Z");
    expect(openStatus({ "1": ["08:00", "17:00"] }, false, "ci", t).state).toBe("open");
    expect(openStatus({ "1": ["08:00", "17:00"] }, false, "bj", t).state).toBe("closed");
  });
});

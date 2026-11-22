import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { verifySignature, parseWebhook, isLive, isMock, paymentsOpen } from "@/lib/geniuspay";

const SECRET = "whsec_test";
const sign = (ts: string, body: string) => createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
const now = () => String(Math.floor(Date.now() / 1000));

describe("webhook GeniusPay : signature", () => {
  beforeEach(() => { process.env.GENIUSPAY_WEBHOOK_SECRET = SECRET; });
  afterEach(() => { delete process.env.GENIUSPAY_WEBHOOK_SECRET; });
  it("accepte une signature valide", () => { const ts = now(), b = '{"a":1}'; expect(verifySignature(b, sign(ts, b), ts)).toBe(true); });
  it("accepte le préfixe sha256=", () => { const ts = now(), b = "{}"; expect(verifySignature(b, `sha256=${sign(ts, b)}`, ts)).toBe(true); });
  it("refuse un corps modifié", () => { const ts = now(); expect(verifySignature('{"a":2}', sign(ts, '{"a":1}'), ts)).toBe(false); });
  it("refuse un envoi trop ancien (rejeu)", () => { const ts = String(Math.floor(Date.now() / 1000) - 3600), b = "{}"; expect(verifySignature(b, sign(ts, b), ts)).toBe(false); });
  it("refuse sans en-têtes", () => { expect(verifySignature("{}", null, now())).toBe(false); expect(verifySignature("{}", "x", null)).toBe(false); });
  it("refuse si aucun secret n'est configuré", () => { delete process.env.GENIUSPAY_WEBHOOK_SECRET; const ts = now(); expect(verifySignature("{}", sign(ts, "{}"), ts)).toBe(false); });
});

describe("webhook GeniusPay : lecture", () => {
  it("active un achat seulement sur payment.success + completed", () => {
    expect(parseWebhook({ event: "payment.success", data: { status: "completed", amount: 2000, metadata: { reference: "r1" } } })).toEqual({ reference: "r1", paid: true, failed: false, amount: 2000 });
  });
  it("ne marque pas payé un paiement en attente ou échoué", () => {
    expect(parseWebhook({ event: "payment.success", data: { status: "pending", metadata: { reference: "r1" } } })?.paid).toBe(false);
    expect(parseWebhook({ event: "payment.failed", data: { status: "completed", metadata: { reference: "r1" } } })?.paid).toBe(false);
  });
  it("ignore une notification sans référence", () => expect(parseWebhook({ event: "payment.success", data: {} })).toBeNull());
});

describe("ouverture des paiements", () => {
  const save = { m: process.env.GENIUSPAY_MODE, v: process.env.VERCEL_ENV };
  afterEach(() => { process.env.GENIUSPAY_MODE = save.m; if (save.m === undefined) delete process.env.GENIUSPAY_MODE; process.env.VERCEL_ENV = save.v; if (save.v === undefined) delete process.env.VERCEL_ENV; });
  it("accepte live avec majuscules et espaces", () => { process.env.GENIUSPAY_MODE = " Live "; expect(isLive()).toBe(true); expect(paymentsOpen()).toBe(true); });
  it("accepte sandbox et test comme synonymes de live", () => { for (const m of ["sandbox", "TEST"]) { process.env.GENIUSPAY_MODE = m; expect(isLive()).toBe(true); } });
  it("ferme sans variable", () => { delete process.env.GENIUSPAY_MODE; expect(paymentsOpen()).toBe(false); });
  it("le paiement simulé reste interdit en production", () => { process.env.GENIUSPAY_MODE = "mock"; process.env.VERCEL_ENV = "production"; expect(isMock()).toBe(false); expect(paymentsOpen()).toBe(false); });
  it("le paiement simulé fonctionne hors production", () => { process.env.GENIUSPAY_MODE = "mock"; process.env.VERCEL_ENV = "preview"; expect(isMock()).toBe(true); });
});

describe("paiements refusés ou annulés", () => {
  const base = { data: { metadata: { reference: "bricolo_x" }, amount: 500 } };
  it("reconnaît un échec", () => {
    expect(parseWebhook({ event: "payment.failed", data: { ...base.data, status: "failed" } })).toMatchObject({ paid: false, failed: true });
    expect(parseWebhook({ event: "payment.cancelled", data: base.data })).toMatchObject({ failed: true });
    expect(parseWebhook({ event: "payment.updated", data: { ...base.data, status: "expired" } })).toMatchObject({ failed: true });
  });
  it("un succès n'est jamais un échec", () => {
    expect(parseWebhook({ event: "payment.success", data: { ...base.data, status: "completed" } })).toMatchObject({ paid: true, failed: false });
  });
  it("un paiement en cours n'est ni payé ni échoué", () => {
    expect(parseWebhook({ event: "payment.created", data: { ...base.data, status: "pending" } })).toMatchObject({ paid: false, failed: false });
  });
});

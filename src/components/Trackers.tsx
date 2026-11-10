"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { src?: string; code?: string };
type Ids = { ga4?: string; ads?: string; gtm?: string; meta?: string; tiktok?: string; custom?: Item[] };
const KEY = "bricolo_consent";
declare global { interface Window { dataLayer: any[]; gtag: (...a: any[]) => void; fbq: any; _fbq: any; ttq: any; TiktokAnalyticsObject: string } }

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* navigation privée : le choix vaut pour cette visite */ } };
const add = (src: string) => { const s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); };

function load(ids: Ids) {
  window.dataLayer = window.dataLayer || [];
  if (ids.gtm) {
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    add(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(ids.gtm)}`);
  }
  if (ids.ga4 || ids.ads) {
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    if (ids.ga4) window.gtag("config", ids.ga4, { send_page_view: false });
    if (ids.ads) window.gtag("config", ids.ads);
    add(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent((ids.ga4 || ids.ads)!)}`);
  }
  if (ids.meta) {
    const n: any = (window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    add("https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", ids.meta);
  }
  for (const it of ids.custom ?? []) {
    const el = document.createElement("script");
    if (it.src) { el.src = it.src; el.async = true; }
    if (it.code) el.text = it.code;
    document.head.appendChild(el);
  }
  if (ids.tiktok) {
    window.TiktokAnalyticsObject = "ttq";
    const t: any = (window.ttq = window.ttq || []);
    t.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
    t.setAndDefer = (o: any, m: string) => { o[m] = function () { o.push([m].concat(Array.prototype.slice.call(arguments, 0))); }; };
    t.methods.forEach((m: string) => t.setAndDefer(t, m));
    t.load = (id: string) => {
      t._i = t._i || {}; t._i[id] = []; t._i[id]._u = "https://analytics.tiktok.com/i18n/pixel/events.js";
      t._t = t._t || {}; t._t[id] = +new Date(); t._o = t._o || {}; t._o[id] = {};
      add(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`);
    };
    t.load(ids.tiktok);
  }
}

function pageview(ids: Ids, path: string) {
  if (ids.gtm) window.dataLayer?.push({ event: "virtual_page_view", page_path: path, page_location: location.href, page_title: document.title });
  if (ids.ga4 || ids.ads) window.gtag?.("event", "page_view", { page_path: path, page_location: location.href, page_title: document.title });
  if (ids.meta) window.fbq?.("track", "PageView");
  if (ids.tiktok) window.ttq?.page?.();
}

/** Mesure d'audience et pixels publicitaires : rien n'est chargé tant que le visiteur n'a pas dit oui. Sans aucun identifiant configuré, ce composant n'affiche rien. */
export default function Trackers(ids: Ids) {
  const any = Boolean(ids.ga4 || ids.ads || ids.gtm || ids.meta || ids.tiktok || ids.custom?.length);
  const [choice, setChoice] = useState<string | null | undefined>(undefined);
  const path = usePathname();
  const started = useRef(false);
  const idsRef = useRef(ids); idsRef.current = ids;

  useEffect(() => { setChoice(read()); }, []);

  useEffect(() => {
    if (!any || choice !== "oui" || started.current) return;
    started.current = true; load(idsRef.current);
  }, [any, choice]);

  useEffect(() => { if (started.current && choice === "oui") pageview(idsRef.current, path); }, [path, choice]);

  // Contact : un clic sur « Appeler » ou « WhatsApp » est la conversion la plus utile à mesurer.
  useEffect(() => {
    if (!any || choice !== "oui") return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      const href = a?.getAttribute("href") ?? "";
      if (!/^tel:|wa\.me|whatsapp/i.test(href)) return;
      const i = idsRef.current;
      if (i.gtm) window.dataLayer?.push({ event: "generate_lead", method: href.startsWith("tel:") ? "appel" : "whatsapp" });
      if (i.ga4 || i.ads) window.gtag?.("event", "generate_lead", { method: href.startsWith("tel:") ? "appel" : "whatsapp" });
      if (i.meta) window.fbq?.("track", "Contact");
      if (i.tiktok) window.ttq?.track?.("Contact");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [any, choice]);

  if (!any || choice !== null) return null;
  const pick = (v: "oui" | "non") => { write(v); setChoice(v); };
  return (
    <div className="consent" role="dialog" aria-label="Cookies de mesure d’audience">
      <p>Avec votre accord, nous utilisons des cookies de mesure d’audience et de publicité pour améliorer Bricolo. Les cookies indispensables restent actifs dans tous les cas. <Link href="/cookies">En savoir plus</Link></p>
      <div className="consent-btns">
        <button type="button" className="btn small" onClick={() => pick("non")}>Refuser</button>
        <button type="button" className="btn small primary" onClick={() => pick("oui")}>Accepter</button>
      </div>
    </div>
  );
}

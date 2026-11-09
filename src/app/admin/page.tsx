import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { COUNTRIES, countryName } from "@/lib/countries";
import { BOOST_TYPES, DURATIONS, fcfa, initials } from "@/lib/format";
import Flag from "@/components/Flag";
import SetupNotice from "@/components/SetupNotice";
import { savePrices, verifyArtisan } from "./actions";
import { signOut } from "../auth-actions";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const ago = (iso: string) => { const h = Math.floor((Date.now() - new Date(iso).getTime()) / 36e5); return h < 1 ? "à l’instant" : h < 48 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`; };
const STATUS = { pending: ["wait", "À valider"], approved: ["ok", "En ligne"], rejected: ["mute", "Refusé"] } as const;
const VUES = [["dossiers", "Dossiers"], ["artisans", "Artisans"], ["prix", "Prix et pays"]] as const;

export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: me } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/");

  const vue = VUES.some(([k]) => k === sp.vue) ? sp.vue! : "dossiers";
  const pays = COUNTRIES.some((c) => c.code === sp.pays) ? sp.pays! : "ci";
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();

  const count = (q: any) => q.then((r: any) => r.count ?? 0);
  const [nOnline, nRejected, nBoosts, nReq, { data: paid }, { data: all }, { data: dipl }] = await Promise.all([
    count(db.from("artisans").select("id", { count: "exact", head: true }).eq("status", "approved")),
    count(db.from("artisans").select("id", { count: "exact", head: true }).eq("status", "rejected")),
    count(db.from("boosts").select("id", { count: "exact", head: true }).eq("status", "active").gt("ends_at", new Date().toISOString())),
    count(db.from("service_requests").select("id", { count: "exact", head: true }).gte("created_at", since7)),
    db.from("payments").select("amount").eq("status", "paid"),
    db.from("artisans").select("id, name, country_code, status, verified, verification_requested, diploma_verified, experience_years, photo_url, created_at, trade:trades(name), identity:artisan_identity(status, submitted_at, doc_type)").order("created_at", { ascending: false }).limit(300),
    db.from("artisan_diplomas").select("id, artisan_id, title, submitted_at").eq("status", "pending").order("submitted_at"),
  ]);
  const rows = (all ?? []).map((a: any) => ({ ...a, identity: one(a.identity), trade: one(a.trade) }));
  const toReview = rows.filter((a) => a.status === "pending" && a.identity?.status === "pending").sort((a, b) => a.identity.submitted_at.localeCompare(b.identity.submitted_at));
  const incomplete = rows.filter((a) => a.status === "pending" && !a.identity);
  const toBadge = rows.filter((a) => a.status === "approved" && a.verification_requested && !a.verified);
  const revenue = (paid ?? []).reduce((s, p) => s + p.amount, 0);

  let list = rows;
  if (vue === "artisans") {
    const q = (sp.q ?? "").trim().toLowerCase(), st = sp.statut;
    list = rows.filter((a) => (!q || a.name.toLowerCase().includes(q)) && (!st || a.status === st) && (!sp.p || a.country_code === sp.p));
  }
  const { data: grid } = vue === "prix" ? await db.from("price_grid").select("id, boost_type, duration_hours, amount").eq("country_code", pays).order("boost_type").order("duration_hours") : { data: null };
  const countOf = (c: string) => rows.filter((a) => a.country_code === c && a.status === "approved").length;
  const artisanName = (id: string) => rows.find((a) => a.id === id)?.name ?? "Artisan";

  return (
    <section className="inner sec stack">
      <div className="sec-head" style={{ margin: 0 }}>
        <div><p className="eyebrow">Back-office</p><h1 style={{ fontSize: "clamp(26px,4.5vw,38px)" }}>Administration</h1></div>
        <div className="row"><a className="btn small" href="/admin/campagnes">Campagnes e-mail</a><form action={signOut}><button className="btn small" type="submit">Se déconnecter</button></form></div>
      </div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}

      <div className="stats">
        <div className={`card stat${toReview.length ? " hot" : ""}`}><b>{toReview.length}</b><span>Dossiers à examiner</span></div>
        <div className="card stat"><b>{nOnline}</b><span>Artisans en ligne</span></div>
        <div className="card stat"><b>{incomplete.length}</b><span>Sans documents</span></div>
        <div className="card stat"><b>{nBoosts}</b><span>Boosts actifs</span></div>
        <div className="card stat"><b>{nReq}</b><span>Demandes, 7 jours</span></div>
        <div className="card stat"><b style={{ fontSize: 22 }}>{fcfa(revenue)}</b><span>Boosts encaissés</span></div>
      </div>

      <nav className="subnav" aria-label="Sections">
        {VUES.map(([k, t]) => <Link key={k} href={`/admin?vue=${k}`} aria-current={vue === k ? "page" : undefined} className={vue === k ? "on" : ""}>{t}{k === "dossiers" && toReview.length ? ` (${toReview.length})` : ""}</Link>)}
      </nav>

      {vue === "dossiers" && (
        <>
          <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Dossiers à examiner</h2>
            {toReview.length ? toReview.map((a) => (
              <Link key={a.id} href={`/admin/artisan/${a.id}`} className="arow">
                {a.photo_url ? <img className="curphoto" style={{ width: 48, height: 48 }} src={a.photo_url} alt="" /> : <span className="avatar">{initials(a.name)}</span>}
                <span style={{ minWidth: 0 }}><b>{a.name}</b><br /><span className="meta fl"><Flag code={a.country_code} size={16} />{a.trade?.name} · {countryName(a.country_code)} · reçu {ago(a.identity.submitted_at)}</span></span>
                <span className="btn small primary">Examiner</span>
              </Link>
            )) : <p className="empty">Aucun dossier en attente. 🎉</p>}
          </div>

          {!!dipl?.length && (
            <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Diplômes à vérifier</h2>
              {dipl.map((d) => <Link key={d.id} href={`/admin/artisan/${d.artisan_id}#diplomes`} className="arow"><span className="avatar">🎓</span><span><b>{d.title}</b><br /><span className="meta">{artisanName(d.artisan_id)} · {ago(d.submitted_at)}</span></span><span className="btn small">Examiner</span></Link>)}
            </div>
          )}

          {!!toBadge.length && (
            <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Demandes de badge Vérifié</h2>
              {toBadge.map((v) => (<form key={v.id} action={verifyArtisan} className="row"><input type="hidden" name="id" value={v.id} /><span>{v.name} · {countryName(v.country_code)}</span><button className="btn small primary">Accorder le badge</button></form>))}</div>
          )}

          {!!incomplete.length && (
            <details className="card pad"><summary><b>Profils sans documents ({incomplete.length})</b> <span className="meta">créés mais pas encore envoyés à vérification</span></summary>
              <div className="stack" style={{ marginTop: 12 }}>{incomplete.map((a) => <p key={a.id}>{a.name} <span className="meta">· {a.trade?.name} · {countryName(a.country_code)} · créé {ago(a.created_at)}</span></p>)}</div>
            </details>
          )}
        </>
      )}

      {vue === "artisans" && (
        <div className="card pad stack">
          <h2 style={{ fontSize: 20 }}>Artisans ({list.length})</h2>
          <form method="get" className="row">
            <input type="hidden" name="vue" value="artisans" />
            <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Rechercher un nom" aria-label="Rechercher un nom" style={{ flex: "1 1 180px" }} />
            <select name="statut" defaultValue={sp.statut ?? ""} aria-label="Statut"><option value="">Tous les statuts</option><option value="pending">À valider</option><option value="approved">En ligne</option><option value="rejected">Refusés</option></select>
            <select name="p" defaultValue={sp.p ?? ""} aria-label="Pays"><option value="">Tous les pays</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.emoji} {c.name}</option>)}</select>
            <button className="btn small" type="submit">Filtrer</button>
          </form>
          <div className="tw"><table className="tbl"><thead><tr><th>Artisan</th><th>Métier</th><th>Pays</th><th>Statut</th><th>Exp.</th><th>Badges</th><th></th></tr></thead><tbody>
            {list.map((a) => (
              <tr key={a.id}><td><b>{a.name}</b></td><td>{a.trade?.name}</td><td><span className="fl"><Flag code={a.country_code} size={16} />{a.country_code.toUpperCase()}</span></td>
                <td><span className={`tag ${STATUS[a.status as keyof typeof STATUS][0]}`}>{STATUS[a.status as keyof typeof STATUS][1]}</span></td>
                <td className="num">{a.experience_years != null ? `${a.experience_years} ans` : "—"}</td>
                <td>{a.verified && <span className="tag ok">✓</span>} {a.diploma_verified && <span className="tag ok">🎓</span>}</td>
                <td><Link className="btn small" href={`/admin/artisan/${a.id}`}>Ouvrir</Link></td></tr>
            ))}</tbody></table></div>
          {!list.length && <p className="empty">Aucun artisan ne correspond.</p>}
        </div>
      )}

      {vue === "prix" && (
        <>
          <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Pays ouverts</h2>
            <div className="tw"><table className="tbl"><thead><tr><th>Pays</th><th>Monnaie</th><th>Artisans en ligne</th></tr></thead><tbody>
              {COUNTRIES.map((c) => <tr key={c.code}><td><b className="fl"><Flag code={c.code} size={18} />{c.name}</b></td><td>FCFA</td><td className="num">{countOf(c.code)}</td></tr>)}</tbody></table></div></div>
          <form action={savePrices} className="card pad stack">
            <h2 style={{ fontSize: 20 }}>Grille de prix des boosts, {countryName(pays)} (FCFA)</h2>
            <div className="row">{COUNTRIES.map((c) => <a key={c.code} className={`btn small${c.code === pays ? " primary" : ""}`} href={`/admin?vue=prix&pays=${c.code}`}>{c.emoji} {c.name}</a>)}</div>
            <div className="tw"><table className="tbl"><thead><tr><th>Type</th><th>Durée</th><th>Prix</th></tr></thead><tbody>
              {grid?.map((g) => (
                <tr key={g.id}><td><b>{BOOST_TYPES[g.boost_type].name}</b></td><td>{DURATIONS[g.duration_hours]}</td>
                  <td><input type="number" min={0} step={100} name={`p:${g.id}`} defaultValue={g.amount} aria-label={`${BOOST_TYPES[g.boost_type].name}, ${DURATIONS[g.duration_hours]}, en FCFA`} /></td></tr>
              ))}</tbody></table></div>
            <p className="hint">Le boost ciblé reprend le prix du boost recherche, multiplié par le coefficient de la zone.</p>
            <div><button className="btn primary" type="submit">Enregistrer les prix</button></div>
          </form>
        </>
      )}
    </section>
  );
}

export const dynamic = "force-dynamic";

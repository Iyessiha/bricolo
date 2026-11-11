import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, ago, one } from "@/lib/admin";

export const metadata: Metadata = { title: "Messages des artisans", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Support() {
  const { db } = await requireAdmin();
  const { data } = await db.from("support_messages").select("artisan_id, sender, body, created_at, read_at, artisan:artisans(name, country_code)").order("created_at", { ascending: false }).limit(1000);
  const threads = new Map<string, { id: string; name: string; last: string; at: string; from: string; unread: number }>();
  for (const m of data ?? []) {
    const a = one(m.artisan as any) as { name: string } | null;
    const t = threads.get(m.artisan_id) ?? { id: m.artisan_id, name: a?.name ?? "Artisan", last: m.body, at: m.created_at, from: m.sender, unread: 0 };
    if (m.sender === "artisan" && !m.read_at) t.unread++;
    threads.set(m.artisan_id, t);
  }
  const list = [...threads.values()].sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || +new Date(b.at) - +new Date(a.at));
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Support</p><h1>Messages des artisans</h1></div></div>
      <p className="hint">Les artisans vous écrivent depuis « Contacter Bricolo » dans leur tableau de bord. Pour écrire en premier à un artisan, ouvrez sa fiche dans « Artisans » puis « Écrire à l’artisan ».</p>
      {list.length === 0 ? <div className="card pad"><p>Aucun message pour le moment.</p></div> : (
        <div className="card stack" style={{ gap: 0 }}>
          {list.map((t) => (
            <Link key={t.id} href={`/admin/support/${t.id}`} className="row" style={{ justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--line,#dfe5f0)", textDecoration: "none", color: "inherit", gap: 12 }}>
              <span style={{ minWidth: 0 }}><b>{t.name}</b>{t.unread > 0 && <span className="tag wait" style={{ marginLeft: 8 }}>{t.unread} nouveau{t.unread > 1 ? "x" : ""}</span>}
                <span className="meta" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.from === "admin" ? "Vous : " : ""}{t.last}</span></span>
              <span className="meta" style={{ flex: "none" }}>{ago(t.at)}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

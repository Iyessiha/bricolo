import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import { signOut } from "../auth-actions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { db, email } = await requireAdmin();
  const count = (q: any) => q.then((r: any) => r.count ?? 0);
  const [dossiers, dipl, avis, demandes, signalements, support] = await Promise.all([
    count(db.from("artisan_identity").select("artisan_id", { count: "exact", head: true }).eq("status", "pending")),
    count(db.from("artisan_diplomas").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(db.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "new")),
    count(db.from("reports").select("id", { count: "exact", head: true }).eq("status", "new")),
    count(db.from("support_messages").select("id", { count: "exact", head: true }).eq("sender", "artisan").is("read_at", null)),
  ]);
  const badges = { dossiers: dossiers + dipl, avis, demandes, signalements, support };
  return (
    <section className="inner adash">
      <aside className="aside-a">
        <div className="a-brand"><b>Back-office</b><span className="meta">{email}</span></div>
        <AdminNav badges={badges} />
        <div className="a-foot">
          <Link className="btn small" href="/">Voir le site</Link>
          <form action={signOut}><button className="btn small" type="submit">Déconnexion</button></form>
        </div>
      </aside>
      <main className="a-main stack">{children}</main>
    </section>
  );
}

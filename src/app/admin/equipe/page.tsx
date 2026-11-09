import type { Metadata } from "next";
import { requireAdmin, day } from "@/lib/admin";
import { setRole } from "../gestion";

export const metadata: Metadata = { title: "Équipe", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Equipe({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db, id } = await requireAdmin();
  const { data: admins } = await db.from("profiles").select("id, email, created_at").eq("role", "admin").order("created_at");
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Accès</p><h1>Équipe</h1></div></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <div className="card pad stack"><h2 style={{ fontSize: 17 }}>Administrateurs ({admins?.length ?? 0})</h2>
        <table className="tbl"><tbody>{admins?.map((a) => <tr key={a.id}><td><b>{a.email}</b>{a.id === id && <span className="tag mute" style={{ marginLeft: 8 }}>Vous</span>}</td><td>{day(a.created_at)}</td>
          <td className="num">{a.id !== id && <form action={setRole}><input type="hidden" name="email" value={a.email} /><input type="hidden" name="role" value="artisan" /><button className="btn small danger" type="submit">Retirer l’accès</button></form>}</td></tr>)}</tbody></table></div>
      <form action={setRole} className="card pad stack"><h2 style={{ fontSize: 17 }}>Ajouter un administrateur</h2>
        <p className="hint">La personne doit déjà avoir un compte. Elle aura accès à tout le back-office, y compris aux pièces d’identité : n’ajoutez que des personnes de confiance.</p>
        <div className="afilters"><input type="email" name="email" placeholder="adresse@exemple.com" required style={{ flex: "1 1 240px" }} /><input type="hidden" name="role" value="admin" /><button className="btn primary" type="submit">Donner l’accès</button></div></form>
    </>
  );
}

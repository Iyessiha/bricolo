import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import SupportChat from "@/components/SupportChat";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: a } = await db.from("artisans").select("id, name, country_code, status").eq("id", id).maybeSingle();
  if (!a) notFound();
  return (
    <>
      <div className="atitle"><div><p className="eyebrow"><Link href="/admin/support">← Messages</Link></p><h1>{a.name}</h1></div>
        <Link className="btn small" href={`/admin/artisan/${a.id}`}>Voir le dossier</Link></div>
      <div className="card pad"><SupportChat as="admin" artisanId={a.id} empty="Aucun message. Écrivez le premier : l’artisan sera prévenu par notification et par e-mail." /></div>
    </>
  );
}

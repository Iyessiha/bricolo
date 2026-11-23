"use client";
import { useEffect, useState } from "react";

/** Cover de carte : photo paysage de l'artisan (cover téléversée, sinon l'une de ses réalisations si elle est en paysage), sinon photo par défaut. */
export default function LiteCover({ own, shots, fallback }: { own: string | null; shots: string[]; fallback: string }) {
  const [src, setSrc] = useState(own ?? fallback);
  useEffect(() => {
    if (own || !shots.length) return;
    let off = false;
    (async () => {
      for (const u of shots) {
        const ok = await new Promise<boolean>((res) => {
          const i = new Image();
          i.onload = () => res(i.naturalWidth >= i.naturalHeight * 1.25 && i.naturalWidth >= 600);
          i.onerror = () => res(false);
          i.src = u;
        });
        if (off) return;
        if (ok) { setSrc(u); return; }
      }
    })();
    return () => { off = true; };
  }, [own, shots]);
  return <><img src={src} alt="" loading="lazy" />{!own && src === fallback && <span className="lc-ill">Photo illustrative</span>}</>;
}

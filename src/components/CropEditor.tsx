"use client";
import { useEffect, useRef, useState } from "react";

const V = 280; // taille de la zone de cadrage (px)
const OUT = 800; // taille finale de la photo (px)

/** Cadrage d’une photo de profil : on déplace et on zoome, le cercle montre ce qui sera affiché. */
export default function CropEditor({ file, onDone, onCancel }: { file: File; onDone: (f: File) => void; onCancel: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);

  const s0 = nat ? V / Math.min(nat.w, nat.h) : 1;
  const scale = s0 * zoom;
  const clamp = (x: number, y: number, sc = scale) => nat ? ({
    x: Math.min(0, Math.max(V - nat.w * sc, x)),
    y: Math.min(0, Math.max(V - nat.h * sc, y)),
  }) : { x, y };

  function onLoad() {
    const im = imgRef.current!; const w = im.naturalWidth, h = im.naturalHeight;
    setNat({ w, h });
    const sc = V / Math.min(w, h);
    // on part du haut de l’image : sur un portrait, le visage est en haut
    setPos({ x: (V - w * sc) / 2, y: h > w ? Math.max(V - h * sc, -(h * sc - V) * 0.15) : (V - h * sc) / 2 });
  }
  function changeZoom(z: number) {
    if (!nat) return;
    const cx = (V / 2 - pos.x) / scale, cy = (V / 2 - pos.y) / scale; // centre actuel, en pixels de l’image
    const sc = s0 * z;
    setZoom(z); setPos(clamp(V / 2 - cx * sc, V / 2 - cy * sc, sc));
  }
  function down(e: React.PointerEvent) { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y }; }
  function move(e: React.PointerEvent) { const d = drag.current; if (d) setPos(clamp(d.ox + e.clientX - d.px, d.oy + e.clientY - d.py)); }
  function up() { drag.current = null; }
  function key(e: React.KeyboardEvent) {
    const step = 12; const m: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const d = m[e.key]; if (d) { e.preventDefault(); setPos(clamp(pos.x + d[0], pos.y + d[1])); }
  }
  function validate() {
    const im = imgRef.current; if (!im || !nat) return;
    const c = document.createElement("canvas"); c.width = OUT; c.height = OUT;
    const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(im, -pos.x / scale, -pos.y / scale, V / scale, V / scale, 0, 0, OUT, OUT);
    c.toBlob((b) => { if (b) onDone(new File([b], "photo-profil.jpg", { type: "image/jpeg" })); }, "image/jpeg", 0.88);
  }
  return (
    <div className="crop stack" role="group" aria-label="Cadrer votre photo">
      <p className="hint"><b>Ajustez votre photo.</b> Faites glisser pour placer votre visage au centre du cercle, puis zoomez si besoin.</p>
      <div className="cropview" style={{ width: V, height: V }} tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {url && <img ref={imgRef} src={url} alt="" draggable={false} onLoad={onLoad} style={{ width: nat ? nat.w * scale : undefined, height: nat ? nat.h * scale : undefined, transform: `translate(${pos.x}px,${pos.y}px)`, visibility: nat ? "visible" : "hidden" }} />}
        <span className="cropmask" aria-hidden="true" />
      </div>
      <label className="croprange"><span>Zoom</span>
        <input type="range" min={1} max={3} step={0.02} value={zoom} onChange={(e) => changeZoom(+e.target.value)} aria-label="Zoom" />
      </label>
      <div className="row">
        <button type="button" className="btn primary small" onClick={validate} disabled={!nat}>Valider le cadrage</button>
        <button type="button" className="btn small ghost" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

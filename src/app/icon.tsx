import { ImageResponse } from "next/og";
import { MARK_D, MARK_VIEWBOX } from "@/lib/logo";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#27489a", borderRadius: 14 }}>
      <svg width="44" height="44" viewBox={MARK_VIEWBOX}><path d={MARK_D} fill="#ffffff" /></svg>
    </div>,
    size,
  );
}

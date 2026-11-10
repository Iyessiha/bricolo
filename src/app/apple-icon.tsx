import { ImageResponse } from "next/og";
import { MARK_D, MARK_VIEWBOX } from "@/lib/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#27489a" }}>
      <svg width="124" height="124" viewBox={MARK_VIEWBOX}><path d={MARK_D} fill="#ffffff" /></svg>
    </div>,
    size,
  );
}

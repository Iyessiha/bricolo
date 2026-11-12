"use client";
import { useEffect } from "react";

/** Referme le panneau « Plus » du menu mobile dès qu'on change de section. */
export default function CloseMore({ section }: { section: string }) {
  useEffect(() => {
    const c = document.getElementById("dmore") as HTMLInputElement | null;
    if (c) c.checked = false;
  }, [section]);
  return null;
}

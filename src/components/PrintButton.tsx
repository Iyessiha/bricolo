"use client";

/** Ouvre la fenêtre d'impression du navigateur : « Enregistrer au format PDF » donne le reçu en fichier. */
export default function PrintButton() {
  return <button type="button" className="btn primary" onClick={() => window.print()}>🖨️ Imprimer ou enregistrer en PDF</button>;
}

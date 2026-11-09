"use client";
import type { FormHTMLAttributes } from "react";

/** Formulaire de filtres : se relance dès qu'un choix change (le bouton reste utilisable sans JavaScript). */
export default function AutoSubmitForm(props: FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props} onChange={(e) => e.currentTarget.requestSubmit()} />;
}

import { redirect } from "next/navigation";

/** L’achat du Forfait Pro se fait dans l’espace artisan (onglet « Forfait »). Cette adresse y redirige. */
export default function Forfait() { redirect("/tableau-de-bord?s=forfait"); }

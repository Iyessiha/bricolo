import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase côté navigateur : sert uniquement à envoyer les photos et pièces vers le stockage (règles RLS appliquées). */
export const supabaseBrowser = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

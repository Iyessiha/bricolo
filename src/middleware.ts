import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";
import { parseSnippet } from "@/lib/custom-pixels";

/** Domaines des pixels personnalisés, relus au plus une fois par minute et par instance. En cas d'erreur : aucun domaine ajouté (jamais d'ouverture par défaut). */
let cache: { at: number; hosts: string[] } = { at: 0, hosts: [] };
async function extraHosts(): Promise<string[]> {
  if (Date.now() - cache.at < 60_000) return cache.hosts;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let hosts: string[] = [];
  if (url && key) {
    try {
      const r = await fetch(`${url}/rest/v1/site_settings?select=value&key=like.custom_pixel_%25`, { headers: { apikey: key, authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(1500) });
      if (r.ok) {
        const rows = (await r.json()) as { value: string }[];
        hosts = [...new Set(rows.flatMap((x) => { const p = parseSnippet(x.value); return p.ok ? p.hosts : []; }))];
      } else { cache = { at: Date.now() - 50_000, hosts: cache.hosts }; return cache.hosts; }
    } catch { cache = { at: Date.now() - 50_000, hosts: cache.hosts }; return cache.hosts; }
  }
  cache = { at: Date.now(), hosts };
  return hosts;
}

/** Rafraîchit la session Supabase à chaque requête et pose la politique de sécurité des contenus. */
export async function middleware(request: NextRequest) {
  const csp = buildCsp({ supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, dev: process.env.NODE_ENV !== "production", extraHosts: await extraHosts() });
  let response = NextResponse.next({ request });
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

import { describe, it, expect } from "vitest";
import { parseSnippet } from "@/lib/custom-pixels";

describe("code d'en-tête collé depuis l'admin", () => {
  it("accepte un script https et retient son domaine", () => {
    const r = parseSnippet('<script async src="https://cdn.exemple.com/t.js"></script>');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.hosts).toContain("cdn.exemple.com");
  });
  it("refuse http", () => expect(parseSnippet('<script src="http://x.com/a.js"></script>').ok).toBe(false));
  it("refuse tout ce qui n'est pas une balise script", () => expect(parseSnippet('<script src="https://a.com/a.js"></script><img src=x onerror=alert(1)>').ok).toBe(false));
  it("refuse un type de script inconnu", () => expect(parseSnippet('<script type="text/template">x</script>').ok).toBe(false));
  it("refuse un texte vide", () => expect(parseSnippet("hello").ok).toBe(false));
});

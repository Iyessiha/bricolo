/** Détail d'une prestation : ce qui est compris dans le prix, et ce qui est facturé en plus. Un élément par ligne. */
export default function ServiceDetails({ uid, included, extras }: { uid: string; included?: string[] | null; extras?: string[] | null }) {
  return (
    <>
      <div className="fld"><label htmlFor={`${uid}_inc`}>Ce qui est inclus dans le prix <span className="hint">(facultatif)</span></label>
        <textarea id={`${uid}_inc`} name="included" rows={4} maxLength={700} defaultValue={(included ?? []).join("\n")}
          placeholder={"Déplacement\nNettoyage des filtres\nContrôle de la pression de gaz\nTest de fonctionnement"} />
        <span className="hint">Un élément par ligne (8 maximum). Le client sait exactement ce qu’il paie.</span></div>
      <div className="fld"><label htmlFor={`${uid}_ext`}>En supplément <span className="hint">(facultatif)</span></label>
        <textarea id={`${uid}_ext`} name="extras" rows={3} maxLength={480} defaultValue={(extras ?? []).join("\n")}
          placeholder={"Recharge de gaz : 500 g = 8 000 FCFA\nPièces de rechange, sur devis"} />
        <span className="hint">Ce qui est facturé en plus, avec la quantité et le prix si possible (6 lignes maximum). Pas de mauvaise surprise pour le client.</span></div>
    </>
  );
}

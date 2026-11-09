export default function SetupNotice() {
  return (
    <section className="inner sec">
      <div className="notice">
        <b>Supabase n’est pas encore connecté.</b> Copiez <code>.env.example</code> en <code>.env.local</code>, renseignez les trois clés
        Supabase, puis relancez. Les étapes sont dans le README.
      </div>
    </section>
  );
}

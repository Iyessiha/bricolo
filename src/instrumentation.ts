/** Toute erreur serveur non gérée passe ici. Le code qui envoie les e-mails ne se charge que sur le serveur Node (pas dans l'environnement « edge » du middleware). */
export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routeType: string }) {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportError } = await import("./instrumentation-node");
    await reportError(err, request, context.routeType);
  }
}

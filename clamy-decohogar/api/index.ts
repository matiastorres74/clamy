export default async function handler(req: unknown, res: unknown) {
  const { reqHandler } = await import('../dist/clamy-decohogar/server/server.mjs' as string);
  return reqHandler(req, res);
}

import { SignJWT, jwtVerify } from "jose";

function secret(name: string): Uint8Array {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return new TextEncoder().encode(value);
}

/**
 * Signs the OnlyOffice editor config itself (attached as `config.token`) and
 * the forcesave command sent to the Document Server's CommandService — this
 * is the Document Server's own required JWT contract, verified on its side
 * against the secret configured as its own JWT_SECRET env var. Must be the
 * exact same secret as ONLYOFFICE_JWT_SECRET here.
 */
export async function signDocumentServerToken(
  payload: Record<string, unknown>,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret("ONLYOFFICE_JWT_SECRET"));
}

/** Verifies a JWT the Document Server itself signed (e.g. on a save callback). */
export async function verifyDocumentServerToken(
  token: string,
): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(token, secret("ONLYOFFICE_JWT_SECRET"));
  return payload;
}

/**
 * Signs one of our own route tokens (the document-fetch/callback URLs handed
 * to the Document Server) — a separate, unrelated contract from the
 * Document-Server JWT above: this just scopes who may call those routes and
 * for which row, using our own secret.
 */
export async function signRouteToken(
  payload: Record<string, unknown>,
  expiresIn: string,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret("ONLYOFFICE_ROUTE_SECRET"));
}

export async function verifyRouteToken(
  token: string,
): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(token, secret("ONLYOFFICE_ROUTE_SECRET"));
  return payload;
}

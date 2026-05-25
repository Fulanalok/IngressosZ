import admin from "firebase-admin";
import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";

/**
 * Requires a valid Firebase App Check token for public HTTP endpoints.
 * @param {Request} req Incoming HTTP request.
 * @param {Response} res HTTP response used for early rejection.
 * @return {Promise<boolean>} True when request can continue.
 */
export async function requireAppCheck(
  req: Request,
  res: Response
): Promise<boolean> {
  if (process.env.FUNCTIONS_EMULATOR === "true") return true;

  const token = req.header("X-Firebase-AppCheck");
  if (!token) {
    res.status(401).json({ message: "App Check obrigatório." });
    return false;
  }

  try {
    await admin.appCheck().verifyToken(token);
    return true;
  } catch {
    res.status(401).json({ message: "App Check inválido." });
    return false;
  }
}


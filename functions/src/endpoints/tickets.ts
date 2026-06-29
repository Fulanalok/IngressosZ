import admin from "firebase-admin";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { corsHandler } from "../config/cors.js";
import { jwtSecret } from "../config/params.js";
import { requireAppCheck } from "../utils/appCheck.js";
import { checkRateLimit } from "../utils/rateLimit.js";
export const validateTicket = onRequest(
  { secrets: [jwtSecret] },
  // eslint-disable-next-line complexity -- legacy validation flow
  async (req, res) => {
    // eslint-disable-next-line complexity -- legacy validation flow
    corsHandler(req, res, async () => {
      try {
        if (!(await requireAppCheck(req, res))) return;

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          res.status(401).json({ success: false, message: "Não autorizado" });
          return;
        }

        const token = authHeader.split("Bearer ")[1];
        let decodedToken: admin.auth.DecodedIdToken;
        try {
          decodedToken = await admin.auth().verifyIdToken(token);
        } catch {
          res.status(401).json({ success: false, message: "Token inválido" });
          return;
        }
        const isAdmin = decodedToken.admin === true;
        const role = (decodedToken as unknown as { role?: string }).role;
        let hasPermission =
          isAdmin ||
          role === "validator" ||
          role === "organizer" ||
          role === "admin";
        const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
        if (!hasPermission && isEmulator) {
          try {
            const userDoc = await getFirestore()
              .collection("users")
              .doc(decodedToken.uid)
              .get();
            const userRole = (userDoc.data() as { role?: string } | null)?.role;
            if (
              typeof userRole === "string" &&
              ["validator", "organizer", "admin"].includes(
                userRole.toLowerCase()
              )
            ) {
              hasPermission = true;
            }
          } catch (error) {
            void error;
          }
        }
        if (!hasPermission) {
          res.status(403).json({ success: false, message: "Não autorizado" });
          return;
        }

        const allowedValidator = await checkRateLimit(
          `validate:${decodedToken.uid}`,
          30
        );
        if (!allowedValidator) {
          res.status(429).json({
            success: false,
            message: "Muitas validações em sequência. Aguarde um momento.",
          });
          return;
        }

        const { qrCode } = req.body as { qrCode?: string };
        if (!qrCode) {
          res
            .status(400)
            .json({ success: false, message: "QR Code não fornecido" });
          return;
        }

        const jwtRawSecret = jwtSecret.value();
        if (!jwtRawSecret) {
          res
            .status(500)
            .json({ success: false, message: "Erro de configuração interna." });
          return;
        }
        const secret = jwtRawSecret;
        let decoded: JwtPayload | string;
        try {
          decoded = jwt.verify(qrCode, secret);
        } catch (e) {
          logger.warn(`Falha na verificação do token JWT: ${e}`);
          try {
            const legacyData = JSON.parse(qrCode);
            if (legacyData.type === "INGRESSOSZ_TICKET") {
              res.status(400).json({
                success: false,
                message: "Formato de ingresso antigo/inválido",
              });
              return;
            }
          } catch (parseError) {
            void parseError;
          }
          res.status(403).json({
            success: false,
            message: "QR Code inválido ou expirado",
          });
          return;
        }

        const decodedPayload =
          typeof decoded === "object" && decoded !== null ? decoded : {};
        const ticketId =
          typeof (decodedPayload as Record<string, unknown>).tid === "string" ?
            ((decodedPayload as Record<string, unknown>).tid as string) :
            undefined;
        const eventId =
          typeof (decodedPayload as Record<string, unknown>).eid === "string" ?
            ((decodedPayload as Record<string, unknown>).eid as string) :
            undefined;
        const userId =
          typeof (decodedPayload as Record<string, unknown>).uid === "string" ?
            ((decodedPayload as Record<string, unknown>).uid as string) :
            undefined;

        if (!ticketId || !eventId) {
          res.status(400).json({
            success: false,
            message: "Conteúdo do QR Code inválido",
          });
          return;
        }

        const ticketRef = getFirestore().collection("tickets").doc(ticketId);
        const ticketSnap = await ticketRef.get();

        if (!ticketSnap.exists) {
          res.status(404).json({
            success: false,
            message: "Ingresso não encontrado no sistema",
          });
          return;
        }

        const ticket = ticketSnap.data() as {
          qrCode: string;
          validated?: boolean;
          validatedAt?: Timestamp;
          ticketType?: string;
        } | null;

        if (!ticket) {
          res.status(500).json({
            success: false,
            message: "Erro ao recuperar dados do ingresso",
          });
          return;
        }

        if (ticket.qrCode !== qrCode) {
          res.status(403).json({
            success: false,
            message: "Este QR Code foi revogado ou regenerado",
          });
          return;
        }

        if (ticket.validated) {
          res.status(400).json({
            success: false,
            status: "used",
            message: "Ingresso já utilizado",
            usedAt: ticket.validatedAt,
          });
          return;
        }

        await ticketRef.update({
          validated: true,
          validatedAt: FieldValue.serverTimestamp(),
          validatedBy: "api",
          status: "used",
        });

        const eventSnap = await getFirestore()
          .collection("events")
          .doc(eventId)
          .get();
        const event = eventSnap.data() as {
          title?: string;
          date?: string;
          time?: string;
        } | null;
        let holderEmail = "N/A";

        try {
          if (userId) {
            const userRecord = await admin.auth().getUser(userId);
            holderEmail = userRecord.email || "N/A";
          }
        } catch {
          logger.warn("Usuário do ingresso não encontrado:", userId);
        }

        const ticketTypeLabels: Record<string, string> = {
          standard: "Padrão",
          vip: "VIP",
          premium: "Premium",
        };
        const ticketTypeLabel =
          ticketTypeLabels[ticket?.ticketType ?? ""] ??
          ticket?.ticketType ??
          "Geral";

        res.status(200).json({
          success: true,
          ticket: {
            eventTitle: event?.title || "Evento Desconhecido",
            ticketType: ticketTypeLabel,
            holderEmail,
            eventDate: event?.date,
            eventTime: event?.time,
          },
        });
      } catch (error) {
        logger.error("Erro na validação:", error);
        res.status(500).json({ success: false, message: "Erro interno" });
      }
    });
  }
);

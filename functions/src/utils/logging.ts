const SENSITIVE_KEY_PARTS = [
  "authorization",
  "cookie",
  "password",
  "secret",
  "token",
  "jwt",
  "qrcode",
  "paymentid",
  "email",
  "cpf",
  "cnpj",
  "phone",
];

const MAX_DEPTH = 4;
const MAX_STRING_LENGTH = 240;
const MAX_ARRAY_LENGTH = 20;
const MAX_OBJECT_KEYS = 30;

const normalizeKey = (key: string) =>
  key.toLowerCase().replace(/[_-]/g, "");

const isSensitiveKey = (key: string) => {
  const normalized = normalizeKey(key);
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
};

const truncateString = (value: string) => {
  if (value.length <= MAX_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`;
};

/**
 * Redacts sensitive fields before writing client-controlled payloads to logs.
 * @param {unknown} value Arbitrary payload to sanitize.
 * @param {number} depth Current recursion depth.
 * @return {unknown} Sanitized payload safe for structured logs.
 */
export function sanitizeLogPayload(
  value: unknown,
  depth = 0
): unknown {
  if (depth > MAX_DEPTH) return "[max-depth]";
  if (value == null) return value;
  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeLogPayload(item, depth + 1));
  }
  if (typeof value !== "object") return "[unsupported]";

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, MAX_OBJECT_KEYS)
      .map(([key, item]) => [
        key,
        isSensitiveKey(key) ?
          "[redacted]" :
          sanitizeLogPayload(item, depth + 1),
      ])
  );
}

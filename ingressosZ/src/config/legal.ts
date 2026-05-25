const env = import.meta.env as Record<string, string | undefined>;

const pending = "pendente de configuração";

const readEnv = (key: string, fallback = pending) => {
  const value = env[key]?.trim();
  return value ? value : fallback;
};

export const legalInfo = {
  brandName: readEnv("VITE_LEGAL_BRAND_NAME", "IngressosZ"),
  controllerName: readEnv("VITE_LEGAL_CONTROLLER_NAME", "IngressosZ"),
  controllerDocument: readEnv("VITE_LEGAL_CONTROLLER_DOCUMENT"),
  controllerAddress: readEnv("VITE_LEGAL_CONTROLLER_ADDRESS"),
  supportEmail: readEnv("VITE_LEGAL_SUPPORT_EMAIL"),
  privacyEmail: readEnv("VITE_LEGAL_PRIVACY_EMAIL"),
  dpoName: readEnv("VITE_LEGAL_DPO_NAME", "Canal de privacidade"),
  lastUpdated: "25 de maio de 2026",
};


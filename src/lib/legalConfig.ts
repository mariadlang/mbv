import type { LegalDocumentDefinition } from "@/src/domain/legal";

const clean = (value: string | undefined) => value?.trim() || null;

export const LEGAL_VERSION = "2026-08-27.co-1";
export const COOKIE_POLICY_VERSION = "2026-08-27.co-1";

export const legalConfig = {
  brandName: "My Best Version",
  responsibleName: clean(process.env.NEXT_PUBLIC_LEGAL_RESPONSIBLE_NAME),
  taxId: clean(process.env.NEXT_PUBLIC_LEGAL_TAX_ID),
  address: clean(process.env.NEXT_PUBLIC_LEGAL_ADDRESS),
  cityCountry: clean(process.env.NEXT_PUBLIC_LEGAL_CITY_COUNTRY) ?? "Colombia",
  privacyEmail: clean(process.env.NEXT_PUBLIC_LEGAL_PRIVACY_EMAIL),
  supportEmail: clean(process.env.NEXT_PUBLIC_LEGAL_SUPPORT_EMAIL),
  pqrEmail: clean(process.env.NEXT_PUBLIC_LEGAL_PQR_EMAIL),
  supportPhone: clean(process.env.NEXT_PUBLIC_LEGAL_SUPPORT_PHONE),
  officialDomain: clean(process.env.NEXT_PUBLIC_LEGAL_OFFICIAL_DOMAIN) ?? "https://mybestversion.life",
  paymentProvider: clean(process.env.NEXT_PUBLIC_LEGAL_PAYMENT_PROVIDER) ?? "Mercado Pago",
  country: "Colombia",
  minimumAge: 18,
} as const;

export const missingLegalFields = [
  ["responsable o razón social", legalConfig.responsibleName],
  ["NIT o identificación", legalConfig.taxId],
  ["domicilio", legalConfig.address],
  ["correo de privacidad", legalConfig.privacyEmail],
  ["correo de soporte", legalConfig.supportEmail],
  ["correo de PQR", legalConfig.pqrEmail],
  ["teléfono de atención", legalConfig.supportPhone],
].filter(([, value]) => !value).map(([label]) => label as string);

export const isLegalIdentityComplete = missingLegalFields.length === 0;

export const legalDocuments: LegalDocumentDefinition[] = [
  { id: "terms", type: "terms", title: "Términos y Condiciones", version: LEGAL_VERSION, effectiveDate: "2026-08-27", updatedAt: "2026-08-27", contentReference: "/terms", active: true },
  { id: "data-policy", type: "data_policy", title: "Política de Tratamiento de Datos", version: LEGAL_VERSION, effectiveDate: "2026-08-27", updatedAt: "2026-08-27", contentReference: "/data-policy", active: true },
  { id: "privacy-notice", type: "privacy_notice", title: "Aviso de Privacidad", version: LEGAL_VERSION, effectiveDate: "2026-08-27", updatedAt: "2026-08-27", contentReference: "/privacy", active: true },
  { id: "cookies", type: "cookies", title: "Política de Cookies", version: COOKIE_POLICY_VERSION, effectiveDate: "2026-08-27", updatedAt: "2026-08-27", contentReference: "/cookies", active: true },
  { id: "payments", type: "payments", title: "Suscripciones y pagos", version: LEGAL_VERSION, effectiveDate: "2026-08-27", updatedAt: "2026-08-27", contentReference: "/payments", active: true },
  { id: "retract", type: "retract", title: "Derecho de retracto", version: LEGAL_VERSION, effectiveDate: "2026-08-27", updatedAt: "2026-08-27", contentReference: "/retract", active: true },
  { id: "ai", type: "ai", title: "Uso de Inteligencia Artificial", version: LEGAL_VERSION, effectiveDate: "2026-08-27", updatedAt: "2026-08-27", contentReference: "/ai-privacy", active: true },
];

export const verifiedProviders = [
  { name: "Supabase", purpose: "Autenticación, cuentas, preferencias y registros legales", data: "Nombre, correo, identificador de cuenta, sesión, preferencias y evidencias mínimas de consentimiento", role: "Proveedor tecnológico / encargado según el tratamiento", location: "Infraestructura internacional; la región concreta del proyecto debe documentarse", retention: "Según la vigencia de la cuenta y la configuración contractual", policyUrl: "https://supabase.com/privacy", international: true },
  { name: "Vercel", purpose: "Hosting del dominio oficial", data: "Solicitudes web, IP y registros técnicos necesarios para operar y proteger el servicio", role: "Proveedor de infraestructura", location: "Red global", retention: "Según el plan y la configuración del proyecto", policyUrl: "https://vercel.com/legal/privacy-policy", international: true },
  { name: "OpenAI Sites", purpose: "Publicación secundaria de la aplicación", data: "Solicitudes web y registros técnicos de la versión publicada en Sites", role: "Proveedor de infraestructura", location: "Infraestructura internacional", retention: "Según la configuración del servicio", policyUrl: "https://openai.com/policies/privacy-policy/", international: true },
  { name: "Google", purpose: "Inicio de sesión opcional con Google", data: "Nombre, correo y foto de perfil cuando la persona autoriza el acceso", role: "Proveedor de identidad", location: "Infraestructura internacional", retention: "Según la cuenta de Google y la sesión de My Best Version", policyUrl: "https://policies.google.com/privacy", international: true },
  { name: "Mercado Pago", purpose: "Checkout externo cuando la persona decide continuar con una compra", data: "Los datos de pago se entregan directamente a Mercado Pago; la app no recibe números completos de tarjeta", role: "Proveedor de pagos independiente", location: "Según la infraestructura de Mercado Pago", retention: "Según sus obligaciones legales y contractuales", policyUrl: "https://www.mercadopago.com.co/privacidad", international: true },
] as const;

export const dataInventory = [
  { category: "Datos de cuenta", examples: "Nombre, correo, foto de OAuth, idioma y preferencias", storage: "Supabase y sesión del navegador", sensitive: false },
  { category: "Productividad", examples: "Metas, tareas, hábitos, planificación y progreso", storage: "IndexedDB del dispositivo", sensitive: false },
  { category: "Journal", examples: "Entradas, reflexiones, notas y emociones elegidas por la persona", storage: "IndexedDB del dispositivo", sensitive: true },
  { category: "Fitness", examples: "Objetivos físicos, peso, medidas, entrenamientos, repeticiones y cargas", storage: "IndexedDB del dispositivo", sensitive: true },
  { category: "Alimentación", examples: "Calorías, macros, comidas y objetivos nutricionales", storage: "IndexedDB del dispositivo", sensitive: true },
  { category: "Finanzas", examples: "Presupuesto, gastos, ahorro y metas financieras; datos de carácter financiero sin conexión bancaria", storage: "IndexedDB del dispositivo", sensitive: false },
  { category: "Datos técnicos", examples: "Sesión, IP y registros técnicos estrictamente necesarios", storage: "Proveedores de autenticación y hosting", sensitive: false },
  { category: "Datos comerciales", examples: "Plan, estado de acceso y referencia necesaria de pago", storage: "Supabase y proveedor de pagos cuando aplique", sensitive: false },
] as const;

export const officialLegalSources = [
  ["Ley 1581 de 2012", "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981"],
  ["Decreto 1074 de 2015", "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=76608"],
  ["Ley 1480 de 2011", "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306"],
  ["Ley 2439 de 2024", "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=257116"],
  ["Ley 527 de 1999", "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4276"],
  ["Circular Externa 002 de 2024 de la SIC", "https://sedeelectronica.sic.gov.co/transparencia/normativa/circular-externa-2-de-2024-de-la-superintendencia-de-industria-y-comercio-lineamientos-sobre-el-tratamiento-de-datos"],
  ["Superintendencia de Industria y Comercio", "https://www.sic.gov.co/"],
] as const;

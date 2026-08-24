export const publicConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Supabase renamed the client-safe anon key to "publishable key" for new
  // projects. Keep the legacy name as a fallback so existing installations
  // continue to work while Vercel Marketplace projects work out of the box.
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  mercadoPagoCheckoutUrl: process.env.NEXT_PUBLIC_MERCADO_PAGO_URL ?? "https://link.mercadopago.com.co/mybestversion",
  e2eAccess: process.env.NEXT_PUBLIC_MBV_E2E_ACCESS === "1",
};

export const hasSupabaseConfig = Boolean(publicConfig.supabaseUrl && publicConfig.supabaseAnonKey);

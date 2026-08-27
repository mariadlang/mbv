import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { hasSupabaseConfig, publicConfig } from "@/src/lib/publicConfig";
import { ZodError } from "zod";

export interface ServerAuthContext { userId: string; client: SupabaseClient | null; e2e: boolean }

export async function authenticateRequest(request: NextRequest, requireAdmin = false): Promise<ServerAuthContext> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (publicConfig.e2eAccess && (token === "e2e-user" || token === "e2e-admin")) {
    if (requireAdmin && token !== "e2e-admin") throw new Response("Forbidden", { status: 403 });
    return { userId: token === "e2e-admin" ? "e2e-admin" : "e2e-user", client: null, e2e: true };
  }
  if (!token || !hasSupabaseConfig) throw new Response("Unauthorized", { status: 401 });
  const client = createClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Response("Unauthorized", { status: 401 });
  if (requireAdmin) { const result = await client.rpc("is_superadmin"); if (result.error || result.data !== true) throw new Response("Forbidden", { status: 403 }); }
  return { userId: data.user.id, client, e2e: false };
}

export function authErrorResponse(error: unknown) {
  if (error instanceof Response) return error;
  if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message ?? "INVALID_REQUEST" }, { status: 400 });
  return Response.json({ error: "REQUEST_FAILED" }, { status: 500 });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest, authErrorResponse } from "@/src/lib/serverAuth";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update_ticket"), ticketId: z.string().uuid(), status: z.string().min(2).max(40), priority: z.enum(["low","normal","high","urgent"]) }),
  z.object({ action: z.literal("add_note"), ticketId: z.string().uuid(), note: z.string().trim().min(2).max(3000) }),
  z.object({ action: z.literal("upsert_faq"), id: z.string().uuid().optional(), question: z.string().trim().min(4).max(300), answer: z.string().trim().min(4).max(3000), locale: z.enum(["es","en"]), sortOrder: z.number().int().min(0).max(10000) }),
  z.object({ action: z.literal("update_setting"), key: z.enum(["activation_definition","event_taxonomy_version"]), value: z.unknown() }),
  z.object({ action: z.literal("update_category"), id: z.string().uuid(), label: z.string().trim().min(2).max(80), active: z.boolean(), sortOrder: z.number().int().min(0).max(10000) }),
]);

const emptySummary = { total_users:0,new_users_week:0,new_users_month:0,active_today:0,active_7d:0,active_30d:0,onboarding_rate:0,activation_rate:0,retention_7d:0,retention_30d:0,pending_suggestions:0,open_support:0 };

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, true);
    if (auth.e2e || !auth.client) return NextResponse.json({ summary: emptySummary, users: [], usage: [], tickets: [], faqs: [], categories: [], settings: [], audit: [] });
    const [summary, users, usage, tickets, faqs, profiles, categories, settings, audit] = await Promise.all([
      auth.client.rpc("platform_summary_metrics"), auth.client.rpc("platform_list_users"), auth.client.rpc("platform_feature_usage"),
      auth.client.from("feedback_tickets").select("*").order("created_at", { ascending: false }),
      auth.client.from("support_faqs").select("id,question,answer,locale,sort_order").order("sort_order"),
      auth.client.from("profiles").select("user_id,email,display_name"),
      auth.client.from("support_categories").select("id,label,ticket_type,active,sort_order").order("sort_order"),
      auth.client.from("platform_settings").select("key,value,updated_at").order("key"),
      auth.client.from("admin_audit_log").select("id,action,entity_type,entity_id,created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    for (const result of [summary,users,usage,tickets,faqs,profiles,categories,settings,audit]) if (result.error) throw result.error;
    const profileMap = new Map((profiles.data ?? []).map((item) => [item.user_id, item]));
    const ticketRows = (tickets.data ?? []).map((item) => ({ id:item.id,reference:item.reference,userId:item.user_id,type:item.type,category:item.category,subject:item.subject,message:item.message,attachmentPath:item.attachment_path,pageUrl:item.page_url,deviceMetadata:item.device_metadata,status:item.status,priority:item.priority,createdAt:item.created_at,updatedAt:item.updated_at,resolvedAt:item.resolved_at,email:profileMap.get(item.user_id)?.email,displayName:profileMap.get(item.user_id)?.display_name,similarCount:(tickets.data ?? []).filter((other) => other.type===item.type && other.category===item.category).length }));
    return NextResponse.json({ summary: summary.data ?? emptySummary, users: users.data ?? [], usage: usage.data ?? [], tickets: ticketRows, faqs: (faqs.data ?? []).map((item) => ({ id:item.id,question:item.question,answer:item.answer,locale:item.locale,sortOrder:item.sort_order })), categories: (categories.data ?? []).map((item) => ({ id:item.id,name:item.label,appliesTo:[item.ticket_type],active:item.active,sortOrder:item.sort_order })), settings: (settings.data ?? []).map((item) => ({ key:item.key,value:item.value,updatedAt:item.updated_at })), audit: (audit.data ?? []).map((item) => ({ id:item.id,action:item.action,entityType:item.entity_type,entityId:item.entity_id,createdAt:item.created_at })) });
  } catch (error) { return authErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, true); const parsed = actionSchema.parse(await request.json());
    if (auth.e2e || !auth.client) return NextResponse.json({ ok:true });
    const result = parsed.action === "update_ticket"
      ? await auth.client.rpc("platform_update_ticket", { target_ticket:parsed.ticketId,next_status:parsed.status,next_priority:parsed.priority })
      : parsed.action === "add_note"
        ? await auth.client.rpc("platform_add_ticket_note", { target_ticket:parsed.ticketId,next_note:parsed.note })
        : parsed.action === "upsert_faq"
          ? await auth.client.rpc("platform_upsert_faq", { target_faq:parsed.id ?? null,next_question:parsed.question,next_answer:parsed.answer,next_locale:parsed.locale,next_sort_order:parsed.sortOrder })
          : parsed.action === "update_setting"
            ? await auth.client.rpc("platform_update_setting", { target_key:parsed.key,next_value:parsed.value })
            : await auth.client.rpc("platform_update_category", { target_category:parsed.id,next_label:parsed.label,next_active:parsed.active,next_sort_order:parsed.sortOrder });
    if (result.error) throw result.error; return NextResponse.json({ ok:true });
  } catch (error) { return authErrorResponse(error); }
}

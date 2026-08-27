import { NextRequest, NextResponse } from "next/server";
import { fallbackFaqs } from "@/src/domain/support";
import { feedbackTicketSchema, supportAttachmentSchema } from "@/src/lib/supportSchemas";
import { authenticateRequest, authErrorResponse } from "@/src/lib/serverAuth";

function deviceMetadata(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  return { browser: ua.slice(0, 120), os: request.headers.get("sec-ch-ua-platform")?.replaceAll('"', "").slice(0, 120) ?? "No disponible", app_version: "0.1.0", occurred_at: new Date().toISOString() };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.e2e || !auth.client) return NextResponse.json({ faqs: fallbackFaqs });
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "es";
    const { data, error } = await auth.client.from("support_faqs").select("id,question,answer,locale,sort_order").eq("active", true).eq("locale", locale).order("sort_order");
    if (error) throw error;
    return NextResponse.json({ faqs: (data ?? []).map((item) => ({ id: item.id, question: item.question, answer: item.answer, locale: item.locale, sortOrder: item.sort_order })) });
  } catch (error) { return authErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const form = await request.formData();
    const parsed = feedbackTicketSchema.parse({ type: form.get("type"), category: form.get("category"), subject: form.get("subject"), message: form.get("message"), pageUrl: form.get("pageUrl") || undefined });
    const attachmentValue = form.get("attachment");
    const attachment = attachmentValue instanceof File && attachmentValue.size ? supportAttachmentSchema.parse(attachmentValue) : null;
    if (auth.e2e || !auth.client) return NextResponse.json({ reference: `MBV-E2E-${Date.now()}` }, { status: 201 });
    let attachmentPath: string | null = null;
    if (attachment) {
      const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "-"); attachmentPath = `${auth.userId}/${crypto.randomUUID()}-${safeName}`;
      const uploaded = await auth.client.storage.from("feedback-attachments").upload(attachmentPath, attachment, { upsert: false });
      if (uploaded.error) throw uploaded.error;
    }
    const { data, error } = await auth.client.rpc("create_feedback_ticket", { next_type: parsed.type, next_category: parsed.category, next_subject: parsed.subject, next_message: parsed.message, next_attachment_path: attachmentPath, next_page_url: parsed.pageUrl ?? "", next_device_metadata: deviceMetadata(request) });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("TICKET_NOT_CREATED");
    return NextResponse.json({ reference: row.reference }, { status: 201 });
  } catch (error) { return authErrorResponse(error); }
}

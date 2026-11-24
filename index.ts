// Edge Function: ส่ง Web Push เมื่อมีข้อความใหม่ (เรียกจาก Database Webhook ของตาราง chat_messages, event INSERT)
// Secrets ที่ต้องตั้ง: VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT (เช่น mailto:you@example.com)
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const LABEL: Record<string, string> = { image: "ส่งรูปภาพ", video: "ส่งวิดีโอ", audio: "ส่งข้อความเสียง", sticker: "ส่งสติกเกอร์", file: "ส่งไฟล์" };

Deno.serve(async (req) => {
  const { type, record: m } = await req.json();
  if (type !== "INSERT" || !m || m.type === "system" || !m.from_user) return new Response("skip");
  const { data: room } = await sb.from("chat_rooms").select("*").eq("id", m.chat_id).single();
  if (!room || room.closed) return new Response("skip");          // แชทที่ถูกปิดไม่แจ้งเตือน
  let q = sb.from("chat_push_subs").select("endpoint,sub").neq("user_name", m.from_user);
  if (!room.members.includes("*")) q = q.in("user_name", room.members);
  const { data: subs } = await q;
  const payload = JSON.stringify({
    title: room.type === "dm" ? m.from_user : `${m.from_user} · ${room.name}`,
    body: m.type === "text" ? String(m.body || "").slice(0, 120) : (LABEL[m.type] || "ข้อความใหม่"),
    chat: room.id, tag: room.id,
  });
  await Promise.all((subs || []).map(async (s) => {
    try { await webpush.sendNotification(s.sub, payload); }
    catch (e) { if ([404, 410].includes(e.statusCode)) await sb.from("chat_push_subs").delete().eq("endpoint", s.endpoint); }
  }));
  return new Response("ok");
});

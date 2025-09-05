import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const count = await prisma.chat.count();
    const hasKey = !!process.env.OPENAI_API_KEY;
    return new Response(JSON.stringify({ ok: true, chats: count, openai: hasKey }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Server error" }), { status: 500 });
  }
}

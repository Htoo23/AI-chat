import prisma from "@/lib/prisma";
import { generateAssistantReply } from "@/server/assistant";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = params.id;
    const messages = await prisma.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true },
    });
    return new Response(JSON.stringify(messages), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("GET /api/chat/[id]/messages error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const content = (body?.content as string)?.trim();
    if (!content) {
      return new Response(JSON.stringify({ error: "Missing content" }), { status: 400 });
    }

    const chat = await prisma.chat.findUnique({ where: { id } });
    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), { status: 404 });
    }

    await prisma.message.create({
      data: { chatId: id, role: "user", content },
    });

    const history = await prisma.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "asc" },
    });

    const assistantText = await generateAssistantReply(history);

    await prisma.message.create({
      data: { chatId: id, role: "assistant", content: assistantText },
    });

    if (chat.title === "New Chat") {
      const autoTitle = content.slice(0, 40) + (content.length > 40 ? "…" : "");
      await prisma.chat.update({ where: { id }, data: { title: autoTitle } });
    } else {
      await prisma.chat.update({ where: { id }, data: { updatedAt: new Date() } });
    }

    const messages = await prisma.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    return new Response(JSON.stringify(messages), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("POST /api/chat/[id]/messages error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), { status: 500 });
  }
}

import prisma from "@/lib/prisma";
import { generateAssistantReply } from "@/server/assistant";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = params.id;
    // If missing, auto-create a shell chat so GET never 404s
    let chat = await prisma.chat.findUnique({ where: { id } });
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          id,
          title: "New Chat",
          messages: {
            create: [{ role: "system", content: "You are a helpful AI assistant." }],
          },
        },
      });
    }

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
    if (!content) return new Response(JSON.stringify({ error: "Missing content" }), { status: 400 });

    // If chat doesn't exist (DB just reset), create it with the given id
    let chat = await prisma.chat.findUnique({ where: { id } });
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          id,
          title: "New Chat",
          messages: {
            create: [{ role: "system", content: "You are a helpful AI assistant." }],
          },
        },
      });
    }

    // Save user message
    await prisma.message.create({ data: { chatId: id, role: "user", content } });

    // Fetch history
    const history = await prisma.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "asc" },
    });

    // Generate assistant reply (OpenAI if key exists, else local fallback)
    const assistantText = await generateAssistantReply(history);

    // Save assistant message
    await prisma.message.create({ data: { chatId: id, role: "assistant", content: assistantText } });

    // Title management
    if (chat.title === "New Chat") {
      const autoTitle = content.slice(0, 40) + (content.length > 40 ? "…" : "");
      await prisma.chat.update({ where: { id }, data: { title: autoTitle } });
    } else {
      await prisma.chat.update({ where: { id }, data: { updatedAt: new Date() } });
    }

    // Return latest thread
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

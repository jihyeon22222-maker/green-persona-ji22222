import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { isAdmin } from "../../../lib/auth";

const kv = Redis.fromEnv();

const LIST_KEY = "suggestions";
const MAX_STORED = 500;
const MAX_CHARS = 1000;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
  }
  if (content.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `${MAX_CHARS}자 이내로 작성해주세요.` },
      { status: 400 }
    );
  }

  const entry = { content, createdAt: new Date().toISOString() };
  await kv.lpush(LIST_KEY, JSON.stringify(entry));
  await kv.ltrim(LIST_KEY, 0, MAX_STORED - 1);

  return NextResponse.json({ ok: true });
}

export async function GET(request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = await kv.lrange(LIST_KEY, 0, 199);
  const items = raw.map((item) => {
    if (typeof item === "string") {
      try {
        return JSON.parse(item);
      } catch {
        return { content: item, createdAt: null };
      }
    }
    return item;
  });

  return NextResponse.json({ items });
}

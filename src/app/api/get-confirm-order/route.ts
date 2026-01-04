import { redis } from "@/lib/redis/redis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  console.log(token);
  const redisKey = `order:${token}`;
  const data = await redis.get(redisKey);

  if (!data) {
    return NextResponse.json(
      { error: "Order token expired or invalid" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

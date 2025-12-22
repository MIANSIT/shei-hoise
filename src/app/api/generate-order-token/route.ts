import { NextResponse } from "next/server";
import { redis } from "../../../lib/redis/redis";
import { generateToken } from "../../../lib/redis/generateRedisToken";

export async function POST(req: Request) {
  const body = await req.json();

  const { store_id, store_slug, products } = body;

  if (!store_id || !store_slug || !products?.length) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const token = generateToken(7);

  const redisKey = `order:${token}`;

  const payload = {
    store_id,
    store_slug,
    products,
    created_at: new Date().toISOString(),
  };

  // Save for 24 hours
  await redis.set(redisKey, payload, {
    ex: 60 * 60 * 24, // 24h
  });

  return NextResponse.json({
    token,
    url: `/${store_slug}/confirm-order?t=${token}`,
  });
}

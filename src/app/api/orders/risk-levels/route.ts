import { NextRequest } from "next/server";
import { getPhoneRiskLevel } from "@/lib/utils/riskScoring";

export async function POST(req: NextRequest) {
  try {
    const { phones } = await req.json();
    if (!Array.isArray(phones)) {
      return Response.json({ error: "phones must be an array" }, { status: 400 });
    }

    const uniquePhones = Array.from(new Set(phones.filter((p): p is string => typeof p === "string" && p.length > 0)));

    const entries = await Promise.all(
      uniquePhones.map(async (phone) => [phone, await getPhoneRiskLevel(phone)] as const),
    );

    return Response.json(Object.fromEntries(entries), { status: 200 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

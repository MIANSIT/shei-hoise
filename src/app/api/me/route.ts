import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // =============================
    // 🔹 FUTURE: Validate real backend JWT/session
    // =============================
    /*
    const token = cookies().get("admin_session")?.value;
    const response = await fetch(`${process.env.ADMIN_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return NextResponse.json({ isAdmin: false });
    const data = await response.json();
    return NextResponse.json({ isAdmin: data.isAdmin });
    */

    // =============================
    // 🔹 NOW: Hardcoded Dev Check
    // =============================
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");
    const isAdmin = session?.value === "true"; // true if logged in

    return NextResponse.json({ isAdmin });
  } catch (err) {
    console.error("Auth check error:", err);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}

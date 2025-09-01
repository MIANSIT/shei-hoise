import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  try {
    // =============================
    // 🔹 FUTURE: Real Backend API
    // =============================
    /*
    const response = await fetch(`${process.env.ADMIN_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const data = await response.json();
    const token = data.token; // e.g. JWT or session ID from your backend

    cookies().set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
    });

    return NextResponse.json({ success: true });
    */

    // =============================
    // 🔹 NOW: Hardcoded Dev Check
    // =============================
    const ADMIN_EMAIL = "admin@sheihoise.com";
    const ADMIN_PASS = "admin123";

    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
      (await cookies()).set("admin_session", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60, // 1 hour
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false }, { status: 401 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

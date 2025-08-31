import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // =============================
    // 🔹 FUTURE: Call backend logout if needed
    // =============================
    /*
    const token = cookies().get("admin_session")?.value;
    await fetch(`${process.env.ADMIN_API_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    */

    // =============================
    // 🔹 NOW: Delete local cookie
    // =============================
    (
      await // =============================
      // 🔹 FUTURE: Call backend logout if needed
      // =============================
      /*
          const token = cookies().get("admin_session")?.value;
          await fetch(`${process.env.ADMIN_API_URL}/auth/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          */
      // =============================
      // 🔹 NOW: Delete local cookie
      // =============================
      cookies()
    ).delete("admin_session");

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

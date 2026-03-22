import { NextResponse } from "next/server"
import { removeTokenCookie } from "@/lib/auth"

export async function POST(req) {
  const res = NextResponse.json(
    { ok: true },
    { status: 200 }
  )

  removeTokenCookie(res)
  return res
}

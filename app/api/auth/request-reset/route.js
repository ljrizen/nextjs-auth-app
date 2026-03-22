import { NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"

export async function POST(req) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { ok: true, message: "If email exists, reset link sent" },
        { status: 200 }
      )
    }

    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExp = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp,
      },
    })

    console.log(`
    ═══════════════════════════════════════════════════════════
    📧 PASSWORD RESET LINK FOR: ${email}
    ═══════════════════════════════════════════════════════════
    Click this link (valid for 15 minutes):
    http://localhost:3000/reset-password/${resetToken}
    ═══════════════════════════════════════════════════════════
    `)

    return NextResponse.json(
      { ok: true, message: "Reset link sent" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Request reset error:", error)
    return NextResponse.json(
      { error: "Failed to request reset" },
      { status: 500 }
    )
  }
}

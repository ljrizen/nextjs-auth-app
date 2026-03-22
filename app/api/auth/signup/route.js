import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { createToken, setTokenCookie } from "@/lib/auth"

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    })

    const token = createToken(user)
    const res = NextResponse.json(
      { ok: true, user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    )

    setTokenCookie(res, token)
    return res
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Signup failed" },
      { status: 500 }
    )
  }
}

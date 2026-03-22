import jwt from "jsonwebtoken"
import { serialize, parse } from "cookie"

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

export function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    {
      expiresIn: TOKEN_MAX_AGE,
    }
  )
}

export function setTokenCookie(res, token) {
  const cookie = serialize("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  })
  res.headers.set("Set-Cookie", cookie)
}

export function removeTokenCookie(res) {
  const cookie = serialize("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: -1,
    path: "/",
  })
  res.headers.set("Set-Cookie", cookie)
}

export function parseCookies(req) {
  const cookieHeader = req.headers.get("cookie") || ""
  if (!cookieHeader) return {}
  return parse(cookieHeader)
}

export function getToken(req) {
  const cookies = parseCookies(req)
  return cookies.auth_token
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

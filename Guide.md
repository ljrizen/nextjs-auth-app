# Next.js Authentication System with Prisma & MySQL - Complete Step-by-Step Guide

A comprehensive tutorial for building a production-ready authentication system with Next.js 16, Prisma 5, MySQL, JWT tokens, and password reset functionality.

---

## Table of Contents

- [Part A: Prerequisites & Setup](#part-a-prerequisites--setup)
- [Part B: Project Creation](#part-b-project-creation)
- [Part C: Database Configuration](#part-c-database-configuration)
- [Part D: Authentication Backend (API Routes)](#part-d-authentication-backend-api-routes)
- [Part E: Frontend Pages & Components](#part-e-frontend-pages--components)
- [Part F: Testing the Authentication System](#part-f-testing-the-authentication-system)
- [Part G: Troubleshooting & FAQs](#part-g-troubleshooting--faqs)

---

# PART A: Prerequisites & Setup

## Step 1: Install Required Software

### 1.1 Install Node.js & npm
1. Download from https://nodejs.org/ (LTS version recommended)
2. Install and verify:
```bash
node --version
npm --version
```

### 1.2 Install Git
1. Download from https://git-scm.com/
2. Install and verify:
```bash
git --version
```

### 1.3 Install XAMPP for MySQL Database
1. Download from https://www.apachefriends.org/
2. Install XAMPP
3. Start Apache and MySQL from Control Panel
4. Access phpMyAdmin at http://localhost/phpmyadmin

### 1.4 Install VS Code
Download from https://code.visualstudio.com/

---

## Step 2: Create MySQL Database

### 2.1 Create Database via phpMyAdmin
1. Open http://localhost/phpmyadmin in your browser
2. Click "New" in the left sidebar
3. Database name: `nextjs_auth_db`
4. Collation: `utf8mb4_unicode_ci`
5. Click "Create"

### 2.2 Verify Database Created
- You should see `nextjs_auth_db` in the database list on the left
- No tables yet (they'll be created by Prisma migrations)

---

# PART B: Project Creation

## Step 3: Create Next.js Project

### 3.1 Create Project Folder
```bash
cd Desktop
npx create-next-app@latest nextjs-auth-app --typescript=no --tailwind=yes --no-eslint
```

### 3.2 Install During Setup
When prompted, choose:
- ✅ TypeScript: **No**
- ✅ ESLint: **No**
- ✅ Tailwind CSS: **Yes**
- ✅ `src/` directory: **No**
- ✅ App Router: **Yes**
- ✅ Turbopack: **Yes**
- ✅ Custom import alias: **No**

### 3.3 Navigate to Project
```bash
cd nextjs-auth-app
```

---

## Step 4: Install Authentication Dependencies

```bash
npm install @prisma/client prisma jsonwebtoken bcryptjs cookie
```

**Dependency breakdown:**
- `@prisma/client` - ORM for database queries
- `prisma` - Database migrations
- `jsonwebtoken` - JWT token generation/verification
- `bcryptjs` - Password hashing
- `cookie` - Cookie parsing

---

# PART C: Database Configuration

## Step 5: Initialize Prisma

```bash
npx prisma init
```

This creates:
- `.env` file (database connection string)
- `prisma/schema.prisma` file (database schema)

---

## Step 6: Configure Database Connection

### 6.1 Update `.env` file

Replace the entire `.env` file with:

```env
# Database
DATABASE_URL="mysql://root:@localhost:3306/nextjs_auth_db"

# Authentication
JWT_SECRET="your_super_secret_jwt_key_change_this_in_production"

# Environment
NODE_ENV="development"
```

**Important:** 
- If your MySQL has a password, include it: `mysql://root:password@localhost:3306/...`
- Change `JWT_SECRET` to a strong random string in production

---

## Step 7: Create User Database Schema

### 7.1 Update `prisma/schema.prisma`

Replace the entire file with:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String?
  password        String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  resetToken      String?   @unique
  resetTokenExp   DateTime?

  @@index([email])
}
```

**Schema explanation:**
- `id`: Unique identifier (CUID format)
- `email`: Unique email for each user
- `name`: Optional user full name
- `password`: Hashed password (never store plain text!)
- `createdAt` / `updatedAt`: Timestamps
- `resetToken`: Token for password reset
- `resetTokenExp`: Expiration time for reset token

---

## Step 8: Run Database Migration

```bash
npx prisma migrate dev --name init
```

### 8.1 When Prompted
- Enter a name for the migration: `init`
- This command will:
  1. Generate migration files
  2. Apply migration to MySQL database
  3. Create the `User` table

### 8.2 Verify in phpMyAdmin
1. Open http://localhost/phpmyadmin
2. Navigate to `nextjs_auth_db`
3. You should see the `User` table with all columns

---

## Step 9: Create Prisma Client Singleton

### 9.1 Create `lib/prisma.js`

```javascript
// lib/prisma.js

import { PrismaClient } from "@prisma/client"

let prisma

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient()
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient()
  }
  prisma = global.__prisma
}

export default prisma
```

**Why this pattern?**
- In development, Next.js hot-reload creates multiple PrismaClient instances
- This singleton prevents connection leaks and database warnings
- In production, create a fresh instance per request

---

## Step 10: Create Authentication Utilities

### 10.1 Create `lib/auth.js`

```javascript
// lib/auth.js

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
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax", // CSRF protection
    maxAge: TOKEN_MAX_AGE, // 7 days
    path: "/", // Available site-wide
  })
  res.headers.set("Set-Cookie", cookie) // Use set() not append()
}

export function removeTokenCookie(res) {
  const cookie = serialize("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: -1, // Delete immediately
    path: "/",
  })
  res.headers.set("Set-Cookie", cookie) // Use set() not append()
}

export function parseCookies(req) {
  const cookieHeader = req.headers.get("cookie") || "" // Next.js 16 API
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
```

**Security features:**
- `httpOnly: true` - Token only accessible server-side (prevents XSS)
- `secure: true` (production) - Only sent over HTTPS
- `sameSite: "lax"` - CSRF protection
- JWT expiration - Token expires after 7 days

---

# PART D: Authentication Backend (API Routes)

All API routes go in `app/api/` directory following Next.js conventions.

---

## Step 11: Create Signup API Route

### 11.1 Create `app/api/auth/signup/route.js`

```javascript
// app/api/auth/signup/route.js

import { NextResponse } from "next/server"
import bcryptjs from "bcryptjs"
import prisma from "@/lib/prisma"
import { createToken, setTokenCookie } from "@/lib/auth"

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, password, name } = body

    // Validation
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

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      )
    }

    // Hash password with bcryptjs (10 salt rounds)
    const hashedPassword = await bcryptjs.hash(password, 10)

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        name: name || "",
        password: hashedPassword,
      },
    })

    // Create JWT token
    const token = createToken(user)

    // Create response with Set-Cookie header
    const response = NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    )

    // Set authentication cookie
    setTokenCookie(response, token)

    return response
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

**Workflow:**
1. Extract email, password, name from request
2. Validate email and password (password min 6 chars)
3. Check if user already exists
4. Hash password with bcryptjs (10 salt rounds)
5. Create user in database
6. Generate JWT token
7. Set token in HTTP-only cookie
8. Return user data (exclude password hash)

---

## Step 12: Create Login API Route

### 12.1 Create `app/api/auth/login/route.js`

```javascript
// app/api/auth/login/route.js

import { NextResponse } from "next/server"
import bcryptjs from "bcryptjs"
import prisma from "@/lib/prisma"
import { createToken, setTokenCookie } from "@/lib/auth"

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, password } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" }, // Generic message for security
        { status: 401 }
      )
    }

    // Verify password
    const passwordMatch = await bcryptjs.compare(password, user.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Create JWT token
    const token = createToken(user)

    // Create response with Set-Cookie header
    const response = NextResponse.json(
      {
        message: "Logged in successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 200 }
    )

    // Set authentication cookie
    setTokenCookie(response, token)

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

**Security notes:**
- Generic error message "Invalid email or password" doesn't reveal if email exists
- Uses bcryptjs.compare() for secure password verification
- Never return password hash to client
- JWT token set in HTTP-only cookie

---

## Step 13: Create Get Current User API Route

### 13.1 Create `app/api/auth/me/route.js`

```javascript
// app/api/auth/me/route.js

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getToken, verifyToken } from "@/lib/auth"

export async function GET(req) {
  try {
    // Get token from cookies
    const token = getToken(req)

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify JWT token
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user from database (exclude password)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(user, { status: 200 })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

**Purpose:**
- Verify the user is logged in (token exists and is valid)
- Return current user info without password
- Used by frontend to check authentication status
- Called when page loads to show user greeting or redirect

---

## Step 14: Create Request Password Reset API Route

### 14.1 Create `app/api/auth/request-reset/route.js`

```javascript
// app/api/auth/request-reset/route.js

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import crypto from "crypto"

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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return NextResponse.json(
        { message: "If email exists, reset link sent" },
        { status: 200 }
      )
    }

    // Generate random reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    
    // Set expiration to 15 minutes from now
    const resetTokenExp = new Date(Date.now() + 15 * 60 * 1000)

    // Save token to database
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExp,
      },
    })

    // In production, send email with reset link
    // For development, log reset link to console
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`
    console.log(`\n🔐 PASSWORD RESET LINK (valid for 15 minutes):\n${resetLink}\n`)

    return NextResponse.json(
      { message: "If email exists, reset link sent" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Request reset error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

**Development vs Production:**
- **Development:** Reset link logged to console
- **Production:** Should send reset link via email using service like SendGrid/Mailgun
- Token expires after 15 minutes
- Don't reveal if email exists (security)

---

## Step 15: Create Reset Password API Route

### 15.1 Create `app/api/auth/reset-password/route.js`

```javascript
// app/api/auth/reset-password/route.js

import { NextResponse } from "next/server"
import bcryptjs from "bcryptjs"
import prisma from "@/lib/prisma"

export async function POST(req) {
  try {
    const body = await req.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: {
          gt: new Date(), // Token must not be expired
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(password, 10)

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
      },
    })

    return NextResponse.json(
      { message: "Password reset successful" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

**Workflow:**
1. Verify token exists and hasn't expired
2. Hash new password with bcryptjs
3. Update user password in database
4. Clear reset token fields
5. User can now login with new password

---

## Step 16: Create Logout API Route

### 16.1 Create `app/api/auth/logout/route.js`

```javascript
// app/api/auth/logout/route.js

import { NextResponse } from "next/server"
import { removeTokenCookie } from "@/lib/auth"

export async function GET(req) {
  try {
    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    )

    // Remove auth token cookie
    removeTokenCookie(response)

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

**Function:**
- Clears the `auth_token` cookie by setting maxAge to -1
- User is logged out on both client and server

---

# PART E: Frontend Pages & Components

All page components are "client components" (with `"use client"` directive) for interactivity.

---

## Step 17: Create Responsive Navigation Bar Component

### 17.1 Create `app/components/Navbar.js`

```javascript
// app/components/Navbar.js

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include", // Include cookies
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      }
    } catch (error) {
      console.error("Fetch user error:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        credentials: "include",
      })
      setUser(null)
      setMenuOpen(false)
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-bold hover:opacity-80 transition"
          >
            🔐 Auth
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 items-center">
            {loading ? (
              <span>Loading...</span>
            ) : user ? (
              <>
                <span className="text-sm">Welcome, {user.name || user.email}!</span>
                <Link
                  href="/profile"
                  className="hover:bg-white hover:text-blue-600 px-3 py-2 rounded transition"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hover:bg-white hover:text-blue-600 px-3 py-2 rounded transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-white text-blue-600 hover:bg-gray-200 px-4 py-2 rounded font-semibold transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-2xl"
          >
            ☰
          </button>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {loading ? (
              <div className="py-2">Loading...</div>
            ) : user ? (
              <>
                <div className="px-3 py-2 text-sm">
                  Welcome, {user.name || user.email}!
                </div>
                <Link
                  href="/profile"
                  className="block hover:bg-white hover:text-blue-600 px-3 py-2 rounded transition"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left bg-red-500 hover:bg-red-600 px-3 py-2 rounded transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block hover:bg-white hover:text-blue-600 px-3 py-2 rounded transition"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="block bg-white text-blue-600 hover:bg-gray-200 px-3 py-2 rounded transition"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
```

**Features:**
- Responsive design (mobile hamburger menu)
- Shows different UI for logged-in vs logged-out users
- Fetches current user on mount
- Logout button with redirect
- Graceful loading state

---

## Step 18: Update Root Layout

### 18.1 Update `app/layout.js`

```javascript
// app/layout.js

import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Navbar from "./components/Navbar"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata = {
  title: "Next.js Authentication App",
  description: "Complete authentication system with signup, login, and password reset",
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
```

---

## Step 19: Create Beautiful Home Page

### 19.1 Create `app/page.js`

```javascript
// app/page.js

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      }
    } catch (error) {
      console.error("Fetch user error:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {user ? (
          <div className="bg-white rounded-lg shadow-2xl p-8 sm:p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">👋</div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Welcome back, {user.name || user.email}!
              </h1>
              <p className="text-gray-600 mb-8">
                You're successfully logged in to your secure account.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="text-3xl mb-2">📧</div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-800">{user.email}</p>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg">
                  <div className="text-3xl mb-2">📅</div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/profile"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                >
                  View Full Profile
                </Link>
                <Link
                  href="/"
                  onClick={() => window.location.reload()}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition"
                >
                  Refresh
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-2xl p-8 sm:p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Welcome to Auth App
              </h1>
              <p className="text-gray-600 mb-8 text-lg">
                Secure authentication system with Next.js and Prisma
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                <div className="p-6 bg-blue-50 rounded-lg">
                  <div className="text-3xl mb-2">✅</div>
                  <h3 className="font-bold text-gray-800">Secure</h3>
                  <p className="text-sm text-gray-600">JWT + HTTP-only cookies</p>
                </div>

                <div className="p-6 bg-purple-50 rounded-lg">
                  <div className="text-3xl mb-2">⚡</div>
                  <h3 className="font-bold text-gray-800">Fast</h3>
                  <p className="text-sm text-gray-600">Next.js with Turbopack</p>
                </div>

                <div className="p-6 bg-green-50 rounded-lg">
                  <div className="text-3xl mb-2">📱</div>
                  <h3 className="font-bold text-gray-800">Responsive</h3>
                  <p className="text-sm text-gray-600">Mobile & desktop ready</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition"
                >
                  Create Account
                </Link>
                <Link
                  href="/login"
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-3 rounded-lg font-semibold text-lg transition"
                >
                  Login
                </Link>
              </div>

              <p className="text-gray-600 mt-8 text-sm">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 hover:underline">
                  Login here
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Features:**
- Shows different content for logged-in vs logged-out users
- Displays user info when logged in
- Beautiful gradient background
- Responsive design
- Loading state with spinner

---

## Step 20: Create Sign-Up Page

### 20.1 Create `app/signup/page.js`

```javascript
// app/signup/page.js

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      })
      if (res.ok) {
        setUser(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }

  // Redirect if already logged in
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">Loading...</div>
  }

  if (user) {
    router.push("/")
    return null
  }

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        router.push("/")
        router.refresh()
      } else {
        setError(data.error || "Signup failed")
      }
    } catch (error) {
      setError("Network error. Please try again.")
      console.error("Signup error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Create Account
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Full Name (Optional)
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 6 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
```

**Features:**
- Route guard: Redirects if already logged in
- Form validation
- Error display
- Loading state
- Link to login

---

## Step 21: Create Login Page

### 21.1 Create `app/login/page.js`

```javascript
// app/login/page.js

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      })
      if (res.ok) {
        setUser(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }

  // Redirect if already logged in
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">Loading...</div>
  }

  if (user) {
    router.push("/")
    return null
  }

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        router.push("/")
        router.refresh()
      } else {
        setError(data.error || "Login failed")
      }
    } catch (error) {
      setError("Network error. Please try again.")
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Login
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="space-y-2 mt-6">
          <p className="text-center text-gray-600">
            <Link
              href="/forgot-password"
              className="text-blue-600 font-semibold hover:underline"
            >
              Forgot password?
            </Link>
          </p>
          <p className="text-center text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="text-blue-600 font-semibold hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

## Step 22: Create User Profile Page (Protected)

### 22.1 Create `app/profile/page.js`

```javascript
// app/profile/page.js

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      })
      if (res.ok) {
        setUser(await res.json())
      } else {
        // Not logged in, redirect to login
        router.push("/login")
      }
    } catch (error) {
      console.error("Fetch user error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">👤</div>
            <h1 className="text-3xl font-bold text-gray-800">User Profile</h1>
          </div>

          <div className="space-y-6">
            <div className="border-b pb-4">
              <label className="text-sm text-gray-600 font-semibold">
                Full Name
              </label>
              <p className="text-lg text-gray-800 mt-1">
                {user.name || "Not provided"}
              </p>
            </div>

            <div className="border-b pb-4">
              <label className="text-sm text-gray-600 font-semibold">
                Email Address
              </label>
              <p className="text-lg text-gray-800 mt-1">{user.email}</p>
            </div>

            <div className="border-b pb-4">
              <label className="text-sm text-gray-600 font-semibold">
                User ID
              </label>
              <p className="text-lg text-gray-800 mt-1 font-mono text-sm">
                {user.id}
              </p>
            </div>

            <div className="border-b pb-4">
              <label className="text-sm text-gray-600 font-semibold">
                Member Since
              </label>
              <p className="text-lg text-gray-800 mt-1">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <Link
              href="/"
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold text-center transition"
            >
              Back to Home
            </Link>
            <Link
              href="/forgot-password"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-center transition"
            >
              Change Password
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Route Guard:**
- Automatically redirects to `/login` if not authenticated
- Only logged-in users can access this page

---

## Step 23: Create Forgot Password Page

### 23.1 Create `app/forgot-password/page.js`

```javascript
// app/forgot-password/page.js

"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      setMessage(
        "If your email is registered, you'll receive a password reset link shortly. Check your terminal for the reset link (development mode)."
      )
      setEmail("")
    } catch (error) {
      setMessage("Error sending reset email. Please try again.")
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Forgot Password?
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Enter your email to receive a password reset link.
        </p>

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="space-y-2 mt-6">
          <p className="text-center text-gray-600">
            <Link href="/login" className="text-blue-600 font-semibold hover:underline">
              Back to login
            </Link>
          </p>
          <p className="text-center text-gray-600">
            Don't have an account?{" "}
            <Link href="/signup" className="text-blue-600 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

## Step 24: Create Dynamic Password Reset Page

### 24.1 Create `app/reset-password/[token]/page.js`

```javascript
// app/reset-password/[token]/page.js

"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

export default function ResetPasswordPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setError(data.error || "Failed to reset password")
      }
    } catch (error) {
      setError("Network error. Please try again.")
      console.error("Reset password error:", error)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Password Reset Successful!
          </h1>
          <p className="text-gray-600 mb-6">
            Redirecting to login page...
          </p>
          <Link
            href="/login"
            className="text-blue-600 font-semibold hover:underline"
          >
            Click here if not redirected
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Reset Password
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
```

---

# PART F: Testing the Authentication System

## Step 25: Configure Next.js for Cross-Origin Support

### 25.1 Update `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow dev resource access from different origins
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.3', '0.0.0.0'],
};

export default nextConfig;
```

---

## Step 26: Start Development Server

```bash
npm run dev
```

Server will run at:
- Local: http://localhost:3000
- Network: http://192.168.1.X:3000

---

## Step 27: Test User Registration

### Test Steps:
1. Go to http://localhost:3000
2. Click "Create Account"
3. Fill in:
   - Name: `John Doe`
   - Email: `john@example.com`
   - Password: `password123`
4. Click "Create Account"
5. **Verify:**
   - Redirects to home page
   - Shows "Welcome back, John Doe!" greeting
   - Check database in phpMyAdmin for new user

### Database Check:
1. Open http://localhost/phpmyadmin
2. Go to `nextjs_auth_db` → `User` table
3. Verify user created with hashed password

---

## Step 28: Test User Login

### Test Steps:
1. Logout (click logout in navbar)
2. Go to http://localhost:3000/login
3. Enter credentials:
   - Email: `john@example.com`
   - Password: `password123`
4. Click "Login"
5. **Verify:**
   - Redirects to home page
   - Shows personalized greeting

---

## Step 29: Test Protected Pages

### Profile Page Guard:
1. Try accessing http://localhost:3000/profile without logging in
2. **Verify:** Redirects to /login

### Signup/Login Page Guard:
1. Login with valid credentials
2. Try accessing http://localhost:3000/signup
3. **Verify:** Redirects to home page (already logged in)

---

## Step 30: Test Password Reset

### Request Reset:
1. Go to http://localhost:3000/forgot-password
2. Enter email: `john@example.com`
3. Click "Send Reset Link"
4. **Verify:** See success message
5. **Check Terminal:**
   - Look at where you ran `npm run dev`
   - Copy the reset link shown in terminal
   - Link format: `http://localhost:3000/reset-password/{token}`

### Complete Reset:
1. Visit the reset link from terminal
2. Enter new password: `newpassword123`
3. Confirm password: `newpassword123`
4. Click "Reset Password"
5. **Verify:**
   - Success message appears
   - Auto-redirects to /login after 2 seconds
6. Login with new password to confirm it works

---

## Step 31: Test Logout Functionality

### Test Steps:
1. Login with valid credentials
2. Click "Logout" in navbar
3. **Verify:**
   - Redirects to home page
   - Home page shows "Create Account" and "Login" buttons
   - Cookie cleared

---

## Step 32: Test Responsive Design

### Desktop View:
1. Open http://localhost:3000 in browser
2. **Verify:**
   - Navigation bar horizontal
   - All content visible
   - Buttons properly sized

### Mobile View:
1. Press F12 to open DevTools
2. Click device toggle (📱 icon)
3. Select "iPhone 12" or similar
4. **Verify:**
   - Hamburger menu appears in navbar
   - Tap menu to see options
   - All content readable
   - Buttons touch-friendly

---

## Step 33: Complete Verification Checklist

- [ ] Database created in MySQL with User table
- [ ] Prisma migrations ran successfully
- [ ] All 6 API routes created and responding
- [ ] All 7 page components displaying correctly
- [ ] Navigation bar visible on all pages
- [ ] Can create new user account
- [ ] Can login with credentials
- [ ] Home page shows personalized greeting when logged in
- [ ] Profile page protected (redirects if not logged in)
- [ ] Can logout successfully
- [ ] Password reset flow works end-to-end
- [ ] Responsive design works on mobile
- [ ] All passwords hashed in database

**Congratulations! 🎉 Your authentication system is complete!**

---

# PART G: Troubleshooting & FAQs

## Issue: "Cannot connect to database"

**Problem:** Prisma can't connect to MySQL.

**Solution:**
1. Verify MySQL is running in XAMPP
2. Check `.env` DATABASE_URL is correct
3. If MySQL has password: `mysql://root:password@localhost:3306/nextjs_auth_db`
4. Run migration: `npx prisma migrate dev --name init`

---

## Issue: "Invalid email or password" Even With Correct Credentials

**Problem:** Login always fails.

**Solution:**
1. Verify user exists in phpMyAdmin `User` table
2. Check password is hashed (starts with `$2b$`)
3. Restart dev server: `npm run dev`
4. Clear browser cookies: DevTools → Storage → Cookies

---

## Issue: /api/auth/me Returns 401

**Problem:** User logged in but `/me` endpoint returns unauthorized.

**Root Causes:**
1. Cookie not being sent in requests (most common)
2. Cookie not being set in response
3. JWT_SECRET mismatch
4. Token expired

**Complete Solution:**

### Step 1: Verify `credentials: "include"` is in all fetch calls

Check `app/page.js`, `app/components/Navbar.js`, `app/login/page.js`, `app/signup/page.js`:

```javascript
const res = await fetch("/api/auth/me", {
  credentials: "include" // REQUIRED - tells browser to send cookies
})
```

### Step 2: Check DevTools Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Login to your account
4. Look for POST `/api/auth/login` request
5. Click it and check Response Headers
6. **MUST see:** `Set-Cookie: auth_token=...` header
7. Make another request to `/api/auth/me`
8. Click it and check Request Headers
9. **MUST see:** `Cookie: auth_token=...` header

**If Set-Cookie header is NOT present:**
- Error is in `setTokenCookie()` function
- Verify `lib/auth.js` line 28 uses `res.headers.set()` NOT `res.headers.append()`

**If Cookie header is NOT being sent:**
- Issue with `credentials: "include"` in fetch
- Or browser rejected cookie due to domain/path mismatch

### Step 3: Verify lib/auth.js is Correct

Open `lib/auth.js` and check:

```javascript
// Line 28 - MUST BE set() not append()
res.headers.set("Set-Cookie", cookie)

// Lines 41-44 - MUST use .get("cookie") not .cookie
export function parseCookies(req) {
  const cookieHeader = req.headers.get("cookie") || ""
  if (!cookieHeader) return {}
  return parse(cookieHeader)
}
```

### Step 4: Verify .env Variables

Check `.env` file has both:
```
JWT_SECRET=your-secret-key-here
DATABASE_URL=mysql://root@localhost:3306/nextjs_auth_db
```

### Step 5: Clear Cookies and Try Again

1. DevTools → Storage → Cookies → localhost
2. Delete all `auth_token` cookies
3. Logout if logged in
4. Restart dev server: `npm run dev`
5. Try signup/login fresh

---

## Issue: "Next.js dev resource access blocked" Warning

**Problem:** Warning about cross-origin access blocked.

**Solution:**
Update `next.config.mjs`:
```javascript
allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.3'],
```
Then restart dev server.

---

## Issue: Password Reset Link Not Showing

**Problem:** Can't find reset link.

**Development Mode (Current):**
The reset link is printed to the terminal where `npm run dev` is running.

1. Go to http://localhost:3000/forgot-password
2. Enter your email address and submit
3. Look at the terminal output - you should see:
```
═══════════════════════════════════════════════════════════
📧 PASSWORD RESET LINK FOR: your-email@example.com
═══════════════════════════════════════════════════════════
http://localhost:3000/reset-password/eyJhbGciOiJIUzI1NiIs...
═══════════════════════════════════════════════════════════
```
4. Copy the full URL (starting with http://)
5. Paste it in your browser address bar
6. Create new password

**Production Mode:**
When deployed, users will receive an actual email with the reset link instead of seeing it in terminal.

**If you don't see the link in terminal:**
1. Make sure you're looking at the terminal running `npm run dev`
2. Scroll up - the message might be above other output
3. Check that your email exists in the User table (phpMyAdmin)
4. Verify JWT_SECRET is set in `.env`
5. Restart `npm run dev` and try again

---

## Success Checklist ✅

- [ ] All dependencies installed
- [ ] Database created in MySQL
- [ ] Prisma schema migrated successfully
- [ ] All 6 API routes created and working
- [ ] All 7 page components created and rendering
- [ ] Navigation bar displays in all pages
- [ ] Can create new user account
- [ ] Can login with credentials
- [ ] Home page shows personalized greeting when logged in
- [ ] Profile page protected (redirects if not logged in)
- [ ] Can logout successfully
- [ ] Password reset flow works end-to-end
- [ ] Responsive design works on mobile
- [ ] All passwords hashed in database

**Happy coding! 🚀**


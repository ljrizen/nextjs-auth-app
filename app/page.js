"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Navbar from "@/app/components/Navbar"

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        }
      } catch (error) {
        console.error("Auth check failed:", error)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          ) : user ? (
            // Logged in user view
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  Welcome back, {user.name || user.email}! 👋
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  You have successfully logged into your account. Explore your profile and manage your settings.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/profile"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition text-center"
                  >
                    View Your Profile
                  </Link>
                  <Link
                    href="/forgot-password"
                    className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition text-center"
                  >
                    Change Password
                  </Link>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="bg-white rounded-lg shadow-2xl p-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">You're Authenticated!</h2>
                  <div className="space-y-3 text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">✓</span>
                      <span>Email verified and secure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">✓</span>
                      <span>Session is active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">✓</span>
                      <span>Access to protected pages</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Not logged in view
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  Secure Authentication System
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  Create an account or log in to access your secure account. Your data is protected with industry-standard encryption.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/signup"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition text-center"
                  >
                    Create Account
                  </Link>
                  <Link
                    href="/login"
                    className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg font-semibold transition text-center"
                  >
                    Login
                  </Link>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="bg-white rounded-lg shadow-2xl p-8 space-y-6">
                  <div className="text-center">
                    <div className="text-5xl mb-3">🔐</div>
                    <h2 className="text-2xl font-bold text-gray-900">Secure & Simple</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 font-bold text-lg mt-1">1</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Sign Up</h3>
                        <p className="text-gray-600 text-sm">Create a new account with email and password</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 font-bold text-lg mt-1">2</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Login</h3>
                        <p className="text-gray-600 text-sm">Use your credentials to access your account</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 font-bold text-lg mt-1">3</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Manage</h3>
                        <p className="text-gray-600 text-sm">View profile and reset password anytime</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
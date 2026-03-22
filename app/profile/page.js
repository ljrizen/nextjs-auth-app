"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Navbar from "@/app/components/Navbar"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        } else {
          setError("Not authenticated. Redirecting to login...")
          setTimeout(() => router.push("/login"), 2000)
        }
      } catch (error) {
        setError("Failed to fetch user data")
        console.error("Profile fetch error:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [router])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-600 font-semibold">{error}</p>
          </div>
        </div>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-gray-600">Not authenticated. Redirecting...</p>
          </div>
        </div>
      </>
    )
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="text-6xl mb-4">👤</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{user.name || "User"}</h1>
                <p className="text-gray-600 mb-4">{user.email}</p>
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">Member since</p>
                  <p className="font-semibold text-gray-900">{memberSince}</p>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Full Name</label>
                    <div className="bg-gray-100 px-4 py-2 rounded-lg text-gray-900">
                      {user.name || "Not provided"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Email Address</label>
                    <div className="bg-gray-100 px-4 py-2 rounded-lg text-gray-900">{user.email}</div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">User ID</label>
                    <div className="bg-gray-100 px-4 py-2 rounded-lg text-gray-900 font-mono text-sm">
                      {user.id}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Account Created</label>
                    <div className="bg-gray-100 px-4 py-2 rounded-lg text-gray-900">{memberSince}</div>
                  </div>

                  <div className="border-t pt-6">
                    <Link
                      href="/forgot-password"
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                    >
                      Change Password
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back button */}
          <div className="mt-8 text-center">
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
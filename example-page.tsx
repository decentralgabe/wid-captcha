"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WidCaptcha } from "./wid-captcha"
import type { VerificationResult } from "./types"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ExamplePage() {
  const router = useRouter()
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })

  // Add useEffect to handle redirection after successful verification
  useEffect(() => {
    if (verificationResult?.success) {
      // Redirect after a short delay to show the success state
      const redirectTimer = setTimeout(() => {
        router.push("/congratulations")
      }, 1500)

      return () => clearTimeout(redirectTimer)
    }
  }, [verificationResult, router])

  const handleVerificationComplete = (result: VerificationResult) => {
    console.log("Verification result:", result)
    setVerificationResult(result)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationResult?.success) {
      alert("Please complete the verification first")
      return
    }

    // Redirect to congratulations page
    router.push("/congratulations")
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Contact Form</CardTitle>
          <CardDescription>Send us a message, but verify you're human first</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="my-6 border-t pt-4">
              <h3 className="text-sm font-medium mb-2">Human Verification</h3>
              <WidCaptcha
                appId="app_id_xyz"
                actionId="contact_form"
                recaptchaSiteKey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // reCAPTCHA test key
                onVerificationComplete={handleVerificationComplete}
              />
            </div>

            <Button type="submit" className="w-full" disabled={!verificationResult?.success}>
              Submit
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="w-full text-xs text-gray-500">
            {verificationResult?.success && (
              <div className="text-green-600">
                ✓ Verified via {verificationResult.method === "world_id" ? "World ID" : "reCAPTCHA"}
              </div>
            )}
          </div>
        </CardFooter>
      </Card>

      {verificationResult && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md text-sm">
          <h3 className="font-medium mb-2">Verification Details</h3>
          <pre className="whitespace-pre-wrap overflow-auto p-2 bg-gray-100 rounded text-xs">
            {JSON.stringify(verificationResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

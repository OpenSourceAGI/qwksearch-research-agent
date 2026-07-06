"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Mail } from "lucide-react"
import { FaGoogle, FaDiscord, FaFacebook, FaLinkedin } from 'react-icons/fa'
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth/client"
import { APP_NAME } from "@/lib/config/site"

// Google Sign In Button
function GoogleSignIn() {
    const [isLoading, setIsLoading] = useState(false)

    const handleSignIn = async () => {
        setIsLoading(true)
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/",
            })
        } catch (error) {
            toast.error("Failed to sign in with Google")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleSignIn}
            disabled={isLoading}
        >
            <FaGoogle className="w-4 h-4" />
            Continue with Google
        </Button>
    )
}

// OAuth Sign In Button (Discord, Facebook, LinkedIn)
interface OAuthSignInProps {
    provider: "discord" | "facebook" | "linkedin"
}

function OAuthSignIn({ provider }: OAuthSignInProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleSignIn = async () => {
        setIsLoading(true)
        try {
            await authClient.signIn.social({
                provider,
                callbackURL: "/",
            })
        } catch (error) {
            toast.error(`Failed to sign in with ${provider}`)
        } finally {
            setIsLoading(false)
        }
    }

    const getIcon = () => {
        switch (provider) {
            case "discord": return <FaDiscord className="w-4 h-4" />
            case "facebook": return <FaFacebook className="w-4 h-4" />
            case "linkedin": return <FaLinkedin className="w-4 h-4" />
        }
    }

    const getLabel = () => {
        return provider.charAt(0).toUpperCase() + provider.slice(1)
    }

    return (
        <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleSignIn}
            disabled={isLoading}
        >
            {getIcon()}
            Continue with {getLabel()}
        </Button>
    )
}

// Magic Link Sign In Form
function MagicLinkSignIn() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [emailSent, setEmailSent] = useState(false)

    const handleSendLink = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            await authClient.signIn.magicLink({
                email,
                callbackURL: "/",
            })
            setEmailSent(true)
            toast.success("Magic link sent! Check your email (or console in dev mode).")
        } catch (error) {
            toast.error("Failed to send magic link. Please try again.")
            console.error("Magic link error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    if (emailSent) {
        return (
            <div className="flex flex-col items-center gap-4 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Check your email</h3>
                    <p className="text-sm text-muted-foreground">
                        We've sent a magic link to <strong>{email}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Click the link in the email to sign in.
                    </p>
                </div>
                <Button
                    variant="ghost"
                    onClick={() => {
                        setEmailSent(false)
                        setEmail("")
                    }}
                    className="mt-2"
                >
                    Use a different email
                </Button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSendLink} className="flex flex-col gap-4">
            <div className="grid gap-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                    id="magic-email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Magic Link"}
            </Button>
        </form>
    )
}

// Main Login Page Component
export default function LoginPage() {
    // Check if OAuth providers are configured (not placeholder values)
    const hasGoogleAuth = typeof window === 'undefined' ? true : false // Hide until we can check server-side
    const hasOAuthProviders = hasGoogleAuth // For now, only checking Google

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
                            <Image
                                src="/icons/apple-touch-icon.png"
                                alt="Logo"
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <span className="text-2xl font-bold">{APP_NAME}</span>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                            {hasOAuthProviders ? "Sign in to continue" : "Sign in with email"}
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        {/* Only show OAuth buttons if configured */}
                        {hasOAuthProviders && (
                            <>
                                <GoogleSignIn />
                                <OAuthSignIn provider="discord" />
                                <OAuthSignIn provider="linkedin" />

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">
                                            Or continue with email
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        <MagicLinkSignIn />
                    </div>

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        <Link href="/" className="underline hover:text-foreground">
                            Homepage
                        </Link>
                        {!hasOAuthProviders && (
                            <p className="mt-2 text-xs">
                                OAuth providers not configured. Contact your administrator to enable Google/Discord/LinkedIn sign-in.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

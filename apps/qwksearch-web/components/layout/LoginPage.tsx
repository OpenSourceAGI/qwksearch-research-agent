"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Mail } from "lucide-react"
import { FaGoogle, FaDiscord, FaFacebook, FaLinkedin } from 'react-icons/fa'
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth/client"
import { config } from "@/lib/config/site"

/**
 * Brand mark shown above the sign-in form. Served from an external host, so it
 * uses a plain <img> rather than next/image: the Worker's image optimizer only
 * proxies assets out of the local ASSETS bundle (see worker/index.ts), which is
 * why the previous "/icons/apple-touch-icon.png" — a path that does not exist,
 * the file lives at "/apple-touch-icon.png" — came back as a 404.
 */
const LOGO_URL = "https://i.imgur.com/VRrWzUG.png"

/**
 * Turns a better-auth client error into something a signed-out visitor can act
 * on. A 403 here is the origin check rejecting the request, which means the
 * host the app is being served from is not in the backend's trustedOrigins.
 */
function describeAuthError(
    error: { message?: string; status?: number; statusText?: string } | null,
    label: string,
): string {
    if (error?.status === 403) {
        return `${label} sign-in was rejected by the server for this domain (${
            typeof window !== "undefined" ? window.location.origin : "this origin"
        }). Add it to BETTER_AUTH_TRUSTED_ORIGINS.`
    }
    if (error?.status === 404) {
        return `${label} sign-in is not configured on the server.`
    }
    return error?.message || error?.statusText || `${label} sign-in failed. Please try again.`
}

/**
 * Where to land after signing in: the `callbackURL` query parameter when it is
 * a same-origin path (so `/connect?...` can send a signed-out visitor through
 * here and back to its consent screen), otherwise the homepage. Anything that
 * could leave the site — an absolute URL, a protocol-relative `//host` — is
 * ignored, so the parameter can't be used as an open redirect.
 */
export function safeCallbackURL(raw: string | null | undefined): string {
    if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/"
    return raw
}

function useCallbackURL(): string {
    const [callbackURL, setCallbackURL] = useState("/")
    useEffect(() => {
        setCallbackURL(safeCallbackURL(new URLSearchParams(window.location.search).get("callbackURL")))
    }, [])
    return callbackURL
}

// Google Sign In Button
function GoogleSignIn() {
    const callbackURL = useCallbackURL()
    const [isLoading, setIsLoading] = useState(false)

    const handleSignIn = async () => {
        setIsLoading(true)
        try {
            // better-auth's client resolves with `{ data, error }` instead of
            // rejecting, so a failed sign-in has to be read off `error` — a
            // bare try/catch silently swallowed every failure and left the
            // button doing nothing at all.
            const { error } = await authClient.signIn.social({
                provider: "google",
                callbackURL,
            })
            if (error) {
                console.error("Google sign-in error:", error)
                toast.error(describeAuthError(error, "Google"))
            }
        } catch (error: any) {
            console.error("Google sign-in error:", error)
            toast.error(error?.message ?? "Failed to sign in with Google. Provider may not be configured.")
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
    const callbackURL = useCallbackURL()
    const [isLoading, setIsLoading] = useState(false)

    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1)

    const handleSignIn = async () => {
        setIsLoading(true)
        try {
            const { error } = await authClient.signIn.social({
                provider,
                callbackURL,
            })
            if (error) {
                console.error(`${provider} sign-in error:`, error)
                toast.error(describeAuthError(error, providerName))
            }
        } catch (error: any) {
            console.error(`${provider} sign-in error:`, error)
            toast.error(error?.message ?? `${providerName} sign-in is not configured. Please use magic link or contact support.`)
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

    const getLabel = () => providerName

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
    const callbackURL = useCallbackURL()
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [emailSent, setEmailSent] = useState(false)

    const handleSendLink = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // Same `{ data, error }` contract as the social providers: without
            // this check a rejected request still showed "Magic link sent!".
            const { error } = await authClient.signIn.magicLink({
                email,
                callbackURL,
            })
            if (error) {
                console.error("Magic link error:", error)
                toast.error(describeAuthError(error, "Magic link"))
                return
            }
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
    const [availableProviders, setAvailableProviders] = useState<string[]>([])
    const [loadingProviders, setLoadingProviders] = useState(true)

    useEffect(() => {
        fetch('/api/auth/providers')
            .then(res => res.json())
            .then(data => {
                setAvailableProviders(data.providers || [])
            })
            .catch(err => {
                console.error('Failed to fetch providers:', err)
                setAvailableProviders([])
            })
            .finally(() => setLoadingProviders(false))
    }, [])

    const hasOAuthProviders = availableProviders.length > 0
    const hasGoogle = availableProviders.includes('google')
    const hasDiscord = availableProviders.includes('discord')
    const hasLinkedin = availableProviders.includes('linkedin')

    if (loadingProviders) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
                <div className="animate-pulse">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="flex flex-col items-center gap-4">
                    <img
                        src={LOGO_URL}
                        alt={config.appName}
                        width={160}
                        height={160}
                        className="h-20 w-auto object-contain"
                    />
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
                                {hasGoogle && <GoogleSignIn />}
                                {hasDiscord && <OAuthSignIn provider="discord" />}
                                {hasLinkedin && <OAuthSignIn provider="linkedin" />}

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

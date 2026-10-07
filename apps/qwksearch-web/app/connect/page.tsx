"use client"

/**
 * @fileoverview Consent screen for "Sign in with QwkSearch" — where a partner
 * site embedding the research agent (e.g. debate-ai.com) sends a visitor to
 * link their QwkSearch account. Signs the visitor in first when needed, then
 * asks them to approve sharing their account and API key with the partner.
 * The flow itself is described in lib/auth/connect.ts.
 */
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { config } from "@/lib/config/site"

interface Pending {
  client: { origin: string; name: string }
  user: { name: string; email: string; image: string | null } | null
}

type Status = { kind: "loading" } | { kind: "invalid" } | { kind: "ready"; pending: Pending }

export default function ConnectPage() {
  const [status, setStatus] = useState<Status>({ kind: "loading" })
  const [params, setParams] = useState<URLSearchParams | null>(null)

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    setParams(search)
    const redirectUri = search.get("redirect_uri")
    if (!redirectUri || !search.get("code_challenge")) {
      setStatus({ kind: "invalid" })
      return
    }
    fetch(`/api/connect/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`, { credentials: "same-origin" })
      .then(async (res) => (res.ok ? ((await res.json()) as Pending) : null))
      .then((pending) => {
        if (!pending) return setStatus({ kind: "invalid" })
        if (!pending.user) {
          // Sign in here first, then come straight back to this screen.
          const back = `/connect?${search.toString()}`
          window.location.replace(`/login?callbackURL=${encodeURIComponent(back)}`)
          return
        }
        setStatus({ kind: "ready", pending })
      })
      .catch(() => setStatus({ kind: "invalid" }))
  }, [])

  if (status.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (status.kind === "invalid" || !params) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            This sign-in link is invalid or comes from a site that can't connect to {config.appName}.
          </CardContent>
        </Card>
      </div>
    )
  }

  const { client, user } = status.pending
  const hidden = (name: string) => <input type="hidden" name={name} value={params.get(name) ?? ""} />

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-lg font-semibold">
            Sign in to {client.name} with {config.appName}
          </h1>
          <p className="text-xs text-muted-foreground">{client.origin}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            {user?.image ? (
              <img src={user.image} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0 text-sm">
              <div className="truncate font-medium">{user?.name}</div>
              <div className="truncate text-muted-foreground">{user?.email}</div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {client.name} will be able to:
            <ul className="mt-2 list-disc pl-5">
              <li>see your name, email address and profile picture</li>
              <li>run research chats as you, using your {config.appName} API key and plan</li>
              <li>show your {config.appName} plan and link you to upgrade it</li>
            </ul>
          </div>

          <form method="POST" action="/api/connect/authorize" className="flex gap-2">
            {hidden("redirect_uri")}
            {hidden("state")}
            {hidden("code_challenge")}
            {hidden("code_challenge_method")}
            <Button type="submit" name="decision" value="deny" variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button type="submit" name="decision" value="approve" className="flex-1">
              Allow
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Not you?{" "}
            <a
              className="underline"
              href={`/login?callbackURL=${encodeURIComponent(`/connect?${params.toString()}`)}`}
            >
              Use another account
            </a>
            . You can revoke access any time by regenerating your API key in Settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

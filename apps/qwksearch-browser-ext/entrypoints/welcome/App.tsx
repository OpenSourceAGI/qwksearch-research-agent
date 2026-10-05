import { CheckCircle2, LogIn, PanelRight } from "lucide-react"
import { FEATURE_GROUPS } from "@/lib/welcome"
import { signIn } from "@/lib/qwksearch-auth"
import { useQwkSearchSession } from "@/components/useQwkSearchSession"

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {keys.map((key) => (
        <kbd
          key={key}
          className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-700"
        >
          {key}
        </kbd>
      ))}
    </span>
  )
}

function LoginCard() {
  const { user, loading } = useQwkSearchSession()
  if (loading) return <div className="h-[116px]" aria-hidden />
  if (user)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-5">
        <CheckCircle2 className="shrink-0 text-green-600" />
        <p className="text-sm text-gray-800">
          You're logged in to QwkSearch as <strong>{user.email || user.name}</strong>.
        </p>
      </div>
    )
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center">
      <div className="flex-1">
        <h2 className="font-semibold text-gray-900">Log in to QwkSearch</h2>
        <p className="mt-1 text-sm text-gray-700">
          Bring your account, saved chats and settings into the extension. Everything else works without an
          account too.
        </p>
      </div>
      <button
        type="button"
        onClick={signIn}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        <LogIn size={16} />
        Log in
      </button>
    </div>
  )
}

/** Opened once on first install: what the extension does and how to reach each part. */
export default function Welcome() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-gray-900">
      <header className="flex flex-col items-center text-center">
        <img src="/images/qwksearch-logo.png" alt="QwkSearch" className="h-28 w-auto" />
        <h1 className="mt-4 text-3xl font-bold">Welcome to QwkSearch</h1>
        <p className="mt-2 max-w-xl text-gray-600">
          A tab organizer and research assistant in your browser's side panel. Here is everything it does and
          how to get to it.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-700">
          <PanelRight size={16} />
          Click the QwkSearch icon in the toolbar, or press{" "}
          <Keys keys={["Ctrl+Q"]} /> (<Keys keys={["⌘B"]} /> on Mac)
        </p>
      </header>

      <section className="mt-8">
        <LoginCard />
      </section>

      {FEATURE_GROUPS.map((group) => (
        <section key={group.heading} className="mt-10">
          <h2 className="text-xl font-semibold">{group.heading}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {group.features.map((feature) => (
              <li key={feature.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{feature.title}</h3>
                  {feature.keys && <Keys keys={feature.keys} />}
                </div>
                <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
                <p className="mt-2 text-sm text-gray-800">
                  <span className="font-medium">How: </span>
                  {feature.access}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-500">
        Shortcuts can be changed at <code>chrome://extensions/shortcuts</code>. You can reopen this page from the
        side panel's Settings. The tab organizer is based on{" "}
        <a className="underline" href="https://github.com/ringlochid/leotabs" target="_blank" rel="noreferrer">
          LeoTabs
        </a>{" "}
        (MPL-2.0).
      </footer>
    </main>
  )
}

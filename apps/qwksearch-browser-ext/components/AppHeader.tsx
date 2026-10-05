import { ExternalLink, LogIn, LogOut, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signIn, signOut } from '@/lib/qwksearch-auth';
import { useQwkSearchSession } from './useQwkSearchSession';

function HeaderButton({
  label,
  active,
  onClick,
  children,
  className,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-sm text-gray-700 hover:bg-gray-200',
        active && 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200',
        className
      )}
    >
      {children}
    </button>
  );
}

function AccountButton() {
  const { user, loading, refresh } = useQwkSearchSession();
  if (loading) return <div className="h-8 w-16" aria-hidden />;
  if (!user)
    return (
      <HeaderButton label="Log in to QwkSearch" onClick={signIn} className="font-medium">
        <LogIn size={15} />
        <span>Log in</span>
      </HeaderButton>
    );
  return (
    <HeaderButton
      label={`Signed in as ${user.email || user.name}. Click to sign out.`}
      onClick={async () => {
        await signOut();
        refresh();
      }}
      className="group"
    >
      {user.image ? (
        <img src={user.image} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white">
          {(user.name || user.email || '?').charAt(0).toUpperCase()}
        </span>
      )}
      <LogOut size={14} className="hidden group-hover:inline" />
    </HeaderButton>
  );
}

/**
 * The bar above the side panel's tabs: the QwkSearch brand, the LLM button that
 * opens the AI chat, the QwkSearch account, pop-out and settings.
 */
export default function AppHeader({
  aiActive,
  settingsActive,
  fullPage,
  onAskAI,
  onSettings,
  onPopOut,
}: {
  aiActive: boolean;
  settingsActive: boolean;
  fullPage: boolean;
  onAskAI: () => void;
  onSettings: () => void;
  onPopOut: () => void;
}) {
  return (
    <header className="flex items-center gap-1 pb-2">
      <a
        href="https://qwksearch.com"
        target="_blank"
        rel="noreferrer"
        className="mr-auto flex min-w-0 items-center gap-1.5"
        title="QwkSearch"
      >
        <img src="/images/qwksearch-mark.png" alt="" className="h-7 w-7 shrink-0" />
        <span className="truncate text-base font-semibold text-gray-900">QwkSearch</span>
      </a>
      <HeaderButton label="Ask AI (LLM chat)" active={aiActive} onClick={onAskAI} className="font-medium">
        <Sparkles size={15} className="text-orange-500" />
        <span>AI</span>
      </HeaderButton>
      <AccountButton />
      {!fullPage && (
        <HeaderButton label="Open in a full tab" onClick={onPopOut}>
          <ExternalLink size={15} />
        </HeaderButton>
      )}
      <HeaderButton label="Settings" active={settingsActive} onClick={onSettings}>
        <Settings size={15} />
      </HeaderButton>
    </header>
  );
}

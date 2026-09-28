/**
 * @fileoverview Bottom-anchored user menu dropdown. Shows the signed-in user's
 * avatar (or a placeholder icon), and opens a dropdown of account, settings and
 * sign-in/out actions. Mirrors the styling of the homepage `Footer` bar.
 */
'use client';

import { useRouter } from 'next/navigation';
import {
  UserCircle,
  Settings,
  LogOut,
  LogIn,
  ChevronUp,
} from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { researchAgentUIConfig } from '../config';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

export interface UserMenuProps {
  /** Background color class for the avatar button, e.g. "bg-black/40". */
  optionBackgroundColor?: string;
  /** Show the user's display name under the avatar in the trigger. */
  optionShowName?: boolean;
}

export default function UserMenu({
  optionBackgroundColor = 'bg-black/40',
  optionShowName = false,
}: UserMenuProps) {
  const router = useRouter();
  const { user, isAuthenticated, signIn, signOut } = useSession();

  const handleSettingsClick = () => {
    // Let the host app open settings in a modal on desktop; otherwise fall
    // back to the /settings route.
    if (!researchAgentUIConfig.onOpenSettings?.()) {
      router.push('/settings');
    }
  };

  const handleProfileClick = () => {
    if (!researchAgentUIConfig.onOpenSettings?.('account')) {
      router.push('/settings/account');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User menu"
          className={`
            ${optionBackgroundColor}
            group inline-flex items-center gap-2
            rounded-full text-slate-200 hover:text-white
            hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]
            transition-all duration-300
            px-2 py-1
          `}
        >
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name || 'User'}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <UserCircle size={20} className="flex-shrink-0 text-slate-300 group-hover:text-white" />
          )}
          {optionShowName && (
            <span className="hidden sm:inline text-xs font-semibold">
              {user?.name || 'Account'}
            </span>
          )}
          <ChevronUp size={14} className="text-slate-400 group-hover:text-white transition-transform duration-300" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48 bg-popover text-popover-foreground">
        {isAuthenticated ? (
          <>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name || 'User'}
                </p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground leading-none">
                    {user.email}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleProfileClick}
              className="gap-2 cursor-pointer"
            >
              <UserCircle size={14} />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleSettingsClick}
              className="gap-2 cursor-pointer"
            >
              <Settings size={14} />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => signOut()}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            onSelect={() => signIn()}
            className="gap-2 cursor-pointer"
          >
            <LogIn size={14} />
            <span>Sign in</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

/**
 * @module UserMenu
 * @description Avatar-triggered dropdown menu providing quick links to
 * Documentation, API reference, Upgrade, and the Settings dialog. Also
 * renders the {@link ThemeDropdown} inline.
 */
import { User, Settings, FileText, Code, Zap, LogIn, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ThemeDropdown } from '../theme/theme-dropdown';

/** Props for the {@link UserMenu} component. */
interface UserMenuProps {
  /** Opens the settings dialog when clicked from the dropdown. */
  onSettingsClick: () => void;
  /** Two-letter initials displayed in the avatar fallback. Defaults to `'JD'`. */
  userInitials?: string;
  /** Logged-in user info, or null/undefined when not authenticated. */
  user?: { name?: string; email?: string } | null;
  /** Called when the user clicks "Login". */
  onLogin?: () => void;
  /** Called when the user clicks "Sign Out". */
  onSignOut?: () => void;
}

/**
 * User-avatar dropdown placed in the header. Shows a `ThemeDropdown`
 * alongside an avatar that opens a menu with app navigation links and
 * Settings.
 */
export const UserMenu = ({ onSettingsClick, userInitials = 'JD', user, onLogin, onSignOut }: UserMenuProps) => {
  /** Opens the documentation site in a new tab. */
  const handleDocumentation = () => {
    window.open('https://docs.example.com', '_blank');
  };

  /** Opens the API reference site in a new tab. */
  const handleAPI = () => {
    window.open('https://api.example.com', '_blank');
  };

  /** Opens the upgrade/pricing page in a new tab. */
  const handleUpgrade = () => {
    window.open('https://upgrade.example.com', '_blank');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Theme switcher with custom icon */}
      <ThemeDropdown />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.name || 'User Account'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email || 'Not signed in'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleDocumentation}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Documentation</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleAPI}>
            <Code className="mr-2 h-4 w-4" />
            <span>API</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleUpgrade}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Upgrade</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onSettingsClick}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {user ? (
            <DropdownMenuItem onClick={onSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onLogin}>
              <LogIn className="mr-2 h-4 w-4" />
              <span>Login</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

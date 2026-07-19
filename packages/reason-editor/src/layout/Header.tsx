/**
 * @module Header
 * @description Top navigation bar for the Reason editor. Contains the
 * mobile hamburger menu, REASON branding / document breadcrumb, share button,
 * new-document button, mobile search icon, user menu, and overflow menu.
 */
import { Menu, Search as SearchIcon, Share2, MoreHorizontal, Plus, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { UserMenu } from './UserMenu';

/** Props for the {@link Header} component. */
interface HeaderProps {
  /** Opens the mobile navigation sidebar (hamburger menu). */
  onMenuClick: () => void;
  /** Opens the search dialog. */
  onSearchClick: () => void;
  /** Opens the settings dialog. */
  onSettingsClick: () => void;
  /** Triggers the document sharing flow. Optional — hides the share button when absent. */
  onShareClick?: () => void;
  /** Title of the currently active document shown in the desktop breadcrumb. */
  documentTitle?: string;
  /** Logged-in user info, or null/undefined when not authenticated. */
  user?: { name?: string; email?: string } | null;
  /** Called when the user clicks "Login" in the user menu. */
  onLogin?: () => void;
  /** Called when the user clicks "Sign Out" in the user menu. */
  onSignOut?: () => void;
}

/**
 * Application header bar. Adapts between mobile and desktop layouts:
 * on mobile it shows the hamburger button and a search icon; on desktop
 * it shows the breadcrumb, share button, and new-doc button.
 */
export const Header = ({ onMenuClick, onSearchClick, onSettingsClick, onShareClick, documentTitle, user, onLogin, onSignOut }: HeaderProps) => {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      {/* Left section - Mobile menu + breadcrumb */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="h-9 w-9 p-0 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop breadcrumb */}
        <div className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground min-w-0">
          <span className="font-serif font-semibold text-foreground">REASON</span>
          {documentTitle && (
            <>
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{documentTitle}</span>
            </>
          )}
        </div>

        {/* Mobile title */}
        <h1 className="font-serif text-lg font-semibold lg:hidden truncate">REASON</h1>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-2">
        {/* Desktop share button */}
        <Button
          variant="outline"
          size="sm"
          className="hidden lg:flex h-9"
          onClick={onShareClick}
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share & invite
        </Button>

        {/* Desktop new doc button */}
        <Button
          size="sm"
          className="hidden lg:flex h-9"
        >
          <Plus className="mr-2 h-4 w-4" />
          New doc
        </Button>

        {/* Mobile search */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSearchClick}
          className="h-9 w-9 p-0 lg:hidden"
        >
          <SearchIcon className="h-5 w-5" />
        </Button>

        {/* User menu with theme switcher - replaces avatars and settings */}
        <UserMenu onSettingsClick={onSettingsClick} user={user} onLogin={onLogin} onSignOut={onSignOut} />

        {/* More menu */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          title="More options"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

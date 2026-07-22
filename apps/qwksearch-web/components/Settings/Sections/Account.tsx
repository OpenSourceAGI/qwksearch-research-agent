'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, Copy, RefreshCw, Eye, EyeOff, ChevronDown, Moon, Sun } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  apiKey?: string;
}

interface LinkedAccount {
  id: string;
  providerId: string;
  accountId: string;
  createdAt?: string | number | null;
}

interface SessionInfo {
  id: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string | number | null;
  updatedAt: string | number | null;
  expiresAt: string | number | null;
  isCurrent: boolean;
  city?: string | null;
  state?: string | null;
  isVpn?: boolean;
}

const themeNames = [
  "modern-minimal", "elegant-luxury", "cyberpunk", "twitter",
  "mocha-mousse", "amethyst-haze", "notebook", "doom-64",
  "catppuccin", "graphite", "perpetuity", "kodama-grove",
  "cosmic-night", "tangerine", "nature", "bold-tech",
  "amber-minimal", "supabase", "neo-brutalism", "quantum-rose",
  "solar-dusk", "bubblegum", "pink-lemonade", "claymorphism",
  "pastel-dreams",
];

const fontOptions = [
  { name: "System Default", value: "system-default" },
  { name: "Arial", value: "Arial" },
  { name: "Courier New", value: "Courier New" },
  { name: "Georgia", value: "Georgia" },
  { name: "Inter", value: "Inter" },
  { name: "Lato", value: "Lato" },
  { name: "Merriweather", value: "Merriweather" },
  { name: "Montserrat", value: "Montserrat" },
  { name: "Nunito", value: "Nunito" },
  { name: "Open Sans", value: "Open Sans" },
  { name: "Oswald", value: "Oswald" },
  { name: "Playfair Display", value: "Playfair Display" },
  { name: "Poppins", value: "Poppins" },
  { name: "PT Sans", value: "PT Sans" },
  { name: "Raleway", value: "Raleway" },
  { name: "Roboto", value: "Roboto" },
  { name: "Roboto Mono", value: "Roboto Mono" },
  { name: "Roboto Slab", value: "Roboto Slab" },
  { name: "Source Code Pro", value: "Source Code Pro" },
  { name: "Source Sans 3", value: "Source Sans 3" },
  { name: "Times New Roman", value: "Times New Roman" },
  { name: "Trebuchet MS", value: "Trebuchet MS" },
  { name: "Ubuntu", value: "Ubuntu" },
  { name: "Verdana", value: "Verdana" },
];

const formatThemeName = (name: string) =>
  name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const PROVIDERS = [
  { id: 'google', name: 'Google', icon: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )},
  { id: 'github', name: 'GitHub', icon: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  ) },
  { id: 'discord', name: 'Discord', icon: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  )},
  { id: 'linkedin', name: 'LinkedIn', icon: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ) },
];

function formatUA(ua: string | null | undefined): { browser: string; os: string } {
  if (!ua) return { browser: 'Unknown browser', os: 'Unknown OS' };

  let browser = 'Unknown browser';
  if (ua.includes('Edg/') || ua.includes('Edge/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Unknown OS';
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return { browser, os };
}

function timeAgo(ts: string | number | null): string {
  if (!ts) return '';
  const ms = typeof ts === 'number' ? ts * 1000 : new Date(ts).getTime();
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const SectionCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <section className={cn('rounded-xl border border-light-200 bg-secondary/50 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80', className)}>
    {children}
  </section>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-4">
    <h4 className="text-sm text-black dark:text-white font-medium">{title}</h4>
    {subtitle && <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">{subtitle}</p>}
  </div>
);

const inputClass =
  'w-full rounded-lg border border-black/20 dark:border-dark-200 bg-white dark:bg-dark-primary px-3 py-2 lg:px-4 lg:py-3 !text-xs lg:!text-[13px] text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-black/40 dark:focus-visible:border-dark-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const SaveButton = ({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={loading || disabled}
    className="mt-3 px-4 py-2 rounded-lg bg-[#24A0ED] hover:bg-[#1a8fd1] text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
  >
    {loading && <Loader2 className="w-3 h-3 animate-spin" />}
    Save
  </button>
);

export default function Account() {
  const { data: authSession, isPending: isSessionLoading } = authClient.useSession();
  const isAuthenticated = !!authSession?.user;
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [hasPasswordAccount, setHasPasswordAccount] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [keyGenerating, setKeyGenerating] = useState(false);
  const [showApiKey, setShowApiKey] = useState(true);

  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [nameSaving, setNameSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingAccount, setUnlinkingAccount] = useState<string | null>(null);

  const [colorTheme, setColorTheme] = useState('modern-minimal');
  const [fontFamily, setFontFamily] = useState('');
  const [themeMounted, setThemeMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setThemeMounted(true);
    const saved = localStorage.getItem('color-theme');
    if (saved && themeNames.includes(saved)) setColorTheme(saved);
    const savedFont = localStorage.getItem('fontFamily');
    if (savedFont) setFontFamily(savedFont);
  }, []);

  useEffect(() => {
    if (isSessionLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const [profileRes, accountsRes, sessionsRes, providersRes] = await Promise.all([
          fetch('/api/user'),
          fetch('/api/user/accounts'),
          fetch('/api/user/sessions'),
          fetch('/api/auth/providers'),
        ]);
        const [profileData, accountsData, sessionsData, providersData] = await Promise.all([
          profileRes.json(),
          accountsRes.json(),
          sessionsRes.json(),
          providersRes.json(),
        ]);
        setProfile(profileData);
        setName(profileData.name ?? '');
        setApiKey(profileData.apiKey ?? '');
        const accounts = Array.isArray(accountsData) ? accountsData : [];
        setLinkedAccounts(accounts);
        setHasPasswordAccount(accounts.some((a: LinkedAccount) => a.providerId === 'credential'));
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setAvailableProviders(providersData.providers || []);
      } catch (err) {
        toast.error('Failed to load account settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated, isSessionLoading]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be under 2MB.');
      return;
    }
    setAvatarSaving(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const res = await fetch('/api/user', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl }),
        });
        if (!res.ok) throw new Error();
        setProfile((p) => p ? { ...p, image: dataUrl } : p);
        toast.success('Avatar updated.');
        setAvatarSaving(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Failed to upload avatar.');
      setAvatarSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (name.length > 32) { toast.error('Name must be 32 characters or fewer.'); return; }
    setNameSaving(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      setProfile((p) => p ? { ...p, name } : p);
      toast.success('Name saved.');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save name.');
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      toast.success('Password changed.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API key copied to clipboard.');
  };

  const handleRegenerateApiKey = async () => {
    if (!confirm('Are you sure you want to regenerate your API key? Old key will stop working.')) return;
    setKeyGenerating(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateApiKey: true }),
      });
      if (!res.ok) throw new Error();
      const newKeyRes = await fetch('/api/user');
      const newKeyData = await newKeyRes.json();
      setApiKey(newKeyData.apiKey);
      toast.success('API key regenerated.');
    } catch {
      toast.error('Failed to regenerate API key.');
    } finally {
      setKeyGenerating(false);
    }
  };

  const handleRevokeSession = async (id: string, isCurrent: boolean) => {
    if (isCurrent) {
      await authClient.signOut();
      return;
    }
    setDeletingSession(id);
    try {
      const res = await fetch(`/api/user/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSessions((s) => s.filter((x) => x.id !== id));
      toast.success('Session revoked.');
    } catch {
      toast.error('Failed to revoke session.');
    } finally {
      setDeletingSession(null);
    }
  };

  const handleLinkProvider = async (providerId: string) => {
    setLinkingProvider(providerId);
    try {
      await authClient.signIn.social({
        provider: providerId as any,
        callbackURL: window.location.href,
      });
    } catch (err: any) {
      console.error('Provider link error:', err);
      const message = err?.message ?? 'Failed to link account. Provider may not be configured.';
      toast.error(message);
      setLinkingProvider(null);
    }
  };

  const handleUnlinkAccount = async (accountId: string, providerName: string) => {
    if (!confirm(`Are you sure you want to unlink your ${providerName} account?`)) return;
    setUnlinkingAccount(accountId);
    try {
      const res = await fetch('/api/user/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }

      setLinkedAccounts((accounts) => accounts.filter((a) => a.id !== accountId));
      toast.success(`${providerName} account unlinked successfully.`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to unlink account.');
    } finally {
      setUnlinkingAccount(null);
    }
  };

  const handleColorThemeChange = (newTheme: string) => {
    setColorTheme(newTheme);
    localStorage.setItem('color-theme', newTheme);
    document.cookie = `color-theme=${newTheme}; path=/; max-age=31536000`;
    themeNames.forEach((t) => document.documentElement.classList.remove(`theme-${t}`));
    document.documentElement.classList.add(`theme-${newTheme}`);
  };

  const handleFontFamilyChange = (value: string) => {
    setFontFamily(value);
    localStorage.setItem('fontFamily', value);
    window.dispatchEvent(new Event('client-config-changed'));
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return;
    setDeletingAccount(true);
    try {
      const res = await fetch('/api/user', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await authClient.signOut();
      window.location.href = '/';
    } catch {
      toast.error('Failed to delete account.');
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-black/40 dark:text-white/40" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center">
        <p className="text-black/70 dark:text-white/70 text-sm">
          Sign in to manage your account, API key, and sessions.
        </p>
        <button
          onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: '/settings' })}
          className="px-4 py-2 rounded-lg bg-[#24A0ED] text-white text-sm hover:bg-[#1a8fd1] transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const themeColors: Record<string, { primary: string; secondary: string }> = {
    "modern-minimal": { primary: "#3b82f6", secondary: "#f3f4f6" },
    "elegant-luxury": { primary: "#9b2c2c", secondary: "#fdf2d6" },
    "cyberpunk": { primary: "#ff00c8", secondary: "#f0f0ff" },
    "twitter": { primary: "#1e9df1", secondary: "#0f1419" },
    "mocha-mousse": { primary: "#A37764", secondary: "#BAAB92" },
    "bubblegum": { primary: "#d04f99", secondary: "#8acfd1" },
    "amethyst-haze": { primary: "#8a79ab", secondary: "#dfd9ec" },
    "pink-lemonade": { primary: "#a84370", secondary: "#f1c4e6" },
    "notebook": { primary: "#606060", secondary: "#dedede" },
    "doom-64": { primary: "#b71c1c", secondary: "#556b2f" },
    "catppuccin": { primary: "#8839ef", secondary: "#ccd0da" },
    "graphite": { primary: "#606060", secondary: "#e0e0e0" },
    "perpetuity": { primary: "#06858e", secondary: "#d9eaea" },
    "kodama-grove": { primary: "#8d9d4f", secondary: "#decea0" },
    "cosmic-night": { primary: "#6e56cf", secondary: "#e4dfff" },
    "tangerine": { primary: "#e05d38", secondary: "#f3f4f6" },
    "quantum-rose": { primary: "#e6067a", secondary: "#ffd6ff" },
    "nature": { primary: "#2e7d32", secondary: "#e8f5e9" },
    "bold-tech": { primary: "#8b5cf6", secondary: "#f3f0ff" },
    "amber-minimal": { primary: "#f59e0b", secondary: "#f3f4f6" },
    "supabase": { primary: "#72e3ad", secondary: "#fdfdfd" },
    "neo-brutalism": { primary: "#ff3333", secondary: "#ffff00" },
    "solar-dusk": { primary: "#B45309", secondary: "#E4C090" },
    "claymorphism": { primary: "#6366f1", secondary: "#d6d3d1" },
    "pastel-dreams": { primary: "#a78bfa", secondary: "#e9d8fd" },
  };

  const colors = themeColors[colorTheme];

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
      {/* Avatar */}
      <SectionCard>
        <SectionTitle
          title="Avatar"
          subtitle="Click on the avatar to upload a custom one from your files."
        />
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarSaving}
            className="relative group w-16 h-16 rounded-full overflow-hidden border-2 border-light-200 dark:border-dark-200 flex-shrink-0 hover:border-[#24A0ED] transition-colors"
            title="Upload avatar"
          >
            {profile?.image ? (
              <img src={profile.image} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-light-200 dark:bg-dark-200 flex items-center justify-center text-xl font-medium text-black/50 dark:text-white/50">
                {profile?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {avatarSaving
                ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                : <Upload className="w-5 h-5 text-white" />
              }
            </div>
          </button>
          <p className="text-xs text-black/50 dark:text-white/50">
            An avatar is optional but strongly recommended.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </SectionCard>

      {/* Name */}
      <SectionCard>
        <SectionTitle
          title="Name"
          subtitle="Please enter your full name, or a display name."
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          placeholder="Enter your name"
          className={inputClass}
        />
        <p className="mt-1 text-[10px] text-black/40 dark:text-white/40">
          Please use 32 characters at maximum.
        </p>
        <SaveButton onClick={handleSaveName} loading={nameSaving} />
      </SectionCard>

      {/* Theme */}
      {themeMounted && (
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle
              title="Theme"
              subtitle="Choose a color theme and light/dark mode for the app."
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle light/dark"
            >
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
          <Select value={colorTheme} onValueChange={handleColorThemeChange}>
            <SelectTrigger className="w-full bg-light-primary dark:bg-dark-primary border-light-200 dark:border-dark-200 text-black dark:text-white">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: colors?.primary }} />
                  <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: colors?.secondary }} />
                </div>
                <span>{formatThemeName(colorTheme)}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-light-primary dark:bg-dark-primary border-light-200 dark:border-dark-200 max-h-72 overflow-y-auto">
              {themeNames.map((name) => {
                const c = themeColors[name];
                return (
                  <SelectItem key={name} value={name} className="text-black dark:text-white focus:bg-light-200 dark:focus:bg-dark-200">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: c.primary }} />
                        <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: c.secondary }} />
                      </div>
                      <span>{formatThemeName(name)}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </SectionCard>
      )}

      {/* Font Family */}
      <SectionCard>
        <SectionTitle
          title="Font Family"
          subtitle="Choose the font used for chat messages and UI text."
        />
        <Select value={fontFamily || 'system-default'} onValueChange={handleFontFamilyChange}>
          <SelectTrigger className="w-full bg-light-primary dark:bg-dark-primary border-light-200 dark:border-dark-200 text-black dark:text-white">
            <SelectValue placeholder="Select a font" />
          </SelectTrigger>
          <SelectContent className="bg-light-primary dark:bg-dark-primary border-light-200 dark:border-dark-200 max-h-72 overflow-y-auto">
            {fontOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-black dark:text-white focus:bg-light-200 dark:focus:bg-dark-200">
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SectionCard>

      {/* API Key */}
      <SectionCard>
        <SectionTitle
          title="API Key"
          subtitle="Use this API key to access QwkSearch programmatically."
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={apiKey}
              readOnly
              className={inputClass}
              type={showApiKey ? "text" : "password"}
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80 transition-colors"
              title={showApiKey ? "Hide API Key" : "Show API Key"}
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleCopyApiKey}
            className="p-2 lg:p-3 rounded-lg border border-black/20 dark:border-dark-200 bg-white dark:bg-dark-primary hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
            title="Copy API Key"
          >
            <Copy className="w-4 h-4 text-black/70 dark:text-white/70" />
          </button>
          <button
            onClick={handleRegenerateApiKey}
            disabled={keyGenerating}
            className="p-2 lg:p-3 rounded-lg border border-black/20 dark:border-dark-200 bg-white dark:bg-dark-primary hover:bg-light-200 dark:hover:bg-dark-200 transition-colors disabled:opacity-50"
            title="Regenerate API Key"
          >
            <RefreshCw className={cn("w-4 h-4 text-black/70 dark:text-white/70", keyGenerating && "animate-spin")} />
          </button>
        </div>
      </SectionCard>

      {/* Providers */}
      <SectionCard>
        <SectionTitle
          title="Providers"
          subtitle="Connect your account with a third-party service."
        />
        <div className="space-y-2">
          {PROVIDERS.filter(p => availableProviders.includes(p.id)).map((provider) => {
            const linkedAccount = linkedAccounts.find((a) => a.providerId === provider.id);
            const isLinking = linkingProvider === provider.id;
            const isUnlinking = unlinkingAccount === linkedAccount?.id;
            return (
              <div
                key={provider.id}
                className="flex items-center justify-between py-2 border-b border-light-200/60 dark:border-dark-200/60 last:border-0"
              >
                <div className="flex items-center gap-2 text-sm text-black/80 dark:text-white/80">
                  <provider.icon />
                  <div className="flex flex-col">
                    <span className="font-medium">{provider.name}</span>
                    {linkedAccount && (
                      <span className="text-[10px] text-black/50 dark:text-white/50">
                        {linkedAccount.accountId}
                      </span>
                    )}
                  </div>
                </div>
                {linkedAccount ? (
                  <button
                    onClick={() => handleUnlinkAccount(linkedAccount.id, provider.name)}
                    disabled={isUnlinking || linkedAccounts.length <= 1}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50 flex items-center gap-1"
                    title={linkedAccounts.length <= 1 ? "Cannot unlink your only account" : "Unlink account"}
                  >
                    {isUnlinking && <Loader2 className="w-3 h-3 animate-spin" />}
                    Unlink
                  </button>
                ) : (
                  <button
                    onClick={() => handleLinkProvider(provider.id)}
                    disabled={isLinking}
                    className="text-xs text-[#24A0ED] hover:underline disabled:opacity-50 flex items-center gap-1"
                  >
                    {isLinking && <Loader2 className="w-3 h-3 animate-spin" />}
                    Link
                  </button>
                )}
              </div>
            );
          })}
          {availableProviders.length === 0 && (
            <p className="text-xs text-black/40 dark:text-white/40">
              No OAuth providers configured. Contact your administrator to enable social sign-in.
            </p>
          )}
        </div>

        {/* Change Password — collapsible, shown below providers */}
        <div className="mt-4 pt-4 border-t border-light-200/60 dark:border-dark-200/60">
          <button
            onClick={() => setShowPasswordForm((v) => !v)}
            className="flex items-center gap-2 text-xs text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showPasswordForm && 'rotate-180')} />
            Change Password
          </button>
          {showPasswordForm && (
            <div className="mt-3 space-y-2">
              {hasPasswordAccount && (
                <input
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current Password"
                  type="password"
                  className={inputClass}
                />
              )}
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                type="password"
                className={inputClass}
              />
              <p className="text-[10px] text-black/40 dark:text-white/40">
                Please use 8 characters at minimum.
              </p>
              <SaveButton
                onClick={handleChangePassword}
                loading={passwordSaving}
                disabled={!newPassword}
              />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Sessions */}
      <SectionCard>
        <SectionTitle
          title="Sessions"
          subtitle="Manage your active sessions and revoke access."
        />
        <div className="space-y-2">
          {sessions.sort((a, b) => {
            const aTime = typeof a.updatedAt === 'number' ? a.updatedAt * 1000 : new Date(a.updatedAt || 0).getTime();
            const bTime = typeof b.updatedAt === 'number' ? b.updatedAt * 1000 : new Date(b.updatedAt || 0).getTime();
            return bTime - aTime;
          }).map((s) => {
            const { browser, os } = formatUA(s.userAgent);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between py-2.5 border-b border-light-200/60 dark:border-dark-200/60 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-black/80 dark:text-white/80 flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium">{browser}</span>
                    <span className="text-black/30 dark:text-white/30">·</span>
                    <span>{os}</span>
                    {(s.city || s.state) && (
                      <>
                        <span className="text-black/30 dark:text-white/30">·</span>
                        <span>{[s.city, s.state].filter(Boolean).join(', ')}</span>
                      </>
                    )}
                    {s.isVpn && (
                      <>
                        <span className="text-black/30 dark:text-white/30">·</span>
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">
                          VPN
                        </span>
                      </>
                    )}
                    {s.isCurrent && (
                      <span className="text-[10px] bg-[#24A0ED]/20 text-[#24A0ED] px-1.5 py-0.5 rounded-full font-medium">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-black/40 dark:text-white/40 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {s.ipAddress && (
                      <>
                        <span>{s.ipAddress}</span>
                        <span className="text-black/20 dark:text-white/20">·</span>
                      </>
                    )}
                    <span>Last active {timeAgo(s.updatedAt)}</span>
                  </p>
                </div>
                {!s.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(s.id, false)}
                    disabled={deletingSession === s.id}
                    className="ml-3 text-xs text-red-500 hover:underline disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                  >
                    {deletingSession === s.id && <Loader2 className="w-3 h-3 animate-spin" />}
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
          {sessions.length === 0 && (
            <p className="text-xs text-black/40 dark:text-white/40">No active sessions found.</p>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-light-200/60 dark:border-dark-200/60">
          <button
            onClick={() => authClient.signOut()}
            className="text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
          >
            Sign out of your account on this device
          </button>
        </div>
      </SectionCard>

      {/* Delete Account */}
      <SectionCard>
        <SectionTitle title="Delete Account" />
        <p className="text-xs text-black/50 dark:text-white/50 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
          className="px-4 py-2 rounded-lg border border-red-500/60 text-red-500 hover:bg-red-500/10 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {deletingAccount && <Loader2 className="w-3 h-3 animate-spin" />}
          Delete Account
        </button>
      </SectionCard>
    </div>
  );
}

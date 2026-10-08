/**
 * @fileoverview Footer component that renders a single compact line of links (with optional Lucide icons) pinned to the bottom of the screen on desktop and mobile alike.
 */
"use client";
import type { ComponentType } from "react";
import Link from "next/link";
import {
    Bot,
    BookOpen,
    Building2,
    Download,
    HelpCircle,
    Info,
    Lock,
    Mail,
    MessageCircle,
    Newspaper,
    Sparkles,
} from "lucide-react";

type IconComponent = ComponentType<{ size?: number }>;

/**
 * The icons footer links are configured with, imported by name so only these
 * ship with the homepage. `import * as LucideIcons` (or any dynamic
 * `import("lucide-react")`) would pull every one of lucide's ~1,500 icons into
 * the first-load bundle just to look up eight. A link naming an icon not
 * listed here renders without one — add it to this map to use it.
 */
const FOOTER_ICONS: Record<string, IconComponent> = {
    Bot,
    BookOpen,
    Building2,
    Download,
    HelpCircle,
    Info,
    Lock,
    Mail,
    MessageCircle,
    Newspaper,
    Sparkles,
};

function FooterIcon({ name }: { name: string }) {
    const Icon = FOOTER_ICONS[name];
    return Icon ? <Icon size={14} /> : null;
}

interface FooterLink {
    url: string;
    text: string;
    icon?: string;
    /** When set, clicking the link runs this instead of navigating to `url` (e.g. to open a popup). */
    onClick?: () => void;
}

interface FooterProps {
    listFooterLinks?: FooterLink[];
    optionShowIcons?: boolean;
    optionBackgroundColor?: string;
    optionColumns?: number;
}

/**
 * Hover motion shared by every link: the link lifts and grows slightly, the
 * text glows, the icon tilts, and an underline sweeps out from the center.
 */
const LINK_CLASS =
    "relative group inline-flex items-center gap-1 px-[3px] sm:px-1.5 py-0.5 rounded-md whitespace-nowrap " +
    "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] " +
    "hover:text-white hover:bg-white/10 hover:-translate-y-0.5 hover:scale-110 " +
    "hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] active:scale-95 " +
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60";

/**
 * Footer component that displays a list of links with optional icons.
 *
 * The links render as a single compact line at every width: pinned to the
 * bottom-center of the screen on desktop, and in normal flow on mobile so the
 * parent can place it above the app dock. Below the `sm` breakpoint the icons
 * are dropped and the labels shrink so all of the links fit on one line on a
 * phone.
 *
 * @param listFooterLinks - Array of footer links with their properties
 * @param optionShowIcons - Whether to show icons next to links (default: true)
 * @param optionBackgroundColor - Background color class for the footer (default: "bg-black/40")
 */
export default function Footer({
    listFooterLinks = [],
    optionShowIcons = true,
    optionBackgroundColor = "bg-black/40",
}: FooterProps) {
    if (listFooterLinks.length === 0) return null;

    const renderLinks = () =>
        listFooterLinks.map(({ url, text, icon, onClick }) => {
            const isExternal = url.startsWith("http");
            const linkProps = isExternal
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {};

            const content = (
                <>
                    {optionShowIcons && icon && (
                        <span className="hidden sm:inline-flex transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-125">
                            <FooterIcon name={icon} />
                        </span>
                    )}
                    <span
                        className="font-semibold tracking-wide text-[11px] sm:text-xs"
                        style={{ fontVariant: "small-caps" }}
                    >
                        {text}
                    </span>
                    <span className="absolute bottom-0 left-1/2 w-0 h-px -translate-x-1/2 bg-current transition-all duration-300 group-hover:w-3/4 group-hover:shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                </>
            );

            if (onClick) {
                return (
                    <button key={url} type="button" onClick={onClick} className={LINK_CLASS}>
                        {content}
                    </button>
                );
            }

            return isExternal ? (
                <a key={url} href={url} {...linkProps} className={LINK_CLASS}>
                    {content}
                </a>
            ) : (
                <Link key={url} href={url} className={LINK_CLASS}>
                    {content}
                </Link>
            );
        });

    return (
        <nav
            aria-label="Footer"
            className={`relative mt-2 md:mt-0 md:absolute md:bottom-1 md:left-1/2 md:-translate-x-1/2 z-20 flex flex-nowrap items-center justify-center gap-0 sm:gap-1 max-w-full md:w-max md:max-w-[90vw] text-slate-200 ${optionBackgroundColor} backdrop-blur-sm rounded-full px-1 sm:px-1.5 py-0.5 shadow-lg hover:shadow-xl transition-shadow duration-300`}
        >
            {renderLinks()}
        </nav>
    );
}

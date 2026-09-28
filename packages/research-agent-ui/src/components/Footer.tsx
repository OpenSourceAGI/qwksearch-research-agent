/**
 * @fileoverview Footer component that renders a bar of links (with optional Lucide icons) pinned to the bottom of the screen, collapsing into an info-icon popover on mobile.
 */
"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
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
 * Footer component that displays a list of links with optional icons.
 *
 * On desktop the links render as a bar pinned to the bottom-center of the screen.
 * On mobile the bar is collapsed into a small info icon in the bottom corner that,
 * when tapped, reveals the same links in a popover — keeping the chat input clear
 * of the footer and the OS app dock.
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
    const [open, setOpen] = useState(false);
    const mobileRef = useRef<HTMLDivElement>(null);

    // Close the mobile popover when tapping/clicking outside of it.
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (mobileRef.current && !mobileRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const renderLinks = () =>
        listFooterLinks.map(({ url, text, icon, onClick }) => {
            const isExternal = url.startsWith("http");
            const linkProps = isExternal
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {};

            const content = (
                <>
                    {optionShowIcons && icon && <FooterIcon name={icon} />}
                    <span
                        className="font-semibold tracking-wide text-md"
                        style={{ fontVariant: "small-caps" }}
                    >
                        {text}
                    </span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-current transition-all duration-300 group-hover:w-full group-hover:shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                </>
            );

            if (onClick) {
                return (
                    <button
                        key={url}
                        type="button"
                        onClick={onClick}
                        className="relative group inline-flex items-center gap-1 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-300 whitespace-nowrap"
                    >
                        {content}
                    </button>
                );
            }

            return isExternal ? (
                <a
                    key={url}
                    href={url}
                    {...linkProps}
                    className="relative group inline-flex items-center gap-1 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-300 whitespace-nowrap"
                >
                    {content}
                </a>
            ) : (
                <Link
                    key={url}
                    href={url}
                    className="relative group inline-flex items-center gap-1 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-300 whitespace-nowrap"
                >
                    {content}
                </Link>
            );
        });

    return (
        <>
            {/* Desktop: full footer bar pinned bottom-center */}
            <div
                className={`hidden md:flex absolute bottom-2 left-1/2 -translate-x-1/2 text-slate-200 text-xs z-20 ${optionBackgroundColor} rounded-lg px-2 py-1 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex-wrap items-center justify-center gap-x-6 max-w-[90vw]`}
            >
                <div className="max-w-4xl mx-auto grid grid-cols-4 gap-2">
                    {renderLinks()}
                </div>
            </div>

            {/* Mobile: collapsed to an info icon in the top corner that reveals the links */}
            <div
                ref={mobileRef}
                className="md:hidden fixed top-[calc(8px+env(safe-area-inset-top,0px))] right-2 z-30"
            >
                {open && (
                    <div
                        className={`absolute top-full right-0 mt-2 text-slate-200 text-xs ${optionBackgroundColor} rounded-lg px-3 py-2 shadow-lg flex flex-col items-start gap-2 backdrop-blur-sm`}
                    >
                        {renderLinks()}
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    aria-label={open ? "Hide links" : "Show links"}
                    aria-expanded={open}
                    className={`flex items-center justify-center h-8 w-8 rounded-full text-slate-200 ${optionBackgroundColor} shadow-lg backdrop-blur-sm hover:text-white transition-all duration-300`}
                >
                    <Info size={16} />
                </button>
            </div>
        </>
    );
}

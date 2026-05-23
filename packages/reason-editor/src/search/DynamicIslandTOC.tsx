import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Transition } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";
import type { TableOfContentsEntry } from "@lexical/react/LexicalTableOfContentsPlugin";
import type { LexicalEditorHandle } from "../editors/LexicalEditorWrapper";

const islandTransition: Transition = {
  type: "tween",
  ease: [0.22, 1, 0.36, 1],
  duration: 0.5,
};

function CircleProgress({ percentage }: { percentage: number }) {
  const size = 24;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        strokeLinecap="round"
      />
    </svg>
  );
}

interface DynamicIslandTOCProps {
  headings: TableOfContentsEntry[];
  onNavigate: (key: string) => void;
  editorRef?: React.RefObject<LexicalEditorHandle | null>;
}

/**
 * Floating bottom-center dynamic island that shows the current heading and
 * document read progress. Expands into a full table of contents on click.
 * Syncs with Lexical's TableOfContentsEntry data.
 */
export function DynamicIslandTOC({ headings, onNavigate, editorRef }: DynamicIslandTOCProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [topOffset, setTopOffset] = useState(44);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Track toolbar bottom so the island sits flush below it.
  useEffect(() => {
    const measure = () => {
      const toolbar = document.querySelector<HTMLElement>(".toolbar");
      if (toolbar) setTopOffset(toolbar.getBoundingClientRect().bottom + 6);
    };
    measure();
    const toolbar = document.querySelector<HTMLElement>(".toolbar");
    if (!toolbar) return;
    const ro = new ResizeObserver(measure);
    ro.observe(toolbar);
    return () => ro.disconnect();
  }, []);

  const minLevel = useMemo(() => {
    if (headings.length === 0) return 1;
    return Math.min(...headings.map(([, , tag]) => parseInt(tag[1], 10)));
  }, [headings]);

  // Find the scroll container once: first scrollable ancestor of the editor element.
  useEffect(() => {
    const findScrollContainer = () => {
      if (!editorRef?.current) return;
      const firstKey = headings[0]?.[0];
      if (!firstKey) return;
      const el = editorRef.current.getElementByKey(firstKey);
      if (!el) return;
      let parent = el.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.overflowY === "auto" || style.overflowY === "scroll") {
          scrollContainerRef.current = parent;
          return;
        }
        parent = parent.parentElement;
      }
      // Fallback to window
      scrollContainerRef.current = null;
    };
    findScrollContainer();
  }, [headings, editorRef]);

  // Scroll spy: track active heading and read progress.
  useEffect(() => {
    if (headings.length === 0) return;

    const getEl = (key: string): HTMLElement | null =>
      editorRef?.current?.getElementByKey(key) ?? null;

    const handleScroll = () => {
      const container = scrollContainerRef.current;
      const scrollTop = container ? container.scrollTop : window.scrollY;
      const viewportHeight = container ? container.clientHeight : window.innerHeight;
      const scrollHeight = container
        ? container.scrollHeight
        : document.documentElement.scrollHeight;

      // Progress
      const total = scrollHeight - viewportHeight;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (scrollTop / total) * 100)) : 0);

      // Active heading: last one whose top is at or above the viewport's 30% line
      const threshold = viewportHeight * 0.3;
      let currentKey: string | null = null;
      for (const [key] of headings) {
        const el = getEl(key);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const containerTop = container ? container.getBoundingClientRect().top : 0;
        const relativeTop = rect.top - containerTop;
        if (relativeTop <= threshold) {
          currentKey = key;
        } else {
          break;
        }
      }
      if (!currentKey && headings.length > 0) {
        currentKey = headings[0][0];
      }
      setActiveKey(currentKey);
    };

    const container = scrollContainerRef.current;
    const target = container ?? window;
    target.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => target.removeEventListener("scroll", handleScroll);
  }, [headings, editorRef]);

  if (headings.length === 0) return null;

  const activeHeading = headings.find(([key]) => key === activeKey);
  const activeText = activeHeading?.[1] ?? "Contents";

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={islandTransition}
            className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[4px]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={{ top: topOffset }}
        className="fixed left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center"
      >
        <motion.div
          onClick={() => { if (!isExpanded) setIsExpanded(true); }}
          initial={false}
          animate={{
            width: isExpanded ? 340 : 280,
            height: isExpanded ? 400 : 52,
            borderRadius: isExpanded ? 24 : 26,
          }}
          transition={islandTransition}
          style={{ cursor: isExpanded ? "default" : "pointer" }}
          className="relative overflow-hidden border border-foreground/10 bg-background text-foreground shadow-2xl"
        >
          {/* Collapsed pill */}
          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 0 : 1,
              scale: isExpanded ? 0.95 : 1,
              filter: isExpanded ? "blur(4px)" : "blur(0px)",
            }}
            transition={{ ...islandTransition, delay: isExpanded ? 0 : 0.1 }}
            className={cn("absolute inset-0 flex items-center gap-4 px-4 sm:px-5", isExpanded && "pointer-events-none")}
          >
            <div className="h-2 w-2 shrink-0 rounded-full bg-foreground" />
            <div className="relative flex h-full flex-1 items-center overflow-hidden text-left">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={activeKey ?? "empty"}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-foreground"
                >
                  {activeText}
                </motion.span>
              </AnimatePresence>
            </div>
            <CircleProgress percentage={progress} />
          </motion.div>

          {/* Expanded menu */}
          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              scale: isExpanded ? 1 : 1.05,
            }}
            transition={{ ...islandTransition, delay: isExpanded ? 0.1 : 0 }}
            className={cn("absolute inset-0 flex flex-col", !isExpanded && "pointer-events-none")}
          >
            <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-5">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
                TABLE OF CONTENTS
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
              <div className="flex flex-col gap-0.5">
                {headings.map(([key, text, tag]) => {
                  const level = parseInt(tag[1], 10);
                  const isActive = activeKey === key;
                  const isHovered = hoveredKey === key;
                  const indentLevel = Math.max(0, level - minLevel);
                  const paddingLeft = indentLevel * 14 + 12;

                  return (
                    <button
                      key={key}
                      onMouseEnter={() => setHoveredKey(key)}
                      onMouseLeave={() => setHoveredKey(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(key);
                        setIsExpanded(false);
                      }}
                      style={{ paddingLeft: `${paddingLeft}px` }}
                      className={cn(
                        "group flex w-full shrink-0 cursor-pointer items-center rounded-lg border-none py-2 pr-3 text-left text-sm transition-all duration-300 ease-out",
                        isActive && "bg-foreground/10 font-medium text-foreground",
                        !isActive && isHovered && "bg-foreground/5 text-foreground/85",
                        !isActive && !isHovered && "bg-transparent text-foreground/45",
                      )}
                    >
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap transition-transform duration-300 group-hover:translate-x-1">
                        {text}
                      </span>
                      <motion.div
                        initial={false}
                        animate={{ scale: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="ml-3 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}

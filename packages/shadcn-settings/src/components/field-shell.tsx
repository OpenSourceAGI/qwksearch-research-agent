import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";
import type {
  SettingsClassNames,
  SettingsFieldLink,
  SettingsFieldVariant,
} from "../types";

/**
 * The visual chrome shared by every field: an optional bordered container, the
 * label/description header, reference links, and a slot for the control. The
 * `layout` prop decides where the control sits relative to the header.
 */
const shellVariants = cva("scroll-mt-4 transition-colors", {
  variants: {
    variant: {
      card: "rounded-xl border border-border bg-card/80 p-4 lg:p-6",
      inline: "rounded-lg border border-border bg-card/50 px-4 py-3",
      ghost: "py-2",
    },
  },
  defaultVariants: {
    variant: "card",
  },
});

function FieldLinks({ links }: { links?: SettingsFieldLink[] }) {
  if (!links?.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-blue-500 underline hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 lg:text-xs"
        >
          {link.name}
        </a>
      ))}
    </div>
  );
}

export interface FieldShellProps
  extends VariantProps<typeof shellVariants> {
  anchorId?: string;
  title: string;
  description?: string;
  links?: SettingsFieldLink[];
  titleAddon?: React.ReactNode;
  classNames?: SettingsClassNames;
  /** `stacked` puts the control under the header; `row` puts it beside it. */
  layout?: "stacked" | "row";
  children: React.ReactNode;
}

function Header({
  title,
  description,
  links,
  titleAddon,
  classNames,
}: Pick<
  FieldShellProps,
  "title" | "description" | "links" | "titleAddon" | "classNames"
>) {
  return (
    <div className={cn(classNames?.header)}>
      <h4
        className={cn(
          "flex items-center gap-1.5 text-sm text-foreground",
          classNames?.title,
        )}
      >
        {title}
        {titleAddon}
      </h4>
      {description ? (
        <p
          className={cn(
            "text-[11px] text-muted-foreground lg:text-xs",
            classNames?.description,
          )}
        >
          {description}
        </p>
      ) : null}
      <FieldLinks links={links} />
    </div>
  );
}

export function FieldShell({
  anchorId,
  title,
  description,
  links,
  titleAddon,
  classNames,
  variant,
  layout = "stacked",
  children,
}: FieldShellProps) {
  const header = (
    <Header
      title={title}
      description={description}
      links={links}
      titleAddon={titleAddon}
      classNames={classNames}
    />
  );

  return (
    <section
      id={anchorId}
      className={cn(shellVariants({ variant }), classNames?.root)}
    >
      {layout === "row" ? (
        <div className="flex w-full flex-row items-center justify-between gap-3 lg:gap-5">
          {header}
          <div className={cn("flex-shrink-0", classNames?.control)}>
            {children}
          </div>
        </div>
      ) : (
        <div className="space-y-3 lg:space-y-5">
          {header}
          <div className={cn("relative", classNames?.control)}>{children}</div>
        </div>
      )}
    </section>
  );
}

export type { SettingsFieldVariant };

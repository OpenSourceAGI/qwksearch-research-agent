'use client';

import * as React from 'react';

import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/app-ui/button';
import { Separator } from '@/app-ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app-ui/tooltip';
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getToolbarMeta } from '@/docs-agent/shared/toolbar-schema';
import {
  type ToolbarButtonSize,
  toolbarButtonClass,
} from '@/docs-agent/shared/toolbar-look';
import { ToolbarTooltipBody } from '@/docs-agent/shared/toolbar-tooltip';
import { cn } from '@/lib/utils';

export function Toolbar({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Root>) {
  return (
    <ToolbarPrimitive.Root
      className={cn('relative flex select-none items-center', className)}
      {...props}
    />
  );
}

export function ToolbarToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.ToolbarToggleGroup>) {
  return (
    <ToolbarPrimitive.ToolbarToggleGroup
      className={cn('flex items-center', className)}
      {...props}
    />
  );
}

export function ToolbarLink({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Link>) {
  return (
    <ToolbarPrimitive.Link
      className={cn('font-medium underline underline-offset-4', className)}
      {...props}
    />
  );
}

export function ToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Separator>) {
  return (
    <ToolbarPrimitive.Separator
      className={cn('mx-2 my-1 w-px shrink-0 bg-border', className)}
      {...props}
    />
  );
}

type ToolbarButtonVariant = 'default' | 'outline';

/**
 * Class list for a toolbar control: shadcn's `ghost` (or `outline`) `Button`
 * look with the shared toolbar states layered on. Controls render through
 * `<Button asChild>`, so this is applied via its `className`.
 */
function toolbarButtonVariants({
  size = 'sm',
  variant = 'default',
}: {
  size?: ToolbarButtonSize | null;
  variant?: ToolbarButtonVariant | null;
} = {}) {
  return toolbarButtonClass(
    size ?? 'sm',
    variant === 'outline' ? 'border border-input shadow-xs' : undefined
  );
}

const dropdownArrowSizes = { default: 'h-9 w-6', lg: 'h-10 w-8', sm: 'h-8 w-5' };

type ToolbarVariantProps = {
  size?: ToolbarButtonSize | null;
  variant?: ToolbarButtonVariant | null;
};

type ToolbarButtonProps = {
  isDropdown?: boolean;
  pressed?: boolean;
} & Omit<
  React.ComponentPropsWithoutRef<typeof ToolbarToggleItem>,
  'asChild' | 'value'
> &
  ToolbarVariantProps;

export const ToolbarButton = withTooltip(function ToolbarButton({
  children,
  className,
  isDropdown,
  pressed,
  size = 'sm',
  variant,
  ...props
}: ToolbarButtonProps) {
  const content = isDropdown ? (
    <>
      <div className="flex flex-1 items-center gap-2 whitespace-nowrap">
        {children}
      </div>
      <div>
        <ChevronDown className="size-3.5 text-muted-foreground" data-icon />
      </div>
    </>
  ) : (
    children
  );

  return typeof pressed === 'boolean' ? (
    <ToolbarToggleGroup disabled={props.disabled} value="single" type="single">
      <ToolbarToggleItem
        className={cn(isDropdown && 'justify-between gap-1 pr-1', className)}
        size={size}
        value={pressed ? 'single' : ''}
        variant={variant}
        {...props}
      >
        {content}
      </ToolbarToggleItem>
    </ToolbarToggleGroup>
  ) : (
    <Button
      asChild
      className={cn(
        toolbarButtonVariants({ size, variant }),
        isDropdown && 'pr-1',
        className
      )}
      size="sm"
      variant="ghost"
    >
      <ToolbarPrimitive.Button {...props}>{content}</ToolbarPrimitive.Button>
    </Button>
  );
});

export function ToolbarSplitButton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToolbarButton>) {
  return (
    <ToolbarButton
      className={cn(
        'group gap-0 px-0 hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:ring-0 aria-checked:bg-transparent aria-checked:ring-0',
        className
      )}
      {...props}
    />
  );
}

type ToolbarSplitButtonPrimaryProps = Omit<
  React.ComponentPropsWithoutRef<typeof ToolbarToggleItem>,
  'value'
> &
  ToolbarVariantProps;

export function ToolbarSplitButtonPrimary({
  children,
  className,
  size = 'sm',
  variant,
  ...props
}: ToolbarSplitButtonPrimaryProps) {
  return (
    <Button
      asChild
      className={cn(
        toolbarButtonVariants({ size, variant }),
        'rounded-r-none',
        'group-data-[pressed=true]:bg-accent group-data-[pressed=true]:text-accent-foreground',
        className
      )}
      size="sm"
      variant="ghost"
    >
      <span {...props}>{children}</span>
    </Button>
  );
}

export function ToolbarSplitButtonSecondary({
  className,
  size = 'sm',
  ...props
}: React.ComponentPropsWithoutRef<'span'> & {
  size?: ToolbarButtonSize | null;
}) {
  return (
    <Button
      asChild
      className={cn(
        toolbarButtonVariants({ size }),
        dropdownArrowSizes[size ?? 'sm'],
        'min-w-0 rounded-l-none px-0',
        'group-data-[pressed=true]:bg-accent group-data-[pressed=true]:text-accent-foreground',
        className
      )}
      size="sm"
      variant="ghost"
    >
      <span
        aria-label="More options"
        onClick={(e) => e.stopPropagation()}
        role="button"
        {...props}
      >
        <ChevronDown className="size-3.5 text-muted-foreground" data-icon />
      </span>
    </Button>
  );
}

export function ToolbarToggleItem({
  className,
  size = 'sm',
  variant,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.ToggleItem> &
  ToolbarVariantProps) {
  return (
    <Button
      asChild
      className={cn(toolbarButtonVariants({ size, variant }), className)}
      size="sm"
      variant="ghost"
    >
      <ToolbarPrimitive.ToggleItem {...props} />
    </Button>
  );
}

export function ToolbarGroup({
  children,
  className,
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'group/toolbar-group',
        'relative hidden has-[button]:flex',
        className
      )}
    >
      <div className="flex items-center gap-0.5">{children}</div>

      <div className="group-last/toolbar-group:hidden! mx-1.5 flex items-center py-1">
        <Separator className="h-5" orientation="vertical" />
      </div>
    </div>
  );
}

type TooltipProps<T extends React.ElementType> = {
  /** Free-form tooltip content, for the few controls with dynamic text. */
  tooltip?: React.ReactNode;
  /**
   * Schema id (see `getToolbarMeta`): renders the control's name, description
   * and shortcut from the toolbar schema instead of hand-written text.
   */
  toolbarId?: string;
  tooltipContentProps?: Omit<
    React.ComponentPropsWithoutRef<typeof TooltipContent>,
    'children'
  >;
  tooltipProps?: Omit<
    React.ComponentPropsWithoutRef<typeof Tooltip>,
    'children'
  >;
  tooltipTriggerProps?: React.ComponentPropsWithoutRef<typeof TooltipTrigger>;
} & React.ComponentProps<T>;

function withTooltip<T extends React.ElementType>(Component: T) {
  return function ExtendComponent({
    tooltip,
    toolbarId,
    tooltipContentProps,
    tooltipProps,
    tooltipTriggerProps,
    ...props
  }: TooltipProps<T>) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    const meta = toolbarId ? getToolbarMeta(toolbarId) : undefined;

    // Icon-only controls need an accessible name; text controls keep their own.
    const labelled =
      meta && !('aria-label' in props) ? { 'aria-label': meta.label } : {};

    const component = (
      <Component
        {...({ ...labelled, ...props } as React.ComponentProps<T>)}
      />
    );

    const content = meta ? (
      <ToolbarTooltipBody
        description={meta.description}
        engine="plate"
        label={meta.label}
        shortcut={meta.shortcut}
      />
    ) : (
      tooltip
    );

    if (content && mounted) {
      return (
        <Tooltip {...tooltipProps}>
          <TooltipTrigger asChild {...tooltipTriggerProps}>
            {/* A disabled control swallows pointer events; the span keeps its tooltip. */}
            {(props as { disabled?: boolean }).disabled ? (
              <span className="inline-flex">{component}</span>
            ) : (
              component
            )}
          </TooltipTrigger>

          <TooltipContent sideOffset={6} {...tooltipContentProps}>
            {content}
          </TooltipContent>
        </Tooltip>
      );
    }

    return component;
  };
}

/** Provides the immediate (no hover delay) tooltips every toolbar control uses. */
export function ToolbarTooltipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>;
}

export function ToolbarMenuGroup({
  children,
  className,
  label,
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioGroup> & { label?: string }) {
  return (
    <>
      <DropdownMenuSeparator
        className={cn(
          'hidden',
          'mb-0 shrink-0 peer-has-[[role=menuitem]]/menu-group:block peer-has-[[role=menuitemradio]]/menu-group:block peer-has-[[role=option]]/menu-group:block'
        )}
      />

      <DropdownMenuRadioGroup
        {...props}
        className={cn(
          'hidden',
          'peer/menu-group group/menu-group my-1.5 has-[[role=menuitem]]:block has-[[role=menuitemradio]]:block has-[[role=option]]:block',
          className
        )}
      >
        {label && (
          <DropdownMenuLabel className="select-none font-semibold text-muted-foreground text-xs">
            {label}
          </DropdownMenuLabel>
        )}
        {children}
      </DropdownMenuRadioGroup>
    </>
  );
}

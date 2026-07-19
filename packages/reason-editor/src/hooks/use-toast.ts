/**
 * @module use-toast
 * @description Thin adapter that wraps the `sonner` toast library with a
 * shadcn/ui-compatible `useToast` hook interface.
 */
import { toast } from "sonner"

/** Props accepted by the wrapper toast function returned by {@link useToast}. */
type ToastProps = {
    /** Optional heading shown in bold at the top of the toast. */
    title?: string
    /** Optional secondary text shown below the title. */
    description?: string
    /** Pass `"destructive"` to render an error-style toast. */
    variant?: "default" | "destructive"
    /** Any additional props forwarded to the underlying `sonner` toast call. */
    [key: string]: any
}

/**
 * Returns a `toast` helper and a `dismiss` helper that map the shadcn/ui
 * toast API onto the underlying `sonner` library. Destructive toasts are
 * rendered as `toast.error`.
 */
export function useToast() {
    return {
        toast: ({ title, description, variant, ...props }: ToastProps) => {
            if (variant === "destructive") {
                return toast.error(title, {
                    description,
                    ...props,
                })
            }
            return toast(title, {
                description,
                ...props,
            })
        },
        dismiss: (toastId?: string | number) => toast.dismiss(toastId),
    }
}

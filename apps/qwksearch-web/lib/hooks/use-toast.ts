import { toast } from "sonner"

type ToastProps = {
    title?: string
    description?: string
    variant?: "default" | "destructive"
    [key: string]: any
}

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

import * as ToastPrimitive from '@radix-ui/react-toast'
import { cn } from '@/lib/utils'
import { useToastStore } from './use-toast'

export function Toaster() {
  const { toasts } = useToastStore()

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          className={cn(
            'fixed bottom-4 right-4 z-50 flex w-96 rounded-lg border border-slate-200 bg-white p-4 shadow-lg animate-in slide-in-from-right-full',
            t.variant === 'destructive' && 'border-red-200 bg-red-50'
          )}
        >
          <div className="grid gap-1">
            <ToastPrimitive.Title className={cn(
              "text-sm font-bold",
              t.variant === 'destructive' ? "text-red-900" : "text-slate-900"
            )}>
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className={cn(
                "text-xs leading-relaxed",
                t.variant === 'destructive' ? "text-red-800" : "text-slate-500"
              )}>
                {t.description}
              </ToastPrimitive.Description>
            )}
          </div>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport />
    </ToastPrimitive.Provider>
  )
}

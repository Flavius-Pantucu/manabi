import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground border-input bg-card text-foreground h-10 w-full min-w-0 rounded-md border px-3 py-1 text-base outline-none transition-[color,box-shadow,border-color] duration-(--dur-1) file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        // Never colour alone: an invalid field also carries its message,
        // linked by aria-describedby at the call site.
        'aria-invalid:border-destructive aria-invalid:ring-destructive/25 aria-invalid:ring-[3px]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900',
        'placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
        'disabled:cursor-not-allowed disabled:bg-slate-100',
        invalid
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
          : 'border-slate-300 focus:border-emerald-500',
        className
      )}
      {...rest}
    />
  )
);
Input.displayName = 'Input';

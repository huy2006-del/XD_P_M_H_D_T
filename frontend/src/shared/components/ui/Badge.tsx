import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export const Badge = ({ tone = 'neutral', className, children, ...rest }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      toneClasses[tone],
      className
    )}
    {...rest}
  >
    {children}
  </span>
);

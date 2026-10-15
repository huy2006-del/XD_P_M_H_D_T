import { cn } from '@/shared/utils/cn';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export const Switch = ({ checked, onCheckedChange, disabled, ...rest }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
      'disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'bg-emerald-600' : 'bg-slate-300'
    )}
    {...rest}
  >
    <span
      className={cn(
        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-4' : 'translate-x-0.5'
      )}
    />
  </button>
);

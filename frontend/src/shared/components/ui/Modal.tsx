import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

export const Modal = ({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full rounded-2xl bg-white shadow-xl',
          'flex max-h-[90vh] flex-col',
          sizeClasses[size]
        )}
      >
        {(title || description) && (
          <header className="border-b border-slate-100 px-6 py-4">
            {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </header>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="border-t border-slate-100 px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
};

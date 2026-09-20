import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-accent-solid text-on-accent', className)}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M12 3.5 20.5 12 12 20.5 3.5 12Z" />
        <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="NIRMAN 360 — Overview" className={cn('flex items-center gap-2.5 rounded-lg', className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-fg">NIRMAN 360</span>
    </Link>
  );
}

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Time to (or since) a target. Once the target passes it counts up in the critical tone.
 * Only the large form ticks every second — smaller ones refresh each half minute.
 */
export function Countdown({ target, size = 'md', className }: {
  target: string | Date; size?: 'sm' | 'md' | 'xl'; className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), size === 'xl' ? 1000 : 30000);
    return () => clearInterval(id);
  }, [size]);

  const ms = new Date(target).getTime() - now;
  const overdue = ms < 0;
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86400000);
  const h = Math.floor((abs / 3600000) % 24);
  const m = Math.floor((abs / 60000) % 60);
  const s = Math.floor((abs / 1000) % 60);

  const scale = { sm: 'text-body', md: 'text-[22px]', xl: 'text-[40px] sm:text-[52px]' }[size];
  const unit = { sm: 'text-foot', md: 'text-foot', xl: 'text-callout' }[size];

  const parts: [number, string][] = [];
  if (d > 0) parts.push([d, 'd']);
  parts.push([h, 'h'], [m, 'm']);
  if (size === 'xl') parts.push([s, 's']);

  return (
    <div role="timer" aria-label={`${overdue ? 'Overdue by' : 'Remaining:'} ${d} days ${h} hours ${m} minutes`}
      className={cn('flex flex-wrap items-baseline gap-x-2.5 font-semibold leading-none tracking-[-0.03em]', overdue ? 'text-bad' : 'text-fg', className)}>
      {parts.map(([v, u]) => (
        <span key={u} aria-hidden className="inline-flex items-baseline">
          <span className={cn('num', scale)}>{size === 'xl' || u !== 'd' ? String(v).padStart(2, '0') : v}</span>
          <span className={cn('ml-0.5 font-medium text-fg2', unit)}>{u}</span>
        </span>
      ))}
    </div>
  );
}

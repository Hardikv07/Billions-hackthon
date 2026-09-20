import { cn, fmtDateTime } from '@/lib/utils';

const dotTone: Record<string, string> = {
  BREACH: 'bg-bad', WARNING: 'bg-warn', ACTION: 'bg-accent', EVENT: 'bg-fg3',
};

/** A vertical record of what happened and when. The label carries the meaning; the dot only reinforces it. */
export function Timeline({ items }: {
  items: { at: string | Date; label: string; detail?: string; type?: string }[];
}) {
  return (
    <ol className="relative ml-[5px] border-l border-line-strong/70 pl-6">
      {items.map((item, i) => (
        <li key={i} className="relative pb-7 last:pb-0">
          <span aria-hidden className={cn('absolute -left-[30px] top-[7px] h-2.5 w-2.5 rounded-full ring-4 ring-surface', dotTone[item.type ?? 'EVENT'] ?? 'bg-fg3')} />
          <p className="text-body font-medium text-fg">{item.label}</p>
          {item.detail && <p className="mt-0.5 text-body text-fg2">{item.detail}</p>}
          <p className="num mt-1 text-foot text-fg2">{fmtDateTime(item.at)}</p>
        </li>
      ))}
    </ol>
  );
}

import { cn } from '@/lib/utils';

interface PillMultiSelectProps {
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * A lightweight toggle-pill multi-select — used for campaign targeting
 * (countries, devices, categories, OS). Deliberately not a full combobox
 * component/library: the option lists here are short and fixed, so a
 * simple button grid is faster to use and has zero extra dependencies.
 */
export function PillMultiSelect({ options, value, onChange }: PillMultiSelectProps) {
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((opt) => {
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(opt.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input text-muted-foreground hover:bg-accent'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

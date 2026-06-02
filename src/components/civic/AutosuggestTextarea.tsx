import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  topics: string[];
  placeholder?: string;
  minChars?: number;
  maxSuggestions?: number;
  rows?: number;
}

/**
 * Premium textarea with:
 *  - Greyed-out inline AUTOCOMPLETE (Tab or → to accept)
 *  - Dropdown AUTOSUGGEST of up to N matching topics (↑ ↓ Enter / click)
 * Both draw exclusively from the supplied `topics` list.
 */
export function AutosuggestTextarea({
  value,
  onChange,
  topics,
  placeholder,
  minChars = 3,
  maxSuggestions = 5,
  rows = 5,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const query = value.trim();
  const lower = query.toLowerCase();

  const matches = useMemo(() => {
    if (query.length < minChars) return [];
    const starts: string[] = [];
    const contains: string[] = [];
    for (const t of topics) {
      const tl = t.toLowerCase();
      if (tl === lower) continue;
      if (tl.startsWith(lower)) starts.push(t);
      else if (tl.includes(lower)) contains.push(t);
      if (starts.length >= maxSuggestions) break;
    }
    return [...starts, ...contains].slice(0, maxSuggestions);
  }, [topics, query, lower, minChars, maxSuggestions]);

  // Inline ghost completion: only when the best match starts with the typed prefix
  const ghost = useMemo(() => {
    if (query.length < minChars) return "";
    const best = matches.find((m) => m.toLowerCase().startsWith(lower));
    if (!best) return "";
    return best.slice(query.length);
  }, [matches, query, lower, minChars]);

  useEffect(() => {
    setActive(0);
    setOpen(matches.length > 0);
  }, [matches]);

  const accept = (text: string) => {
    onChange(text);
    setOpen(false);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === "Tab" || e.key === "ArrowRight") && ghost) {
      // Only accept ghost when caret is at end of input
      const el = e.currentTarget;
      if (el.selectionStart === value.length && el.selectionEnd === value.length) {
        e.preventDefault();
        onChange(value + ghost);
        return;
      }
    }
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" && !e.shiftKey) {
      // Only intercept Enter if user is actively navigating suggestions
      if (matches[active]) {
        e.preventDefault();
        accept(matches[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative rounded-2xl border border-border bg-card focus-within:border-primary/50 transition-colors">
        {/* Ghost layer */}
        {ghost && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words font-body"
          >
            <span className="invisible">{value}</span>
            <span className="text-muted-foreground/50">{ghost}</span>
          </div>
        )}
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => matches.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            "relative w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed",
            "placeholder:text-muted-foreground/70 outline-none",
          )}
        />
      </div>

      {ghost && (
        <p className="mt-1.5 text-[11px] text-muted-foreground/80 tracking-wide">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 font-mono text-[10px]">Tab</kbd> or
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-muted text-foreground/80 font-mono text-[10px]">→</kbd> to accept the suggestion
        </p>
      )}

      {open && matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-2 w-full max-h-72 overflow-auto rounded-xl border border-border bg-popover shadow-elevated p-1 scrollbar-thin"
        >
          {matches.map((m, i) => (
            <li key={m}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); accept(m); }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm leading-snug transition-colors",
                  i === active ? "bg-primary/10 text-foreground" : "hover:bg-muted/60 text-foreground/90",
                )}
              >
                <HighlightMatch text={m} query={query} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0 || !query) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-medium">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}
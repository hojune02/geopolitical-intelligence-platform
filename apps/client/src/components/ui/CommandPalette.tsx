import { useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate } from 'react-router';

import { allCountries } from '../../lib/countries';
import { OPEN_PALETTE_EVENT } from '../../lib/palette';

interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  icon: string;
  to: string;
  keywords: string;
}

const PAGES: PaletteItem[] = [
  { id: 'p-brief', label: 'Briefing', hint: 'Escalation radar & top stories', icon: '◎', to: '/briefing', keywords: 'home radar brief stories escalation' },
  { id: 'p-events', label: 'Event explorer', hint: 'Filter raw events', icon: '≡', to: '/dashboard', keywords: 'events list analytics trends' },
  { id: 'p-map', label: 'Global map', hint: 'Clusters & heatmap', icon: '◍', to: '/dashboard/heatmap', keywords: 'map heatmap geography' },
];

/*
 * ⌘K / Ctrl+K anywhere. Arrow keys move, Enter opens, Esc closes.
 * Countries are matched by name or by their GDELT code.
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<PaletteItem[]>(
    () => [
      ...PAGES,
      ...allCountries().map((country) => ({
        id: `c-${country.code}`,
        label: country.name,
        hint: `Country dossier · ${country.code}`,
        icon: country.flag,
        to: `/countries/${country.code}`,
        keywords: `${country.name} ${country.code} ${country.iso2 ?? ''}`.toLowerCase(),
      })),
    ],
    [],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (needle === '') {
      return items.slice(0, 8);
    }

    return items
      .map((item) => {
        const label = item.label.toLowerCase();
        const score = label.startsWith(needle)
          ? 0
          : label.includes(needle)
            ? 1
            : item.keywords.split(' ').some((word) => word === needle)
              ? 1
              : item.keywords.includes(needle)
                ? 2
                : -1;
        return { item, score };
      })
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label))
      .slice(0, 8)
      .map((entry) => entry.item);
  }, [items, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    const onOpen = () => {
      setOpen(true);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const choose = (item: PaletteItem | undefined) => {
    if (item === undefined) return;
    setOpen(false);
    void navigate(item.to);
  };

  return (
    <div
      className="palette-backdrop"
      onMouseDown={() => {
        setOpen(false);
      }}
      role="presentation"
    >
      <div
        aria-label="Search countries and pages"
        aria-modal="true"
        className="palette"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        role="dialog"
      >
        <input
          aria-activedescendant={results[active]?.id}
          aria-controls="palette-results"
          aria-expanded="true"
          className="palette-input"
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => Math.min(results.length - 1, index + 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => Math.max(0, index - 1));
            } else if (event.key === 'Enter') {
              choose(results[active]);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder="Jump to a country or page…"
          ref={inputRef}
          role="combobox"
          value={query}
        />

        <ul className="palette-results" id="palette-results" role="listbox">
          {results.map((item, index) => (
            <li
              aria-selected={index === active}
              className={index === active ? 'palette-item active' : 'palette-item'}
              id={item.id}
              key={item.id}
              onClick={() => {
                choose(item);
              }}
              onMouseEnter={() => {
                setActive(index);
              }}
              role="option"
            >
              <span aria-hidden="true" className="palette-icon">
                {item.icon}
              </span>
              <span className="palette-label">{item.label}</span>
              <span className="palette-hint">{item.hint}</span>
            </li>
          ))}

          {results.length === 0 ? <li className="palette-empty">No matches</li> : null}
        </ul>

        <div className="palette-footer">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

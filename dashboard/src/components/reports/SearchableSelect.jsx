import { useEffect, useId, useMemo, useRef, useState } from "react";

// Small accessible combobox: type to filter, arrow keys / click to choose.
export default function SearchableSelect({ label, options, value, onChange, placeholder = "Search…", disabled = false, error = "", emptyText = "No matches" }) {
  const id = useId();
  const rootRef = useRef(null);
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (option) => {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setHighlight((index) => Math.min(index + 1, visible.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setHighlight((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && open && visible[highlight]) { event.preventDefault(); choose(visible[highlight]); }
    else if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); }
  };

  return (
    <div className="searchable-select" ref={rootRef}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-invalid={Boolean(error)}
        autoComplete="off"
        disabled={disabled}
        placeholder={selected ? selected.label : placeholder}
        value={open ? query : selected?.label || ""}
        onFocus={() => { setOpen(true); setHighlight(0); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setHighlight(0); }}
        onKeyDown={onKeyDown}
      />
      {open && !disabled && (
        <ul id={`${id}-list`} role="listbox" className="searchable-select-list">
          {visible.length === 0 && <li className="searchable-select-empty">{emptyText}</li>}
          {visible.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={index === highlight ? "is-highlighted" : ""}
              onMouseDown={(event) => { event.preventDefault(); choose(option); }}
              onMouseEnter={() => setHighlight(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
      {error && <small className="field-error" role="alert">{error}</small>}
    </div>
  );
}

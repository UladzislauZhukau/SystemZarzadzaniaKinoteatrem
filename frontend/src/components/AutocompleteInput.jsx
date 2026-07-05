import { useEffect, useRef, useState } from "react";
import {
  clearHistory,
  loadHistory,
  pushHistory,
} from "../utils/searchHistory";
import "../styles/Autocomplete.css";

// A search input that suggests matching values from `options` as you type, and
// — when `historyKey` is given — shows recent searches while the field is empty.
// The dropdown is keyboard-navigable (Arrow keys, Enter, Escape) and closes on
// outside click. Used by the movies & screenings filter bars.
export default function AutocompleteInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  maxSuggestions = 8,
  historyKey,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [history, setHistory] = useState(() =>
    historyKey ? loadHistory(historyKey) : []
  );
  const wrapRef = useRef(null);
  // Set when a value is committed via click so the following blur doesn't also
  // record the half-typed query it replaced.
  const skipBlurRef = useRef(false);

  // Close the dropdown when clicking anywhere outside the widget.
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const q = value.trim().toLowerCase();
  const suggestions = q
    ? options
        .filter((o) => o.toLowerCase().includes(q) && o.toLowerCase() !== q)
        .slice(0, maxSuggestions)
    : [];

  // While typing: matching options. While empty: recent searches.
  const showingHistory = !q && history.length > 0;
  const items = q ? suggestions : showingHistory ? history : [];

  const remember = (term) => {
    if (historyKey) setHistory(pushHistory(historyKey, term));
  };

  const choose = (val) => {
    skipBlurRef.current = true;
    onChange(val);
    remember(val);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      if (open && highlight >= 0 && items[highlight]) {
        e.preventDefault();
        choose(items[highlight]);
      } else if (value.trim()) {
        remember(value);
        setOpen(false);
      }
      return;
    }
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + items.length) % items.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const onBlur = () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    if (value.trim()) remember(value);
  };

  const onClearHistory = () => {
    skipBlurRef.current = true;
    setHistory(clearHistory(historyKey));
  };

  return (
    <div className="autocomplete" ref={wrapRef}>
      <input
        id={id}
        type="search"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      {open && items.length > 0 && (
        <ul className="autocomplete-list">
          {showingHistory && (
            <li className="autocomplete-header">
              <span>Recent searches</span>
              <button type="button" onMouseDown={onClearHistory}>
                Clear
              </button>
            </li>
          )}
          {items.map((s, i) => (
            <li
              key={s}
              className={`${showingHistory ? "history-item" : ""} ${
                i === highlight ? "active" : ""
              }`}
              onMouseDown={() => choose(s)}
              onMouseEnter={() => setHighlight(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

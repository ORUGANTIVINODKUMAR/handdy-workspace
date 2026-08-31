import { useEffect, useRef, useState } from "react";
import { Check, Palette, X } from "lucide-react";
import { themes } from "../../context/themeContextInstance";
import useTheme from "../../context/useTheme";
import "./ThemeSelector.css";

function PaletteBars({ colors, compact = false }) {
  return (
    <span className={`theme-palette-bars${compact ? " compact" : ""}`} aria-hidden="true">
      {colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
    </span>
  );
}

function ThemeSelector() {
  const { theme, changeTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const triggerRef = useRef(null);
  const currentTheme = themes.find((item) => item.id === theme) || themes[0];

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const closeModal = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const selectTheme = (themeId) => {
    changeTheme(themeId);
    closeModal();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="theme-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Palette size={18} />
        <span className="theme-trigger-label">Theme</span>
        <PaletteBars colors={currentTheme.colors} compact />
      </button>

      {open && (
        <div className="theme-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
          <section className="theme-modal" role="dialog" aria-modal="true" aria-labelledby="theme-modal-title">
            <header className="theme-modal-header">
              <div>
                <p className="theme-modal-eyebrow">Appearance</p>
                <h2 id="theme-modal-title">Choose your theme</h2>
                <p>Your selection is saved on this device.</p>
              </div>
              <button ref={closeButtonRef} type="button" className="theme-modal-close" onClick={closeModal} aria-label="Close theme chooser">
                <X size={20} />
              </button>
            </header>

            <div className="theme-current-preview">
              <PaletteBars colors={currentTheme.colors} />
              <div>
                <span>Current theme</span>
                <strong>{currentTheme.name}</strong>
                <small>{currentTheme.description}</small>
              </div>
            </div>

            <div className="theme-options-grid" role="radiogroup" aria-label="Available color themes">
              {themes.map((item) => {
                const selected = theme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`theme-card${selected ? " selected" : ""}`}
                    onClick={() => selectTheme(item.id)}
                  >
                    <span className="theme-card-preview">
                      <PaletteBars colors={item.colors} />
                      {selected && <span className="theme-selected-mark"><Check size={15} /></span>}
                    </span>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default ThemeSelector;

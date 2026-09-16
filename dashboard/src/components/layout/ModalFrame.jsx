import { useEffect, useRef } from "react";

export default function ModalFrame({ children, onClose, label = "Edit details" }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')];
    focusable()[0]?.focus();
    const handleKey = event => {
      if (event.key === "Escape") closeRef.current?.();
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0]; const last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const element = ref.current;
    element.addEventListener("keydown", handleKey);
    return () => { element.removeEventListener("keydown", handleKey); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) closeRef.current?.();
  };

  return <div ref={ref} className="crm-modal-overlay" role="dialog" aria-modal="true" aria-label={label} onMouseDown={handleBackdropClick}>{children}</div>;
}

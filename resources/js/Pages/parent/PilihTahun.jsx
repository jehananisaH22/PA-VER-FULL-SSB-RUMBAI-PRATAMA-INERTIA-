import { useEffect, useMemo, useRef, useState } from "react";
import "./PilihTahun.css";

export default function PilihTahun({
  options = [],
  placeholder = "Pilih tahun",
  className = "",
  value,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState("");
  const wrapRef = useRef(null);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? String(value || "") : localValue;
  const normalizedOptions = useMemo(() => options.map((item) => String(item)), [options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isControlled && localValue && !normalizedOptions.includes(localValue)) {
      setLocalValue("");
    }
  }, [isControlled, localValue, normalizedOptions]);

  const selectValue = (nextValue) => {
    if (!isControlled) {
      setLocalValue(nextValue);
    }
    onChange?.(nextValue);
    setIsOpen(false);
  };

  const selectedLabel = currentValue || placeholder;

  return (
    <div className={`yearSelect ${className}`.trim()} ref={wrapRef}>
      <button
        type="button"
        className="yearSelectTrigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span>{selectedLabel}</span>
        <span className={`yearSelectArrow ${isOpen ? "open" : ""}`} />
      </button>

      {isOpen && (
        <div className="yearSelectMenu">
          <button
            type="button"
            className={`yearSelectOption ${currentValue === "" ? "active" : ""}`}
            onClick={() => selectValue("")}
          >
            {placeholder}
          </button>
          {normalizedOptions.map((item) => (
            <button
              type="button"
              key={item}
              className={`yearSelectOption ${currentValue === item ? "active" : ""}`}
              onClick={() => selectValue(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


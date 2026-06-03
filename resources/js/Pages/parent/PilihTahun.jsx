import { useEffect, useRef, useState } from "react";
import "./PilihTahun.css";

export default function PilihTahun({ options = [], placeholder = "Pilih tahun", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = value || placeholder;

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
            className={`yearSelectOption ${value === "" ? "active" : ""}`}
            onClick={() => {
              setValue("");
              setIsOpen(false);
            }}
          >
            {placeholder}
          </button>
          {options.map((item) => (
            <button
              type="button"
              key={item}
              className={`yearSelectOption ${value === String(item) ? "active" : ""}`}
              onClick={() => {
                setValue(String(item));
                setIsOpen(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


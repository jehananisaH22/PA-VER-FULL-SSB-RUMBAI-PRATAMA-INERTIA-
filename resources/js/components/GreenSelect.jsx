import { useEffect, useMemo, useRef, useState } from "react"; 
import { createPortal } from "react-dom"; 

export default function GreenSelect({ 
  value, 
  options = [], 
  onChange = () => {}, 
  className = "", 
  ariaLabel = "Pilih opsi", 
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false); 
  const [openDirection, setOpenDirection] = useState("down"); 
  const [menuStyle, setMenuStyle] = useState({}); 
  const selectRef = useRef(null); 
  const menuRef = useRef(null); 
  const normalizedOptions = useMemo(
    () =>
    options.map((option) =>
    typeof option === "object" && option !== null ?
    { value: option.value, label: option.label ?? option.value } :
    { value: option, label: option }
    ),
    [options]
  ); 
  const selectedOption =
  normalizedOptions.find((option) => String(option.value) === String(value)) ||
  normalizedOptions[0] ||
  null; 

  useEffect(() => {
    if (!isOpen) return undefined; 

    const updatePosition = () => {
      const rect = selectRef.current?.getBoundingClientRect(); 
      if (!rect) return; 
      const spaceBelow = window.innerHeight - rect.bottom; 
      const spaceAbove = rect.top; 
      const nextDirection = spaceBelow < 250 && spaceAbove > spaceBelow ? "up" : "down"; 
      setOpenDirection(nextDirection); 
      setMenuStyle({ 
        left: `${rect.left}px`, 
        top: nextDirection === "up" ? `${rect.top - 8}px` : `${rect.bottom + 8}px`, 
        width: `${Math.max(rect.width, 132)}px`, 
        maxHeight: `${Math.max(
          120,
          nextDirection === "up" ? rect.top - 16 : window.innerHeight - rect.bottom - 16
        )}px`, 
        transform: nextDirection === "up" ? "translateY(-100%)" : "none"
      });
    }; 

    const handleOutsideClick = (event) => {
      if (
      !selectRef.current?.contains(event.target) &&
      !menuRef.current?.contains(event.target))
      {
        setIsOpen(false);
      }
    }; 

    updatePosition(); 
    document.addEventListener("mousedown", handleOutsideClick); 
    window.addEventListener("resize", updatePosition); 
    window.addEventListener("scroll", updatePosition, true); 
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick); 
      window.removeEventListener("resize", updatePosition); 
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]); 

  const menu = isOpen ? (
  <div
    ref={menuRef}
    className={`greenSelectMenu greenSelectPortalMenu ${openDirection === "up" ? "is-up" : ""}`}
    role="listbox"
    aria-label={ariaLabel}
    style={menuStyle}>
    
      {normalizedOptions.map((option) => {
      const isSelected = String(option.value) === String(value); 

      return (
        <button
          key={String(option.value)}
          type="button"
          role="option"
          aria-selected={isSelected}
          className={`greenSelectOption ${isSelected ? "is-selected" : ""}`}
          onClick={() => {
            onChange(option.value); 
            setIsOpen(false);
          }}>
          
            {option.label}
          </button>);

    })}
    </div>) :
  null; 

  return (
    <div
      ref={selectRef}
      className={`greenSelect ${isOpen ? "is-open" : ""} ${
      openDirection === "up" ? "is-up" : ""} ${
      disabled ? "is-disabled" : ""} ${className}`}>
      
       <button
        type="button"
        className="greenSelectTrigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}>
        
         <span>{selectedOption?.label || "-"}</span>
         <i className="greenSelectChevron" aria-hidden="true" />
      </button>

      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>);

}

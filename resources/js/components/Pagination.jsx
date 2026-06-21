import React from "react"; 
import GreenSelect from "./GreenSelect"; 

export default function Pagination({ 
  total = 0, 
  page = 1, 
  pageSize = 10, 
  onPageChange = () => {}, 
  onPageSizeChange = null, 
  showPageNumbers = true, 
  showPageInfo = true
}) {
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / Number(pageSize || 1))); 
  const current = Math.min(Math.max(1, Number(page || 1)), totalPages); 
  const firstItem = total === 0 ? 0 : (current - 1) * pageSize + 1; 
  const lastItem = Math.min(total, current * pageSize); 

  const handlePrev = () => onPageChange(Math.max(1, current - 1)); 
  const handleNext = () => onPageChange(Math.min(totalPages, current + 1)); 

  const pageNumbers = []; 
  const windowSize = 5; 
  const half = Math.floor(windowSize / 2); 
  let start = Math.max(1, current - half); 
  let end = Math.min(totalPages, start + windowSize - 1); 
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1); 

  for (let i = start; i <= end; i++) pageNumbers.push(i); 

  return (
    <div className="paginationWrap" aria-label="Pagination">
       <div className="paginationButtons">
         <button type="button" className="paginationBtn" onClick={handlePrev} disabled={current === 1}>
          Sebelumnya
        </button>

        {showPageNumbers && (
        <div className="paginationNumbers">
            {start > 1 && (
          <button type="button" className="paginationPage" onClick={() => onPageChange(1)}>
                1
              </button>)
          }
            {start > 2 && <span className="paginationEll">…</span>}
            {pageNumbers.map((p) => (
          <button
            key={p}
            type="button"
            className={`paginationPage ${p === current ? "isActive" : ""}`}
            onClick={() => onPageChange(p)}>
            
                {p}
              </button>)
          )}
            {end < totalPages - 1 && <span className="paginationEll">…</span>}
            {end < totalPages && (
          <button type="button" className="paginationPage" onClick={() => onPageChange(totalPages)}>
                {totalPages}
              </button>)
          }
          </div>)
        }

         <button type="button" className="paginationBtn" onClick={handleNext} disabled={current === totalPages}>
          Selanjutnya
        </button>
      </div>

      {showPageInfo && (
      <div className="paginationInfo">
          Menampilkan  <strong>{firstItem}</strong>–<strong>{lastItem}</strong> dari <strong>{total}</strong>
        </div>)
      }

      {onPageSizeChange ? (
      <GreenSelect
        value={pageSize}
        onChange={(nextValue) => onPageSizeChange(Number(nextValue))}
        className="paginationSizeSelect"
        ariaLabel="Pilih jumlah baris per halaman"
        options={[5, 10, 20, 50].map((s) => ({ value: s, label: `${s} / halaman` }))} />) :

      null}
    </div>);

}

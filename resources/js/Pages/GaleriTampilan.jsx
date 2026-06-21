import { useEffect, useState } from "react"; 
import "../../css/GaleriTampilan.css"; 

export default function GaleriTampilan() {
  const images = [
  "/img/1.jpg",
  "/img/2.jpg",
  "/img/3.jpg",
  "/img/4.jpg",
  "/img/5.jpg",
  "/img/6.jpg"]; 


  const [active, setActive] = useState(null);

  // Tutup modal pakai ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setActive(null);
    }; 
    window.addEventListener("keydown", onKeyDown); 
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // lock scroll saat modal kebuka
  useEffect(() => {
    document.body.style.overflow = active ? "hidden" : "auto"; 
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [active]); 

  return (
    <>
       <div className="galleryGrid">
        {images.map((src, i) => (
        <div
          className="galleryItem"
          key={i}
          onMouseEnter={() => setActive(src)}
          onMouseLeave={() => setActive(null)}>
          
             <img src={src} alt={`gallery-${i}`} />
          </div>)
        )}
      </div>

      {active && (
      <div
        className="previewOverlay"
        onMouseEnter={() => setActive(active)}
        onMouseLeave={() => setActive(null)}>
        
           <div className="previewBox" onClick={(e) => e.stopPropagation()}>
             <img className="previewImg" src={active} alt="preview" />
             <button className="previewClose" onClick={() => setActive(null)}>
              x
            </button>
          </div>
        </div>)
      }
    </>);

}

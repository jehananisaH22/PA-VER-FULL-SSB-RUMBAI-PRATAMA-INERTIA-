import React from "react";
import "../../css/SiteFooter.css";

import LogoSBB from "../../assets/LogoSBB.png";

export default function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="siteFooterContainer siteFooterInner">
        <div className="siteFooterLeft">
          <div className="siteFooterLogo">
            <img src={LogoSBB} alt="Logo Footer" />
          </div>

          <div className="siteFooterText">
            <div className="siteFooterTitle">Hubungi Kami:</div>
            <div>Sekolah Sepak Bola</div>
            <div>
              <a
                href="https://share.google/PLgF6iGHwSpxlFOV3"
                target="_blank"
                rel="noopener noreferrer"
              >
                Lapangan Mesjid Da'wah Rumbai Pekanbaru-Riau (Lihat Maps)
              </a>
            </div>
            <div>0813-6571-8172 (Coach SSB)</div>
          </div>
        </div>

        <div className="siteFooterRight">
          <a
            className="siteFooterMapCard"
            href="https://share.google/PLgF6iGHwSpxlFOV3"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Buka Google Maps"
          >
            <iframe
              className="siteFooterMapFrame"
              title="Lokasi SSB Rumbai Pratama"
              src="https://maps.google.com/maps?q=Masjid%20Da%27wah%20Rumbai%20Pekanbaru&z=14&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </a>
        </div>

        <div className="siteFooterCopy">
          2025 All Rights Reserved - Jehan A.H &amp; Bagus F.H
        </div>
      </div>
    </footer>
  );
}


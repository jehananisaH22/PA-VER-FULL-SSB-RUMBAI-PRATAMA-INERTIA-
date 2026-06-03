import "./PemilihPeran.css";
import { Head, router } from "@inertiajs/react";
import LogoSBB from "../../../assets/LogoSBB.png";

const roles = [
  {
    key: "orangtua",
    title: "Orang Tua",
    desc: "Akses info perkembangan anak, jadwal, dan pembayaran.",
  },
  {
    key: "pelatih",
    title: "Pelatih",
    desc: "Kelola latihan, absensi pemain, dan evaluasi tim.",
  },
  {
    key: "admin",
    title: "Admin",
    desc: "Kelola pengguna, berita, galeri, dan data sistem.",
  },
];

export default function PemilihPeran({ onBack, onSelectRole }) {
  const back = () => (onBack ? onBack() : router.visit("/"));
  const selectRole = (roleKey) =>
    onSelectRole ? onSelectRole(roleKey) : router.visit(`/login/${roleKey}`);

  return (
    <div className="roleSelectorPage">
      <Head title="Pilih Role Login" />
      <main className="roleSelectorShell">
        <div className="roleSelectorHeader">
          <img src={LogoSBB} alt="Logo SSB" />
          <h1>Pilih Login Role</h1>
        </div>

        <section className="roleSelectorGrid">
          {roles.map((role) => (
            <button
              key={role.key}
              type="button"
              className="roleCard"
              onClick={() => selectRole(role.key)}
            >
              <h2>{role.title}</h2>
              <p>{role.desc}</p>
              <span>Pilih Role</span>
            </button>
          ))}
        </section>

        <div className="roleSelectorActions">
          <button type="button" className="roleBackBtn" onClick={back}>
            Back
          </button>
        </div>
      </main>
    </div>
  );
}


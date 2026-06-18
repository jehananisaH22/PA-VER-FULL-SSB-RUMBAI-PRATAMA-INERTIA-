import { Head, router } from "@inertiajs/react";
import { useMemo, useState } from "react";
import LogoSBB from "../../../assets/LogoSBB.png";
import ProfileIcon from "../../../assets/Profile.png";
import "./PerbaikiProfilSiswaAdmin.css";

function calculateAgeFromBirthDate(value) {
  if (!value) return "";
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "";
}

export default function PerbaikiProfilSiswaAdmin({ userName = "Admin SSB", student = {} }) {
  const [form, setForm] = useState({
    nama_siswa: student.name || "",
    nik: student.nik || "",
    no_kk: student.familyNumber || "",
    nisn: student.nisn || "",
    tempat_lahir: student.birthPlace || "",
    tanggal_lahir: student.birthDate || "",
    nama_ortu: student.parentName || "",
    no_hp_ortu: student.parentPhone || "",
    umur: student.age || "",
    alamat: student.address || "",
    tinggi_badan: student.height || "",
    berat_badan: student.weight || "",
    foto: null,
  });
  const [preview, setPreview] = useState(student.photo || "");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const statusLabel = useMemo(
    () => (String(student.status || "").toLowerCase() === "active" ? "Aktif" : "Nonaktif"),
    [student.status]
  );

  const updateField = (key, value) => {
    setForm((current) => {
      if (key === "tanggal_lahir") {
        return { ...current, tanggal_lahir: value, umur: calculateAgeFromBirthDate(value) };
      }

      return { ...current, [key]: value };
    });
    setErrors((current) => ({ ...current, [key]: null }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;
    updateField("foto", file);

    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setErrors({});

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        payload.append(key, value);
      }
    });

    try {
      await window.axios.post(`/api/admin/siswa/${student.id}/profil`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Profil siswa berhasil disimpan.");
      setTimeout(() => router.visit("/admin/dashboard/siswa"), 650);
    } catch (error) {
      const responseErrors = error?.response?.data?.errors || {};
      setErrors(responseErrors);
      setMessage(error?.response?.data?.message || "Profil siswa belum bisa disimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="adminProfileFixPage">
      <Head title={`Perbaiki Profil - ${student.name || "Siswa"}`} />
      <header className="adminProfileFixTopbar">
        <button type="button" className="adminProfileFixLogo" onClick={() => router.visit("/admin/dashboard/siswa")}>
          <img src={LogoSBB} alt="Logo SSB" />
        </button>
        <div>
          <span>Admin</span>
          <strong>{userName}</strong>
        </div>
      </header>

      <main className="adminProfileFixMain">
        <section className="adminProfileFixHead">
          <div>
            <button type="button" className="adminProfileFixBack" onClick={() => router.visit("/admin/dashboard/siswa")}>
              Kembali
            </button>
            <h1>Perbaiki Profil Siswa</h1>
            <p>Atur foto dan data profil yang tampil pada halaman orang tua.</p>
          </div>
          <div className="adminProfileFixMiniCard">
            <span>{student.email || "-"}</span>
            <strong>{statusLabel}</strong>
          </div>
        </section>

        <form className="adminProfileFixCard" onSubmit={submitProfile}>
          <div className="adminProfileFixPhotoPanel">
            <div className="adminProfileFixPhoto">
              <img src={preview || ProfileIcon} alt="" />
            </div>
            <label className="adminProfileFixUpload">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} />
              Pilih Foto Profil
            </label>
            {errors.foto && <small className="adminProfileFixError">{errors.foto[0]}</small>}
          </div>

          <div className="adminProfileFixFields">
            <div className="adminProfileFixGroupTitle">
              <span>Identitas Siswa</span>
            </div>

            <label>
              Nama Siswa
              <input
                value={form.nama_siswa}
                onChange={(event) => updateField("nama_siswa", event.target.value)}
              />
              {errors.nama_siswa && <small>{errors.nama_siswa[0]}</small>}
            </label>

            <label>
              NIK
              <input
                inputMode="numeric"
                value={form.nik}
                onChange={(event) => updateField("nik", event.target.value)}
              />
              {errors.nik && <small>{errors.nik[0]}</small>}
            </label>

            <label>
              No KK
              <input
                inputMode="numeric"
                value={form.no_kk}
                onChange={(event) => updateField("no_kk", event.target.value)}
              />
              {errors.no_kk && <small>{errors.no_kk[0]}</small>}
            </label>

            <label>
              NISN
              <input
                inputMode="numeric"
                value={form.nisn}
                onChange={(event) => updateField("nisn", event.target.value)}
              />
              {errors.nisn && <small>{errors.nisn[0]}</small>}
            </label>

            <label>
              Tempat Lahir
              <input
                value={form.tempat_lahir}
                onChange={(event) => updateField("tempat_lahir", event.target.value)}
              />
              {errors.tempat_lahir && <small>{errors.tempat_lahir[0]}</small>}
            </label>

            <label>
              Tanggal Lahir
              <input
                type="date"
                value={form.tanggal_lahir}
                onChange={(event) => updateField("tanggal_lahir", event.target.value)}
              />
              {errors.tanggal_lahir && <small>{errors.tanggal_lahir[0]}</small>}
            </label>

            <label>
              Umur
              <input
                type="number"
                min="6"
                max="16"
                value={form.umur}
                readOnly
              />
              {errors.umur && <small>{errors.umur[0]}</small>}
            </label>

            <div className="adminProfileFixGroupTitle">
              <span>Data Orang Tua</span>
            </div>

            <label>
              Nama Orang Tua
              <input
                value={form.nama_ortu}
                onChange={(event) => updateField("nama_ortu", event.target.value)}
              />
              {errors.nama_ortu && <small>{errors.nama_ortu[0]}</small>}
            </label>

            <label>
              No HP Orang Tua
              <input
                inputMode="tel"
                value={form.no_hp_ortu}
                onChange={(event) => updateField("no_hp_ortu", event.target.value)}
              />
              {errors.no_hp_ortu && <small>{errors.no_hp_ortu[0]}</small>}
            </label>

            <div className="adminProfileFixGroupTitle">
              <span>Profil Tambahan</span>
            </div>

            <label className="adminProfileFixFull">
              Alamat
              <textarea
                value={form.alamat}
                onChange={(event) => updateField("alamat", event.target.value)}
                rows={3}
              />
              {errors.alamat && <small>{errors.alamat[0]}</small>}
            </label>

            <label>
              Tinggi Badan
              <input
                type="number"
                value={form.tinggi_badan}
                onChange={(event) => updateField("tinggi_badan", event.target.value)}
                placeholder="cm"
              />
              {errors.tinggi_badan && <small>{errors.tinggi_badan[0]}</small>}
            </label>

            <label>
              Berat Badan
              <input
                type="number"
                value={form.berat_badan}
                onChange={(event) => updateField("berat_badan", event.target.value)}
                placeholder="kg"
              />
              {errors.berat_badan && <small>{errors.berat_badan[0]}</small>}
            </label>

            {message && <p className={`adminProfileFixMessage ${Object.keys(errors).length ? "isError" : ""}`}>{message}</p>}

            <div className="adminProfileFixActions">
              <button type="button" className="secondary" onClick={() => router.visit("/admin/dashboard/siswa")}>
                Batal
              </button>
              <button type="submit" disabled={isSaving}>
                {isSaving ? "Menyimpan..." : "Simpan Profil"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react"; 
import Pagination from "../../components/Pagination"; 
import GreenSelect from "../../components/GreenSelect"; 
import { router } from "@inertiajs/react"; 
import "./HalamanPelatihAdmin.css"; 

export default function HalamanPelatihAdmin({ 
  coaches = [], 
  coachNotes = [], 
  onAddCoach, 
  onDeleteCoach, 
  onRecordAdminActivity
}) {
  const [searchText, setSearchText] = useState(""); 
  const [selectedCoachFilter, setSelectedCoachFilter] = useState("Semua Pelatih"); 
  const [deleteTarget, setDeleteTarget] = useState(null); 
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); 
  const [newCoachForm, setNewCoachForm] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    password: ""
  }); 
  const [addCoachError, setAddCoachError] = useState(""); 
  const [localCoaches, setLocalCoaches] = useState(coaches); 
  const [toast, setToast] = useState(null); 
  const [isSavingCoach, setIsSavingCoach] = useState(false); 
  const [isDeletingCoach, setIsDeletingCoach] = useState(false); 
  const [showCoachPassword, setShowCoachPassword] = useState(false); 

  useEffect(() => {
    setLocalCoaches(coaches);
  }, [coaches]); 

  useEffect(() => {
    if (!toast) return undefined; 
    const timerId = window.setTimeout(() => setToast(null), 5000); 
    return () => window.clearTimeout(timerId);
  }, [toast]); 

  const coachRows = onAddCoach || onDeleteCoach ? coaches : localCoaches; 

  const coachFilterOptions = useMemo(
    () => ["Semua Pelatih", ...coachRows.map((coach) => coach.name)],
    [coachRows]
  ); 

  const filteredCoaches = useMemo(() => {
    const query = searchText.trim().toLowerCase(); 
    if (!query) return coachRows; 
    return coachRows.filter((coach) => {
      return (
        coach.name.toLowerCase().includes(query) ||
        coach.email.toLowerCase().includes(query));

    });
  }, [coachRows, searchText]); 

  const [coachesPage, setCoachesPage] = useState(1); 
  const [coachesPageSize, setCoachesPageSize] = useState(10); 
  const totalCoaches = filteredCoaches.length; 
  const pagedCoaches = useMemo(() => {
    const start = (coachesPage - 1) * coachesPageSize; 
    return filteredCoaches.slice(start, start + coachesPageSize);
  }, [filteredCoaches, coachesPage, coachesPageSize]); 

  const filteredNotes = useMemo(() => {
    if (selectedCoachFilter === "Semua Pelatih") return coachNotes; 
    return coachNotes.filter((item) => item.coachName === selectedCoachFilter);
  }, [coachNotes, selectedCoachFilter]); 

  const [notesPage, setNotesPage] = useState(1); 
  const [notesPageSize, setNotesPageSize] = useState(8); 
  const totalNotes = filteredNotes.length; 
  const pagedNotes = useMemo(() => {
    const start = (notesPage - 1) * notesPageSize; 
    return filteredNotes.slice(start, start + notesPageSize);
  }, [filteredNotes, notesPage, notesPageSize]); 

  const handleDeleteCoach = async () => {
    if (!deleteTarget || isDeletingCoach) return; 

    setIsDeletingCoach(true); 

    try {
      if (onDeleteCoach) {
        await onDeleteCoach(deleteTarget.id);
      } else {
        const response = await window.axios.delete(`/api/admin/hapus-pelatih/${deleteTarget.id}`); 

        if (response.data?.success === false) {
          throw new Error(response.data?.message || "Pelatih gagal dihapus.");
        } 

        setLocalCoaches((prev) => prev.filter((coach) => coach.id !== deleteTarget.id)); 
        router.reload({ preserveScroll: true, preserveState: true, only: ["adminCoaches", "adminCatatanPelatih"] });
      } 

      if (selectedCoachFilter === deleteTarget.name) {
        setSelectedCoachFilter("Semua Pelatih");
      } 

      onRecordAdminActivity?.({ 
        title: "Menghapus pelatih", 
        description: deleteTarget.name
      }); 
      setDeleteTarget(null); 
      setToast({ type: "success", message: `Akun pelatih ${deleteTarget.name} berhasil dihapus.` });
    } catch (error) {
      setToast({ 
        type: "error", 
        message:
        error?.response?.data?.message ||
        error?.message ||
        "Pelatih gagal dihapus. Coba lagi."
      });
    } finally {
      setIsDeletingCoach(false);
    }
  }; 

  const closeAddModal = () => {
    setIsAddModalOpen(false); 
    setAddCoachError(""); 
    setShowCoachPassword(false); 
    setNewCoachForm({ name: "", email: "", phone: "", password: "" });
  }; 

  const handleAddCoach = async (event) => {
    event.preventDefault(); 
    if (isSavingCoach) return; 

    const name = newCoachForm.name.trim(); 
    const email = newCoachForm.email.trim().toLowerCase(); 
    const phone = newCoachForm.phone.trim(); 
    const password = newCoachForm.password.trim(); 

    if (!name || !email || !phone || !password) {
      setAddCoachError("Nama pelatih, email, no HP, dan password wajib diisi."); 
      return;
    } 

    const emailExists = coachRows.some((coach) => coach.email.toLowerCase() === email); 
    if (emailExists) {
      setAddCoachError("Email sudah digunakan. Gunakan email lain."); 
      return;
    } 

    setIsSavingCoach(true); 
    setAddCoachError(""); 

    try {
      if (onAddCoach) {
        await onAddCoach({ name, email, phone, password });
      } else {
        const response = await window.axios.post("/api/admin/tambah-pelatih", { 
          nama: name, 
          email, 
          no_hp: phone, 
          password, 
          password_confirmation: password
        }); 

        if (response.data?.success === false) {
          throw new Error(response.data?.message || "Pelatih gagal ditambahkan.");
        } 

       const savedCoach = response.data?.data?.pelatih; 
        setLocalCoaches((prev) => [
        ...prev,
        { 
          id: savedCoach?.id_pelatih || Date.now(), 
          name: savedCoach?.nama_pelatih || name, 
          email: savedCoach?.email || email, 
          phone: savedCoach?.no_hp || phone,
          accountStatus: savedCoach?.account_status || "pending",
          invitationSentAt: savedCoach?.invitation_sent_at || null,
          acceptedAt: savedCoach?.accepted_at || null
        }]
        ); 
        router.reload({ preserveScroll: true, preserveState: true, only: ["adminCoaches"] });
      } 


      closeAddModal(); 
      onRecordAdminActivity?.({ 
        title: "Menambah pelatih", 
        description: `${name} (${email})`
      }); 
      setToast({ type: "success", message: "Akun pelatih berhasil ditambahkan." });
    } catch (error) {
      setAddCoachError(
        Object.values(error?.response?.data?.errors || {})?.[0]?.[0] ||
        error?.response?.data?.message ||
        error?.message ||
        "Pelatih gagal ditambahkan. Coba lagi."
      ); 
      setToast({ type: "error", message: "Pelatih gagal ditambahkan." });
    } finally {
      setIsSavingCoach(false);
    }
  }; 

  return (
    <section className="adminCoachesPage">
      {toast ? (
      <div
        className={`adminCoachesToast ${toast.type === "error" ? "isError" : "isSuccess"}`}
        role="status">
        
           <strong>{toast.type === "error" ? "Gagal" : "Berhasil"}</strong>
           <span>{toast.message}</span>
        </div>) :
      null}

       <article className="adminCard adminCoachesCard">
         <div className="adminCoachesToolbar">
           <div className="adminCoachesToolbarLeft">
             <button
              type="button"
              className="adminCoachesAddBtn"
              onClick={() => setIsAddModalOpen(true)}>
              
              Tambah Akun +
            </button>
             <input
              type="search"
              placeholder="Cari Pelatih"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              aria-label="Cari pelatih" />
            </div>
           <p className="adminCoachesSummary">
            {totalCoaches} pelatih
          </p>
          
        </div>

         <div className="adminTableWrap adminCoachesTableWrap">
           <table>
             <thead>
               <tr>
                 <th>Nama</th>
                 <th>Email</th>
                 <th>Status Akun</th>
                 <th>Aksi</th>
              </tr>
            </thead>
             <tbody>
              {filteredCoaches.length > 0 ?
              pagedCoaches.map((coach) => (
              <tr key={coach.id}>
                     <td>{coach.name}</td>
                     <td>{coach.email}</td>
                      <td>
                       <span className={`adminCoachStatusBadge ${
                       coach.accountStatus === "accepted" ? "isAccepted" : "isPending"
                       }`}>
                        {coach.accountStatus === "accepted" ? "Diterima" : "Pending"}
                      </span>
                    </td>
                     <td>
                       <button
                    type="button"
                    className="adminCoachesDeleteBtn"
                    onClick={() => setDeleteTarget(coach)}>
                    
                        Hapus
                      </button>
                    </td>
                  </tr>)
              ) : (

              <tr>
                   <td colSpan={4} className="adminCoachesEmpty">
                    Data pelatih tidak ditemukan.
                  </td>
                </tr>)
              }
            </tbody>
          </table>
        </div>
      </article>

       <div className="adminTablePagination">
         <Pagination
          total={totalCoaches}
          page={coachesPage}
          pageSize={coachesPageSize}
          onPageChange={(p) => setCoachesPage(p)}
          onPageSizeChange={(s) => {
            setCoachesPageSize(s); 
            setCoachesPage(1);
          }} />
        
      </div>

       <article className="adminCard adminCatatanPelatihCard">
         <div className="adminCatatanPelatihHead">
           <h3>History Catatan Pelatih</h3>
           <GreenSelect
            value={selectedCoachFilter}
            onChange={setSelectedCoachFilter}
            ariaLabel="Filter catatan berdasarkan pelatih"
            className="adminCoachNotesGreenSelect"
            options={coachFilterOptions} />
          
        </div>

         <div className="adminTableWrap adminCatatanPelatihTableWrap">
           <table>
             <thead>
               <tr>
                 <th>Nama</th>
                 <th>Nama Siswa</th>
                 <th>Waktu</th>
                 <th>Catatan Pelatih</th>
              </tr>
            </thead>
             <tbody>
              {filteredNotes.length > 0 ?
              pagedNotes.map((item) => (
              <tr key={item.id}>
                     <td>{item.coachName}</td>
                     <td>{item.studentName}</td>
                     <td>{item.date}</td>
                     <td>{item.note}</td>
                  </tr>)
              ) : (

              <tr>
                   <td colSpan={4} className="adminCoachesEmpty">
                    Belum ada catatan untuk filter yang dipilih.
                  </td>
                </tr>)
              }
            </tbody>
          </table>
        </div>
      </article>

       <div className="adminTablePagination adminCatatanPelatihPagination">
         <Pagination
          total={totalNotes}
          page={notesPage}
          pageSize={notesPageSize}
          onPageChange={(p) => setNotesPage(p)}
          onPageSizeChange={(s) => {
            setNotesPageSize(s); 
            setNotesPage(1);
          }} />
        
      </div>

      {deleteTarget && (
      <div
        className="adminCoachesModalOverlay"
        role="dialog"
        aria-modal="true"
        aria-label="Konfirmasi hapus pelatih"
        onClick={() => {
          if (!isDeletingCoach) setDeleteTarget(null);
        }}>
        
           <div
          className="adminCoachesModalCard"
          onClick={(event) => event.stopPropagation()}>
          
             <h4>Hapus Akun Pelatih</h4>
             <p>
              Yakin ingin menghapus akun  <strong>{deleteTarget.name}</strong>?
            </p>
             <div className="adminCoachesModalActions">
               <button
              type="button"
              className="adminCoachesModalBtn ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeletingCoach}>
              
                Batal
              </button>
               <button
              type="button"
              className="adminCoachesModalBtn danger"
              onClick={handleDeleteCoach}
              disabled={isDeletingCoach}>
              
                {isDeletingCoach ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>)
      }

      {isAddModalOpen && (
      <div
        className="adminCoachesModalOverlay"
        role="dialog"
        aria-modal="true"
        aria-label="Tambah akun pelatih"
        onClick={closeAddModal}>
        
           <div
          className="adminCoachesModalCard adminCoachesAddModalCard"
          onClick={(event) => event.stopPropagation()}>
          
             <h4>Tambah Akun Pelatih</h4>
             <form className="adminCoachesAddForm" onSubmit={handleAddCoach}>
               <label>
                 <span>Nama Pelatih</span>
                 <input
                type="text"
                value={newCoachForm.name}
                onChange={(event) =>
                setNewCoachForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Masukkan nama pelatih"
                required />
              
              </label>
               <label>
                 <span>Email</span>
                 <input
                type="email"
                value={newCoachForm.email}
                onChange={(event) =>
                setNewCoachForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="Masukkan email"
                required />
              
              </label>
               <label>
                 <span>No HP</span>
                 <input
                type="tel"
                value={newCoachForm.phone}
                onChange={(event) =>
                setNewCoachForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="Contoh: 081234567890"
                required />
              
              </label>
               <label>
                 <span>Password</span>
                 <div className="adminCoachesPasswordField">
                   <input
                  type={showCoachPassword ? "text" : "password"}
                  value={newCoachForm.password}
                  onChange={(event) =>
                  setNewCoachForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="Set password akun"
                  required />
                
                   <button
                  type="button"
                  className="adminCoachesPasswordToggle"
                  onClick={() => setShowCoachPassword((prev) => !prev)}
                  aria-label={showCoachPassword ? "Sembunyikan password" : "Tampilkan password"}
                  title={showCoachPassword ? "Sembunyikan password" : "Tampilkan password"}>
                  
                    {showCoachPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                         <path d="M3 3l18 18" />
                         <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                         <path d="M9.3 5.3A10.8 10.8 0 0 1 12 5c5 0 8.5 4.1 9.7 6.2a1.6 1.6 0 0 1 0 1.6 14.8 14.8 0 0 1-2.5 3.1" />
                         <path d="M6.6 6.6a14.5 14.5 0 0 0-4.3 4.6 1.6 1.6 0 0 0 0 1.6C3.5 14.9 7 19 12 19a10.9 10.9 0 0 0 4.2-.8" />
                      </svg>) : (

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                         <path d="M2.3 11.2a1.6 1.6 0 0 0 0 1.6C3.5 14.9 7 19 12 19s8.5-4.1 9.7-6.2a1.6 1.6 0 0 0 0-1.6C20.5 9.1 17 5 12 5s-8.5 4.1-9.7 6.2Z" />
                         <circle cx="12" cy="12" r="3" />
                      </svg>)
                  }
                  </button>
                </div>
              </label>
              {addCoachError && <p className="adminCoachesFormError">{addCoachError}</p>}
               <div className="adminCoachesModalActions">
                 <button type="button" className="adminCoachesModalBtn ghost" onClick={closeAddModal}>
                  Batal
                </button>
                 <button type="submit" className="adminCoachesModalBtn success" disabled={isSavingCoach}>
                  {isSavingCoach ? "Menyimpan..." : "Simpan Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>)
      }
    </section>);

}

import { useEffect, useMemo, useRef, useState } from "react"; 
import { router } from "@inertiajs/react"; 
import TataLetakPelatih from "./TataLetakPelatih"; 
import "./CatatanPelatih.css"; 
import ProfileIcon from "../../../assets/Profile.png"; 

const categoryOptions = [
{ value: "", label: "Pilih Kategori Usia" },
...Array.from({ length: 11 }, (_, index) => {
  const age = index + 6; 
  return { value: `u${age}`, label: `U-${age}` };
})]; 


const categoryLabel = Object.fromEntries(
  categoryOptions.filter((option) => option.value).map((option) => [option.value, option.label])
); 
const MAX_NOTE_CHARS = 280; 
const CURRENT_COACH = "Pelatih"; 
const coachNotesToastStorageKey = "ssb-coach-notes-toast"; 
const coachNotesToastElementId = "ssb-coach-notes-toast"; 

function readStoredCoachNotesToast() {
  if (typeof window === "undefined") return null; 

  try {
    const storedToast = window.sessionStorage.getItem(coachNotesToastStorageKey); 
    return storedToast ? JSON.parse(storedToast) : null;
  } catch {
    return null;
  }
} 

function removeCoachNotesToastElement() {
  if (typeof document === "undefined") return; 

  const existingToast = document.getElementById(coachNotesToastElementId); 
  if (existingToast) {
    existingToast.remove();
  }
} 

function showCoachNotesToast(nextToast) {
  if (typeof window === "undefined" || typeof document === "undefined" || !nextToast) return; 

  removeCoachNotesToastElement(); 
  window.sessionStorage.setItem(coachNotesToastStorageKey, JSON.stringify(nextToast)); 

  const toastElement = document.createElement("div"); 
  toastElement.id = coachNotesToastElementId; 
  toastElement.className = `coachNotesToast ${nextToast.type === "error" ? "isError" : "isSuccess"}`; 
  toastElement.setAttribute("role", "status"); 

  const titleElement = document.createElement("strong"); 
  titleElement.textContent = nextToast.type === "error" ? "Gagal" : "Berhasil"; 

  const messageElement = document.createElement("span"); 
  messageElement.textContent = nextToast.message || ""; 

  const closeButton = document.createElement("button"); 
  closeButton.type = "button"; 
  closeButton.setAttribute("aria-label", "Tutup notifikasi"); 
  closeButton.textContent = "x"; 
  closeButton.addEventListener("click", () => {
    window.sessionStorage.removeItem(coachNotesToastStorageKey); 
    removeCoachNotesToastElement();
  }); 

  toastElement.append(titleElement, messageElement, closeButton); 
  document.body.appendChild(toastElement); 

  if (nextToast.autoCloseMs) {
    window.setTimeout(() => {
      const storedToast = readStoredCoachNotesToast(); 
      if (storedToast?.id === nextToast.id) {
        window.sessionStorage.removeItem(coachNotesToastStorageKey); 
        removeCoachNotesToastElement();
      }
    }, nextToast.autoCloseMs);
  }
} 

function notifyCoachNotes(type, message) {
  showCoachNotesToast({ 
    id: Date.now(), 
    type, 
    message, 
    autoCloseMs: 5000
  });
} 

function getTodayDate() {
  const now = new Date(); 
  const dd = String(now.getDate()).padStart(2, "0"); 
  const mm = String(now.getMonth() + 1).padStart(2, "0"); 
  const yyyy = now.getFullYear(); 
  return `${dd}/${mm}/${yyyy}`;
} 

function formatDateLong(dateText) {
  const [dd, mm, yyyy] = String(dateText || "").split("/"); 
  const monthNames = { 
    "01": "Januari", 
    "02": "Februari", 
    "03": "Maret", 
    "04": "April", 
    "05": "Mei", 
    "06": "Juni", 
    "07": "Juli", 
    "08": "Agustus", 
    "09": "September", 
    "10": "Oktober", 
    "11": "November", 
    "12": "Desember"
  }; 
  if (!dd || !mm || !yyyy) return dateText; 
  return `${dd} ${monthNames[mm] || mm} ${yyyy}`;
} 

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
       <path
        d="M5 7.5 10 12.5 15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round" />
      
    </svg>);

} 

function CoachNotesSelect({ value, onChange, options, ariaLabel, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false); 
  const rootRef = useRef(null); 
  const selectedOption = options.find((option) => option.value === value) || options[0]; 

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }; 

    document.addEventListener("mousedown", handleOutsideClick); 
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []); 

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]); 

  return (
    <div
      className={`coachNotesCustomSelect ${isOpen ? "isOpen" : ""} ${disabled ? "isDisabled" : ""}`}
      ref={rootRef}>
      
       <button
        type="button"
        className="coachNotesSelectTrigger"
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}>
        
         <span>{selectedOption?.label}</span>
         <span className="coachNotesSelectIcon">
           <ChevronDownIcon />
        </span>
      </button>

      {isOpen ? (
      <div className="coachNotesSelectMenu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
        <button
          key={option.value || "empty"}
          type="button"
          role="option"
          aria-selected={option.value === value}
          className={`coachNotesSelectOption ${option.value === value ? "isSelected" : ""}`}
          onClick={() => {
            onChange(option.value); 
            setIsOpen(false);
          }}>
          
              {option.label}
            </button>)
        )}
        </div>) :
      null}
    </div>);

} 

export default function CatatanPelatih(props) {
  const { 
    notes: incomingNotes = [], 
    studentDirectory = [], 
    onSaveNote, 
    onDeleteNote, 
    currentCoachName = CURRENT_COACH
  } = props; 
  const [activeSection, setActiveSection] = useState("input"); 
  const [selectedCategory, setSelectedCategory] = useState(""); 
  const [selectedPlayer, setSelectedPlayer] = useState(""); 
  const [noteText, setNoteText] = useState(""); 
  const [localNotes, setLocalNotes] = useState(incomingNotes); 
  const [isSaving, setIsSaving] = useState(false); 
  const [deletingNoteIds, setDeletingNoteIds] = useState([]); 
  const [deleteTarget, setDeleteTarget] = useState(null); 

  useEffect(() => {
    setLocalNotes(incomingNotes);
  }, [incomingNotes]); 

  useEffect(() => {
    const storedToast = readStoredCoachNotesToast(); 
    if (storedToast) {
      showCoachNotesToast(storedToast);
    } 

    return removeCoachNotesToastElement;
  }, []); 

  const players = useMemo(
    () => {
      if (!selectedCategory) return []; 

      const playersFromDirectory = studentDirectory.
      filter((item) => item.category === selectedCategory).
      map((item) => ({ id: item.id, name: item.name, category: item.category })); 

      return playersFromDirectory;
    },
    [selectedCategory, studentDirectory]
  ); 

  const playerOptions = useMemo(
    () => [
    { value: "", label: "Pilih Nama Siswa" },
    ...players.map((player) => ({ value: String(player.id), label: player.name }))],

    [players]
  ); 

  const selectedPlayerData = useMemo(
    () => players.find((player) => String(player.id) === String(selectedPlayer)) || null,
    [players, selectedPlayer]
  ); 

  const noteLength = noteText.length; 
  const canSave = Boolean(
    selectedCategory &&
    selectedPlayer &&
    noteText.trim() &&
    noteLength <= MAX_NOTE_CHARS
  ); 

  const saveNoteToServer = async (note) => {
    if (!window.axios) return false; 

    if (!note.studentId) return false; 

    const response = await window.axios.post(
      "/api/pelatih/catatan-pelatih/tambah",
      { 
        catatan: note.note, 
        data: [{ id_siswa: note.studentId }]
      },
      { timeout: 15000 }
    ); 

    if (response.data?.status === false) {
      throw new Error(response.data?.message || "Catatan gagal disimpan.");
    } 

    const savedNote = response.data?.data?.[0]; 
    if (!savedNote?.id_catatan) return true; 

    return {
      ...note, 
      id: savedNote.id_catatan, 
      coach: savedNote.nama_pelatih || note.coach, 
      date: getTodayDate()
    };
  }; 

  const handleSave = async () => {
    if (!canSave || isSaving) return; 
    if (!selectedPlayerData) return; 

    const newNote = { 
      id: Date.now(), 
      studentId: selectedPlayerData.id, 
      category: selectedCategory, 
      player: selectedPlayerData.name, 
      note: noteText.trim(), 
      coach: currentCoachName, 
      date: getTodayDate()
    }; 

    setIsSaving(true); 
    let saved = false; 

    try {
      const saveResult = onSaveNote ? await onSaveNote(newNote) : await saveNoteToServer(newNote); 
      if (saveResult === false) {
        notifyCoachNotes("error", "Catatan gagal disimpan. Data siswa tidak valid."); 
        return;
      } 

      saved = true; 
      setNoteText(""); 
      setActiveSection("recap"); 
      notifyCoachNotes("success", "Catatan pelatih berhasil dikirim."); 
      setLocalNotes((prev) => [saveResult && saveResult !== true ? saveResult : newNote, ...prev]); 
      router.reload({ preserveScroll: true, preserveState: true, only: ["notes"] });
    } catch (error) {
      notifyCoachNotes(
        "error",
        error?.response?.data?.message ||
        error?.message ||
        "Catatan gagal disimpan. Coba lagi."
      );
    } finally {
      setIsSaving(false);
    } 

    if (!saved) return;
  }; 

  const deleteNoteFromServer = async (noteId) => {
    if (!window.axios) return false; 

    const response = await window.axios.delete(`/api/pelatih/catatan-pelatih/hapus/${noteId}`); 
    return response.data?.status !== false;
  }; 

  const handleDeleteNote = async (noteId) => {
    if (deletingNoteIds.includes(noteId)) return; 

    setDeletingNoteIds((prev) => [...prev, noteId]); 
    removeCoachNotesToastElement(); 

    try {
      const deleteResult = onDeleteNote ?
      await onDeleteNote(noteId) :
      await deleteNoteFromServer(noteId); 

      if (deleteResult === false) return; 

      setLocalNotes((prev) => prev.filter((note) => note.id !== noteId)); 
      setDeleteTarget(null); 
      notifyCoachNotes("success", "Catatan berhasil dihapus."); 
      router.reload({ preserveScroll: true, only: ["notes"] });
    } catch {
      notifyCoachNotes("error", "Catatan gagal dihapus. Coba lagi."); 
      return;
    } finally {
      setDeletingNoteIds((prev) => prev.filter((id) => id !== noteId));
    }
  }; 

  return (
    <TataLetakPelatih activeTab="notes" title="Catatan Pelatih" {...props}>
       <section className="coachAttendanceSwitchWrap">
         <button
          type="button"
          className={`coachAttendanceSwitch ${activeSection === "input" ? "is-active" : ""}`}
          onClick={() => setActiveSection("input")}>
          
          Input Catatan
        </button>
         <button
          type="button"
          className={`coachAttendanceSwitch ${activeSection === "recap" ? "is-active" : ""}`}
          onClick={() => setActiveSection("recap")}>
          
          Rekap Catatan
        </button>
      </section>

      {activeSection === "input" ? (
      <section className="coachCard coachNotesInputCard coachSectionSwap">
           <h2>Input Catatan Pelatih</h2>

           <div className="coachNotesFilters">
             <div className="coachNotesField">
               <span>Kategori Usia</span>
               <CoachNotesSelect
              value={selectedCategory}
              onChange={(nextCategory) => {
                setSelectedCategory(nextCategory); 
                setSelectedPlayer("");
              }}
              options={categoryOptions}
              ariaLabel="Pilih kategori usia catatan pelatih" />
            
            </div>

             <div className="coachNotesField">
               <span>Nama Siswa</span>
               <CoachNotesSelect
              value={selectedPlayer}
              onChange={setSelectedPlayer}
              options={playerOptions}
              disabled={!selectedCategory}
              ariaLabel="Pilih nama siswa catatan pelatih" />
            
            </div>
          </div>

           <textarea
          className="coachNotesTextarea"
          placeholder="Masukkan Komentar"
          value={noteText}
          maxLength={MAX_NOTE_CHARS}
          required
          onChange={(event) => setNoteText(event.target.value)} />
        
           <div className="coachNotesMeta">
             <small>Komentar wajib diisi. Maksimal {MAX_NOTE_CHARS} karakter.</small>
             <small className={noteLength >= MAX_NOTE_CHARS ? "is-limit" : ""}>
              {noteLength}/{MAX_NOTE_CHARS}
            </small>
          </div>

           <div className="coachNotesSaveRow">
             <button
            type="button"
            className="coachNotesSaveBtn"
            disabled={!canSave || isSaving}
            onClick={handleSave}>
            
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </section>) : (

      <div className="coachSectionSwap">
           <section className="coachCard coachNotesLatestCard">
             <h2>Catatan Pelatih Terkini</h2>
             <div className="coachNotesLatestList">
              {localNotes.length > 0 ? localNotes.map((item) => (
            <article key={`latest-${item.id}`} className="coachNotesLatestItem">
                   <div>
                     <h3>
                      {item.player} ({categoryLabel[item.category] || item.category})
                    </h3>
                     <p>{item.note}</p>
                  </div>
                   <div className="coachNotesLatestMeta">
                     <span>
                       <img src={ProfileIcon} alt="" />
                      Posted by {item.coach}
                    </span>
                     <time>{formatDateLong(item.date)}</time>
                  </div>
                </article>)
            ) : <p>Belum ada catatan pelatih.</p>}
            </div>
          </section>

           <section className="coachCard coachTableCard coachNotesRecapCard">
             <h2>Rekap Catatan Pelatih</h2>
             <div className="coachTableWrap">
               <table className="coachTable">
                 <thead>
                   <tr>
                     <th>Tanggal</th>
                     <th>Kategori</th>
                     <th>Nama Siswa</th>
                     <th>Catatan</th>
                     <th>Pelatih</th>
                     <th>Aksi</th>
                  </tr>
                </thead>
                 <tbody>
                  {localNotes.length > 0 ? localNotes.map((item) => (
                <tr key={item.id}>
                       <td>{item.date}</td>
                       <td>{categoryLabel[item.category] || item.category}</td>
                       <td>{item.player}</td>
                       <td>{item.note}</td>
                       <td>{item.coach}</td>
                       <td>
                        {item.coach === currentCoachName ? (
                    <button
                      type="button"
                      className="coachNoteDeleteBtn"
                      disabled={deletingNoteIds.includes(item.id)}
                      onClick={() => setDeleteTarget(item)}>
                      
                            {deletingNoteIds.includes(item.id) ? "Menghapus..." : "Hapus"}
                          </button>) : (

                    <span className="coachNoteDeleteLocked">Terkunci</span>)
                    }
                      </td>
                    </tr>)
                ) : (
                <tr>
                       <td colSpan={6}>Belum ada rekap catatan.</td>
                    </tr>)
                }
                </tbody>
            </table>
          </div>
          </section>
        </div>)
      }

      {deleteTarget ? (
      <div className="coachModalOverlay" role="dialog" aria-modal="true" aria-label="Konfirmasi hapus catatan">
           <div className="coachModalCard">
             <h3>Konfirmasi Hapus</h3>
             <p>Apakah yakin ingin menghapus catatan untuk {deleteTarget.player}?</p>
             <div className="coachModalActions">
               <button
              type="button"
              className="coachModalBtn ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deletingNoteIds.includes(deleteTarget.id)}>
              
                Tidak
              </button>
               <button
              type="button"
              className="coachModalBtn primary"
              onClick={() => handleDeleteNote(deleteTarget.id)}
              disabled={deletingNoteIds.includes(deleteTarget.id)}>
              
                {deletingNoteIds.includes(deleteTarget.id) ? "Menghapus..." : "Iya"}
              </button>
            </div>
          </div>
        </div>) :
      null}
    </TataLetakPelatih>);

}

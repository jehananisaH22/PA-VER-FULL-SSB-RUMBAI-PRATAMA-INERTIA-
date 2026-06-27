import { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "../../components/Pagination";
import { router } from "@inertiajs/react";
import "./BagianPrestasiAdmin.css";

const categoryOptions = [
{ value: "", label: "Pilih Kategori Umur" },
...Array.from({ length: 11 }, (_, index) => {
  const age = index + 6;
  return { value: `U-${age}`, label: `U-${age}` };
})];


function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
       <path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.42 1.41-1.41-4.42-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
    </svg>);

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

function AdminAchievementsSelect({ value, onChange, options, ariaLabel }) {
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

  return (
    <div className={`adminAchievementsSelect ${isOpen ? "isOpen" : ""}`} ref={rootRef}>
       <button
        type="button"
        className="adminAchievementsSelectTrigger"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}>

         <span>{selectedOption.label}</span>
         <span className="adminAchievementsSelectIcon">
           <ChevronDownIcon />
        </span>
      </button>

      {isOpen ? (
      <div className="adminAchievementsSelectMenu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
        <button
          key={option.value || "placeholder"}
          type="button"
          role="option"
          aria-selected={option.value === value}
          className={`adminAchievementsSelectOption ${option.value === value ? "isSelected" : ""}`}
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

export default function BagianPrestasiAdmin({
  students = [],
  achievements = [],
  onAddAchievement,
  onRecordAdminActivity
}) {
  const [activeTab, setActiveTab] = useState("input");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [achievementTitle, setAchievementTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [toast, setToast] = useState(null);
  const [localAchievements, setLocalAchievements] = useState(achievements);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAchievementId, setEditingAchievementId] = useState(null);
  const [editingAchievementTitle, setEditingAchievementTitle] = useState("");
  const [deletingAchievementId, setDeletingAchievementId] = useState(null);
  const [isUpdatingAchievement, setIsUpdatingAchievement] = useState(false);

  useEffect(() => {
    setLocalAchievements(achievements);
  }, [achievements]);

  useEffect(() => {
    if (!statusMessage) return undefined;
    const timeoutId = setTimeout(() => setStatusMessage(""), 5000);
    return () => clearTimeout(timeoutId);
  }, [statusMessage]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  const selectedStudents = useMemo(
    () =>
    students.filter((item) =>
    selectedStudentIds.some((studentId) => Number(studentId) === Number(item.id))
    ),
    [selectedStudentIds, students]
  );

  const filteredStudents = useMemo(() => {
    if (!selectedCategory) return [];

    const normalizedQuery = studentQuery.trim().toLowerCase();
    return students.filter((student) => {
      const categoryMatch = student.category === selectedCategory;
      const queryMatch = !normalizedQuery || student.name.toLowerCase().includes(normalizedQuery);
      return categoryMatch && queryMatch;
    });
  }, [selectedCategory, studentQuery, students]);

  const achievementRows = localAchievements;

  const sortedAchievements = useMemo(
    () => [...achievementRows].sort((leftItem, rightItem) => rightItem.createdAt - leftItem.createdAt),
    [achievementRows]
  );

  const [achievementsPage, setAchievementsPage] = useState(1);
  const [achievementsPageSize, setAchievementsPageSize] = useState(10);
  const totalAchievements = sortedAchievements.length;
  const pagedAchievements = useMemo(() => {
    const start = (achievementsPage - 1) * achievementsPageSize;
    return sortedAchievements.slice(start, start + achievementsPageSize);
  }, [sortedAchievements, achievementsPage, achievementsPageSize]);

  const handleSave = async () => {
    if (isSaving) return;

    const title = achievementTitle.trim();

    if (selectedStudentIds.length === 0 || !title) {
      setStatusMessage("Pilih siswa dan isi nama prestasi terlebih dahulu.");
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      if (onAddAchievement) {
        await Promise.all(
          selectedStudentIds.map((studentId) =>
          onAddAchievement({
            studentId,
            title
          })
          )
        );
      } else {
        const response = await window.axios.post("/api/admin/prestasi/tambah-prestasi", {
          id_siswa: selectedStudentIds,
          nama_prestasi: title
        });

        if (response.data?.success === false) {
          throw new Error(response.data?.message || "Prestasi gagal disimpan.");
        }

        const savedAchievements = Array.isArray(response.data?.data) ? response.data.data : [];
        const createdAt = Date.now();
        const dateLabel = new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        });
        const newRows = selectedStudents.map((student, index) => ({
          id: savedAchievements[index]?.id_pencapaian || `${createdAt}-${student.id}`,
          studentId: student.id,
          studentName: student.name || "-",
          category: student.category || "-",
          title,
          dateLabel,
          createdAt: createdAt - index
        }));

        setLocalAchievements((prev) => [...newRows, ...prev]);
        router.reload({ preserveScroll: true, preserveState: true, only: ["achievements"] });
      }

      setAchievementTitle("");
      setStudentQuery("");
      setSelectedStudentIds([]);
      setSelectedCategory("");
      setStatusMessage("Prestasi berhasil disimpan.");
      setToast({ type: "success", message: "Prestasi berhasil disimpan." });
      onRecordAdminActivity?.({
        title: "Menambah prestasi",
        description: `${selectedStudents.map((student) => student.name).join(", ") || "Siswa"} - ${title}`
      });
      setActiveTab("history");
    } catch (error) {
      const message =
      Object.values(error?.response?.data?.errors || {})?.[0]?.[0] ||
      error?.response?.data?.message ||
      error?.message ||
      "Prestasi gagal disimpan. Coba lagi.";

      setStatusMessage(message);
      setToast({ type: "error", message });
    } finally {
      setIsSaving(false);
    }
  };

  const updateAchievementRows = (updater) => {
    setLocalAchievements((prev) => updater(prev));
  };

  const beginEditAchievement = (item) => {
    setEditingAchievementId(item.id);
    setEditingAchievementTitle(item.title || "");
    setStatusMessage("");
  };

  const cancelEditAchievement = () => {
    setEditingAchievementId(null);
    setEditingAchievementTitle("");
  };

  const handleUpdateAchievement = async (item) => {
    const title = editingAchievementTitle.trim();

    if (!title) {
      setStatusMessage("Nama prestasi tidak boleh kosong.");
      return;
    }

    setIsUpdatingAchievement(true);
    setStatusMessage("");

    try {
      const response = await window.axios.put(`/api/admin/prestasi/${item.id}`, {
        nama_prestasi: title
      });

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Prestasi gagal diperbarui.");
      }

      updateAchievementRows((prev) =>
        prev.map((achievement) =>
          Number(achievement.id) === Number(item.id) ? { ...achievement, title } : achievement
        )
      );
      cancelEditAchievement();
      setStatusMessage("Prestasi berhasil diperbarui.");
      setToast({ type: "success", message: "Prestasi berhasil diperbarui." });
      router.reload({ preserveScroll: true, preserveState: true, only: ["achievements"] });
    } catch (error) {
      const message =
        Object.values(error?.response?.data?.errors || {})?.[0]?.[0] ||
        error?.response?.data?.message ||
        error?.message ||
        "Prestasi gagal diperbarui. Coba lagi.";

      setStatusMessage(message);
      setToast({ type: "error", message });
    } finally {
      setIsUpdatingAchievement(false);
    }
  };

  const handleDeleteAchievement = async (item) => {
    const confirmed = window.confirm(`Hapus prestasi "${item.title}" dari ${item.studentName}?`);
    if (!confirmed) return;

    setDeletingAchievementId(item.id);
    setStatusMessage("");

    try {
      const response = await window.axios.delete(`/api/admin/prestasi/${item.id}`);

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Prestasi gagal dihapus.");
      }

      updateAchievementRows((prev) =>
        prev.filter((achievement) => Number(achievement.id) !== Number(item.id))
      );
      if (Number(editingAchievementId) === Number(item.id)) {
        cancelEditAchievement();
      }
      setStatusMessage("Prestasi berhasil dihapus.");
      setToast({ type: "success", message: "Prestasi berhasil dihapus." });
      router.reload({ preserveScroll: true, preserveState: true, only: ["achievements"] });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Prestasi gagal dihapus. Coba lagi.";

      setStatusMessage(message);
      setToast({ type: "error", message });
    } finally {
      setDeletingAchievementId(null);
    }
  };

  return (
    <section className="adminAchievementsSection">
      {toast ? (
      <div
        className={`adminAchievementsToast ${toast.type === "error" ? "isError" : "isSuccess"}`}
        role="status">

           <strong>{toast.type === "error" ? "Gagal" : "Berhasil"}</strong>
           <span>{toast.message}</span>
        </div>) :
      null}

       <article className="adminAchievementsPanel">
         <div className="adminAchievementsTabs" role="tablist" aria-label="Prestasi admin">
           <button
            type="button"
            className={activeTab === "input" ? "isActive" : ""}
            onClick={() => setActiveTab("input")}>

            Input Prestasi
          </button>
           <button
            type="button"
            className={activeTab === "history" ? "isActive" : ""}
            onClick={() => setActiveTab("history")}>

            History Prestasi
          </button>
        </div>

        {activeTab === "input" ? (
        <div className="adminAchievementsBody">
             <div className="adminAchievementsHead">
               <h2>Input Prestasi</h2>
               <p>Pilih kategori, cari siswa, lalu simpan prestasi baru ke riwayat admin.</p>
            </div>

             <div className="adminAchievementsFormGrid">
               <div className="adminAchievementsForm">
                 <div className="adminAchievementsField">
                   <span>Kategori Umur</span>
                   <AdminAchievementsSelect
                  value={selectedCategory}
                  onChange={(nextCategory) => {
                    setSelectedCategory(nextCategory);
                    setSelectedStudentIds((current) => {
                      if (!nextCategory) return current;
                      const allowedIds = new Set(
                        students.
                        filter((student) => student.category === nextCategory).
                        map((student) => Number(student.id))
                      );
                      return current.filter((studentId) => allowedIds.has(Number(studentId)));
                    });
                  }}
                  options={categoryOptions}
                  ariaLabel="Pilih kategori umur prestasi" />

                </div>

                 <label className="adminAchievementsField">
                   <span>Cari Siswa</span>
                   <div className="adminAchievementsSearch">
                     <input
                    type="search"
                    value={studentQuery}
                    onChange={(event) => setStudentQuery(event.target.value)}
                    placeholder="Cari nama siswa"
                    disabled={!selectedCategory} />

                     <SearchIcon />
                  </div>
                </label>

                 <label className="adminAchievementsField">
                   <span>Nama Prestasi</span>
                   <input
                  type="text"
                  value={achievementTitle}
                  onChange={(event) => setAchievementTitle(event.target.value)}
                  placeholder="Input nama prestasi" />

                </label>

                 <div className="adminAchievementsActions">
                   <button
                  type="button"
                  className="adminAchievementsSaveButton"
                  onClick={handleSave}
                  disabled={isSaving || selectedStudentIds.length === 0 || !achievementTitle.trim()}>

                    {isSaving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>

                {statusMessage && <p className="adminAchievementsStatus">{statusMessage}</p>}
              </div>

               <aside className="adminAchievementsPickerCard">
                 <div className="adminAchievementsPickerHead">
                   <h3>Pilih Siswa</h3>
                   <span>{selectedCategory ? `${selectedStudentIds.length} dipilih` : "Pilih kategori dulu"}</span>
                </div>

                {selectedCategory && selectedStudents.length > 0 ? (
              <div className="adminAchievementsSelectedChips" aria-label="Siswa terpilih">
                    {selectedStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() =>
                  setSelectedStudentIds((current) =>
                  current.filter((studentId) => Number(studentId) !== Number(student.id))
                  )
                  }>

                         <span>{student.name}</span>
                         <i aria-hidden="true">x</i>
                      </button>)
                )}
                  </div>) :
              null}

                 <div className="adminAchievementsStudentList">
                  {filteredStudents.length > 0 ?
                filteredStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className={`adminAchievementsStudentItem ${
                  selectedStudentIds.some((studentId) => Number(studentId) === Number(student.id)) ?
                  "isActive" :
                  ""}`
                  }
                  onClick={() => {
                    setSelectedStudentIds((current) => {
                      const isSelected = current.some(
                        (studentId) => Number(studentId) === Number(student.id)
                      );
                      if (isSelected) {
                        return current.filter(
                          (studentId) => Number(studentId) !== Number(student.id)
                        );
                      }
                      return [...current, student.id];
                    });
                    setStudentQuery("");
                  }}>

                         <strong>{student.name}</strong>
                         <span>{student.category}</span>
                      </button>)
                ) : (

                <div className="adminAchievementsEmpty">
                      {selectedCategory ?
                  "Belum ada siswa yang cocok dengan kategori atau pencarian." :
                  "Pilih kategori umur terlebih dahulu untuk menampilkan nama siswa."}
                    </div>)
                }
                </div>
              </aside>
            </div>
          </div>) : (

        <div className="adminAchievementsBody">
             <div className="adminAchievementsHead">
               <h2>History Prestasi</h2>
               <p>Riwayat prestasi siswa yang sudah diinput admin tersusun dari yang terbaru.</p>
            </div>

             <div className="adminAchievementsHistoryTable">
               <table>
                 <thead>
                   <tr>
                     <th>No</th>
                     <th>Nama</th>
                     <th>Kategori Umur</th>
                     <th>Nama Prestasi</th>
                     <th>Aksi</th>
                  </tr>
                </thead>
                 <tbody>
                  {pagedAchievements.length > 0 ?
                pagedAchievements.map((item, index) => (
                <tr key={item.id}>
                         <td>{(achievementsPage - 1) * achievementsPageSize + index + 1}</td>
                         <td>{item.studentName}</td>
                         <td>{item.category}</td>
                         <td>
                          {Number(editingAchievementId) === Number(item.id) ? (
                          <div className="adminAchievementsEditWrap">
                             <input
                              type="text"
                              value={editingAchievementTitle}
                              onChange={(event) => setEditingAchievementTitle(event.target.value)}
                              aria-label={`Edit prestasi ${item.studentName}`} />
                             <span>{item.dateLabel}</span>
                            </div>) : (
                            <div className="adminAchievementsHistoryTitle">
                               <strong>{item.title}</strong>
                               <span>{item.dateLabel}</span>
                            </div>)
                          }
                        </td>
                         <td>
                           <div className="adminAchievementsRowActions">
                            {Number(editingAchievementId) === Number(item.id) ? (
                            <>
                              <button
                                type="button"
                                className="adminAchievementsActionButton isPrimary"
                                onClick={() => handleUpdateAchievement(item)}
                                disabled={isUpdatingAchievement || !editingAchievementTitle.trim()}>
                                {isUpdatingAchievement ? "..." : "Simpan"}
                              </button>
                              <button
                                type="button"
                                className="adminAchievementsActionButton"
                                onClick={cancelEditAchievement}
                                disabled={isUpdatingAchievement}>
                                Batal
                              </button>
                            </>) : (
                            <>
                              <button
                                type="button"
                                className="adminAchievementsActionButton"
                                onClick={() => beginEditAchievement(item)}
                                disabled={deletingAchievementId === item.id}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="adminAchievementsActionButton isDanger"
                                onClick={() => handleDeleteAchievement(item)}
                                disabled={deletingAchievementId === item.id}>
                                {deletingAchievementId === item.id ? "..." : "Hapus"}
                              </button>
                            </>)
                            }
                          </div>
                        </td>
                      </tr>)
                ) : (

                <tr>
                       <td colSpan={5} className="adminAchievementsEmptyCell">
                        Belum ada prestasi yang tersimpan.
                      </td>
                    </tr>)
                }
                </tbody>
              </table>
            </div>
          </div>)
        }
      </article>

      {activeTab === "history" ? (
      <div className="adminTablePagination">
           <Pagination
          total={totalAchievements}
          page={achievementsPage}
          pageSize={achievementsPageSize}
          onPageChange={(p) => setAchievementsPage(p)}
          onPageSizeChange={(s) => {
            setAchievementsPageSize(s);
            setAchievementsPage(1);
          }} />

        </div>) :
      null}
    </section>);

}

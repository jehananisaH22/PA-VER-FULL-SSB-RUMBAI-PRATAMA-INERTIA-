import { useEffect, useMemo, useState } from "react";
import Pagination from "../../components/Pagination";
import "./BagianJadwalLatihanAdmin.css";

const scheduleCategoryOptions = [
  { value: "all", label: "Semua Kategori" },
  ...Array.from({ length: 11 }, (_, index) => {
    const age = index + 6;
    return { value: `u${age}`, label: `U-${age}` };
  }),
];

function normalizeScheduleCategory(value) {
  const normalized = String(value || "all").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const ageMatch = normalized.match(/^u?(\d{1,2})$/);
  if (ageMatch) {
    const age = Number(ageMatch[1]);
    if (age >= 6 && age <= 16) return `u${age}`;
  }
  return "all";
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 5h2v14h-2zM5 11h14v2H5z" />
    </svg>
  );
}

function ScheduleSelect({
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
  disabled = false,
  menuPosition = "bottom",
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label || "-";

  return (
    <div
      className={`trainingScheduleDropdown ${isOpen ? "isOpen" : ""} ${
        menuPosition === "top" ? "isMenuTop" : ""
      }`}
    >
      <button
        type="button"
        className={`trainingScheduleSelectButton ${disabled ? "isDisabled" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) onToggle();
        }}
        disabled={disabled}
      >
        <span>{selectedLabel}</span>
        <i className="trainingScheduleSelectChevron" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="trainingScheduleDropdownMenu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`trainingScheduleDropdownItem ${value === option.value ? "isSelected" : ""}`}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeSelectedStudentNames(item) {
  const sourceNames = Array.isArray(item?.studentNames)
    ? item.studentNames
    : item?.studentName && item.studentName !== "all"
      ? [item.studentName]
      : [];

  return Array.from(
    new Set(
      sourceNames
        .map((name) => String(name || "").trim())
        .filter((name) => name && name !== "all")
    )
  );
}

function normalizeStudentDirectoryItem(student) {
  return {
    ...student,
    category: normalizeScheduleCategory(student?.category),
    name: student?.name || student?.nama_siswa || "-",
  };
}

function formatStudentSelectionLabel(selectedNames, allLabel) {
  if (selectedNames.length === 0) return allLabel;
  if (selectedNames.length === 1) return selectedNames[0];
  return `${selectedNames.length} siswa dipilih`;
}

function getScheduleSaveErrorMessage(error) {
  if (error?.response?.status === 419) {
    return "Sesi keamanan halaman kedaluwarsa. Coba klik Simpan sekali lagi.";
  }

  return error?.response?.data?.message || error?.message || "Jadwal belum bisa disimpan.";
}

function StudentSelectButton({
  selectedNames,
  allLabel,
  onOpen,
}) {
  const selectedLabel = formatStudentSelectionLabel(selectedNames, allLabel);

  return (
    <button
      type="button"
      className="trainingScheduleSelectButton trainingScheduleStudentTrigger"
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <span>{selectedLabel}</span>
      <i className="trainingScheduleSelectChevron" aria-hidden="true" />
    </button>
  );
}

function StudentSelectionModal({
  selectedNames,
  studentOptions,
  allLabel,
  categoryLabel,
  onClose,
  onSave,
}) {
  const [draftNames, setDraftNames] = useState(selectedNames);
  const draftSet = new Set(draftNames);

  useEffect(() => {
    setDraftNames(selectedNames);
  }, [selectedNames]);

  const toggleStudent = (studentName) => {
    setDraftNames((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(studentName)) {
        nextSet.delete(studentName);
      } else {
        nextSet.add(studentName);
      }
      return Array.from(nextSet);
    });
  };

  return (
    <div
      className="trainingScheduleStudentModalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="Pilih siswa jadwal latihan"
      onClick={onClose}
    >
      <div className="trainingScheduleStudentModal" onClick={(event) => event.stopPropagation()}>
        <div className="trainingScheduleStudentModalHead">
          <div>
            <span>Target siswa</span>
            <h3>{categoryLabel}</h3>
          </div>
          <button type="button" className="trainingScheduleStudentModalClose" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="trainingScheduleStudentModalBody">
          <button
            type="button"
            className={`trainingScheduleModalChoice trainingScheduleModalAllChoice ${
              draftNames.length === 0 ? "isSelected" : ""
            }`}
            onClick={() => setDraftNames([])}
          >
            <span className="trainingScheduleRadioMark" aria-hidden="true" />
            <span>{allLabel}</span>
          </button>

          <div className="trainingScheduleStudentModalDivider" />

          <div className="trainingScheduleStudentModalList">
            {studentOptions.map((student) => (
              <button
                key={student.id || student.id_siswa || student.name}
                type="button"
                className={`trainingScheduleModalChoice ${
                  draftSet.has(student.name) ? "isSelected" : ""
                }`}
                onClick={() => toggleStudent(student.name)}
              >
                <span className="trainingScheduleCheckMark" aria-hidden="true" />
                <span>{student.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="trainingScheduleStudentModalFoot">
          <span className="trainingScheduleStudentModalSummary">
            {draftNames.length === 0 ? allLabel : `${draftNames.length} siswa dipilih`}
          </span>
          <div>
            <button type="button" className="trainingScheduleModalGhostBtn" onClick={onClose}>
              Batal
            </button>
            <button
              type="button"
              className="trainingScheduleModalSaveBtn"
              onClick={() => onSave(draftNames)}
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BagianJadwalLatihanAdmin({
  trainingSchedules = [],
  scheduleStudentDirectory = [],
  onUpdateTrainingSchedule,
  onAddTrainingSchedule,
  onSaveTrainingSchedule,
  onDeleteTrainingSchedule,
}) {
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [studentModalRowId, setStudentModalRowId] = useState(null);
  const [saveModalRowId, setSaveModalRowId] = useState(null);
  const [deleteModalRowId, setDeleteModalRowId] = useState(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [toast, setToast] = useState(null);
  const normalizedStudentDirectory = useMemo(
    () => scheduleStudentDirectory.map(normalizeStudentDirectoryItem),
    [scheduleStudentDirectory]
  );

  const scheduleRows = useMemo(
    () =>
      trainingSchedules.map((item) => {
        const category = normalizeScheduleCategory(item.category);

        return {
          ...item,
          category,
          categoryLabel:
            scheduleCategoryOptions.find((option) => option.value === category)?.label ||
            "Semua Kategori",
          selectedStudentNames: normalizeSelectedStudentNames(item),
          studentOptions:
            category === "all"
              ? normalizedStudentDirectory
              : normalizedStudentDirectory.filter((student) => student.category === category),
        };
      }),
    [normalizedStudentDirectory, trainingSchedules]
  );

  useEffect(() => {
    if (!openMenuKey) return undefined;
    const handleOutsideClick = (event) => {
      if (!event.target.closest?.("[data-training-schedule-dropdown='true']")) {
        setOpenMenuKey(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openMenuKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timerId = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timerId);
  }, [toast]);

  const addRow = async () => {
    if (!onAddTrainingSchedule) return;

    try {
      const result = await onAddTrainingSchedule();
      if (result === false) {
        setToast({ type: "error", message: "Jadwal belum bisa ditambahkan." });
        return;
      }
      setToast({ type: "success", message: "Baris jadwal ditambahkan. Isi data lalu klik Simpan." });
    } catch (error) {
      setToast({
        type: "error",
        message: error?.response?.data?.message || error?.message || "Jadwal belum bisa ditambahkan.",
      });
    }
  };

  const openDeleteModal = (rowId) => {
    setOpenMenuKey(null);
    setStudentModalRowId(null);
    setSaveModalRowId(null);
    setDeleteModalRowId(rowId);
  };

  const openSaveModal = (rowId) => {
    setOpenMenuKey(null);
    setStudentModalRowId(null);
    setDeleteModalRowId(null);
    setSaveModalRowId(rowId);
  };

  const confirmSaveRow = async () => {
    if (!saveModalRowId || !onSaveTrainingSchedule || isSavingSchedule) return;

    setIsSavingSchedule(true);

    try {
      const scheduleToSave = scheduleRows.find((item) => item.id === saveModalRowId);
      const result = await onSaveTrainingSchedule(scheduleToSave || saveModalRowId);

      if (result === false) {
        setToast({ type: "error", message: "Jadwal belum bisa disimpan." });
        return;
      }

      setToast({ type: "success", message: "Jadwal berhasil disimpan." });
      setSaveModalRowId(null);
    } catch (error) {
      setToast({
        type: "error",
        message: getScheduleSaveErrorMessage(error),
      });
      setSaveModalRowId(null);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const confirmDeleteRow = async () => {
    if (!deleteModalRowId || !onDeleteTrainingSchedule || isDeletingSchedule) return;

    setIsDeletingSchedule(true);

    try {
      const result = await onDeleteTrainingSchedule(deleteModalRowId);

      if (result === false) {
        setToast({ type: "error", message: "Jadwal belum bisa dihapus." });
        return;
      }

      setToast({ type: "success", message: "Jadwal berhasil dihapus." });
      setDeleteModalRowId(null);
    } catch (error) {
      setToast({
        type: "error",
        message: error?.response?.data?.message || error?.message || "Jadwal belum bisa dihapus.",
      });
    } finally {
      setIsDeletingSchedule(false);
    }
  };

  const activeStudentModalRow = scheduleRows.find((item) => item.id === studentModalRowId) || null;
  const activeSaveModalRow = scheduleRows.find((item) => item.id === saveModalRowId) || null;
  const activeDeleteModalRow = scheduleRows.find((item) => item.id === deleteModalRowId) || null;
  const activeStudentModalAllLabel = activeStudentModalRow
    ? activeStudentModalRow.category === "all"
      ? "Semua Siswa"
      : `Semua ${activeStudentModalRow.categoryLabel}`
    : "Semua Siswa";

  return (
    <section className="trainingScheduleSection">
      {toast ? (
        <div
          className={`trainingScheduleToast ${toast.type === "error" ? "isError" : "isSuccess"}`}
          role="status"
          aria-live="polite"
        >
          <strong>{toast.type === "error" ? "Gagal" : "Berhasil"}</strong>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Tutup notifikasi">
            x
          </button>
        </div>
      ) : null}

      <article className="trainingSchedulePanel">
        <div className="trainingScheduleHeader">
          <div className="trainingScheduleIntro">
            <span className="trainingScheduleEyebrow">Pengaturan jadwal</span>
            <h2>Jadwal Latihan</h2>
            <p>
              Atur target jadwal per kategori umur atau per siswa. Data yang dipilih di sini
              otomatis muncul di dashboard orang tua sesuai anak yang aktif.
            </p>
          </div>

          <div className="trainingScheduleHeaderActions">
            <button
              type="button"
              className="trainingScheduleAddButton"
              onClick={addRow}
            >
              <PlusIcon />
              <span>Tambah Jadwal</span>
            </button>

            <div className="trainingScheduleSummary">
              <span className="trainingScheduleSummaryLabel">Jadwal aktif</span>
              <strong>{scheduleRows.length}</strong>
              <span>Slot latihan tersimpan</span>
            </div>
          </div>
        </div>

        <div className="trainingScheduleTableWrap">
          <table className="trainingScheduleTable">
            <colgroup>
              <col className="trainingScheduleColDay" />
              <col className="trainingScheduleColTime" />
              <col className="trainingScheduleColPlace" />
              <col className="trainingScheduleColCategory" />
              <col className="trainingScheduleColStudent" />
              <col className="trainingScheduleColAction" />
            </colgroup>
            <thead>
              <tr>
                <th>Hari</th>
                <th>Waktu</th>
                <th>Tempat</th>
                <th>Kategori</th>
                <th>Siswa</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {scheduleRows.length > 0 ? (
                scheduleRows.map((item, index) => {
                  const categoryMenuKey = `${item.id}-category`;
                  const isRowMenuOpen =
                    openMenuKey === categoryMenuKey || studentModalRowId === item.id;
                  const menuPosition = index >= scheduleRows.length - 1 ? "top" : "bottom";
                  const allStudentLabel =
                    item.category === "all" ? "Semua Siswa" : `Semua ${item.categoryLabel}`;

                  return (
                    <tr key={item.id} className={isRowMenuOpen ? "isRowMenuOpen" : ""}>
                      <td data-label="Hari">
                        <input
                          className="trainingScheduleInput trainingScheduleInputSmall"
                          type="text"
                          value={item.day}
                          onChange={(event) =>
                            onUpdateTrainingSchedule?.({
                              id: item.id,
                              field: "day",
                              value: event.target.value,
                            })
                          }
                          aria-label={`Hari jadwal ${index + 1}`}
                        />
                      </td>
                      <td data-label="Waktu">
                        <input
                          className="trainingScheduleInput trainingScheduleInputSmall"
                          type="text"
                          value={item.time}
                          onChange={(event) =>
                            onUpdateTrainingSchedule?.({
                              id: item.id,
                              field: "time",
                              value: event.target.value,
                            })
                          }
                          aria-label={`Waktu jadwal ${index + 1}`}
                        />
                      </td>
                      <td data-label="Tempat">
                        <textarea
                          className="trainingScheduleInput trainingScheduleTextarea"
                          value={item.place}
                          onChange={(event) =>
                            onUpdateTrainingSchedule?.({
                              id: item.id,
                              field: "place",
                              value: event.target.value,
                            })
                          }
                          aria-label={`Tempat jadwal ${index + 1}`}
                        />
                      </td>
                      <td data-label="Kategori">
                        <div className="trainingScheduleField" data-training-schedule-dropdown="true">
                          <ScheduleSelect
                            value={item.category}
                            options={scheduleCategoryOptions}
                            isOpen={openMenuKey === categoryMenuKey}
                            onToggle={() =>
                              setOpenMenuKey((prev) =>
                                prev === categoryMenuKey ? null : categoryMenuKey
                              )
                            }
                            onSelect={(nextValue) => {
                              setOpenMenuKey(null);
                              onUpdateTrainingSchedule?.({
                                id: item.id,
                                field: "category",
                                value: nextValue,
                              });
                            }}
                            menuPosition={menuPosition}
                          />
                        </div>
                      </td>
                      <td data-label="Siswa">
                        <div className="trainingScheduleField">
                          <StudentSelectButton
                            selectedNames={item.selectedStudentNames}
                            allLabel={allStudentLabel}
                            onOpen={() => {
                              setOpenMenuKey(null);
                              setStudentModalRowId(item.id);
                            }}
                          />
                        </div>
                      </td>
                      <td data-label="Aksi">
                        <div className="trainingScheduleActions">
                          <button
                            type="button"
                            className="trainingScheduleActionButton isSave"
                            onClick={() => openSaveModal(item.id)}
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            className="trainingScheduleActionButton isDelete"
                            onClick={() => openDeleteModal(item.id)}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="trainingScheduleEmpty">Belum ada jadwal.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="trainingScheduleMobileList">
          {scheduleRows.map((item, index) => {
            const categoryMenuKey = `${item.id}-category`;
            const isRowMenuOpen =
              openMenuKey === categoryMenuKey || studentModalRowId === item.id;
            const menuPosition = index >= scheduleRows.length - 1 ? "top" : "bottom";
            const allStudentLabel =
              item.category === "all" ? "Semua Siswa" : `Semua ${item.categoryLabel}`;

            return (
              <article
                key={`${item.id}-mobile`}
                className={`trainingScheduleMobileCard ${isRowMenuOpen ? "isMenuOpen" : ""}`}
              >
                <div className="trainingScheduleMobileField">
                  <span>Hari</span>
                  <input
                    className="trainingScheduleInput trainingScheduleInputSmall"
                    type="text"
                    value={item.day}
                    onChange={(event) =>
                      onUpdateTrainingSchedule?.({
                        id: item.id,
                        field: "day",
                        value: event.target.value,
                      })
                    }
                    aria-label={`Hari jadwal mobile ${index + 1}`}
                  />
                </div>

                <div className="trainingScheduleMobileField">
                  <span>Waktu</span>
                  <input
                    className="trainingScheduleInput trainingScheduleInputSmall"
                    type="text"
                    value={item.time}
                    onChange={(event) =>
                      onUpdateTrainingSchedule?.({
                        id: item.id,
                        field: "time",
                        value: event.target.value,
                      })
                    }
                    aria-label={`Waktu jadwal mobile ${index + 1}`}
                  />
                </div>

                <div className="trainingScheduleMobileField">
                  <span>Tempat</span>
                  <textarea
                    className="trainingScheduleInput trainingScheduleTextarea"
                    value={item.place}
                    onChange={(event) =>
                      onUpdateTrainingSchedule?.({
                        id: item.id,
                        field: "place",
                        value: event.target.value,
                      })
                    }
                    aria-label={`Tempat jadwal mobile ${index + 1}`}
                  />
                </div>

                <div className="trainingScheduleMobileField">
                  <span>Kategori</span>
                  <div className="trainingScheduleField" data-training-schedule-dropdown="true">
                    <ScheduleSelect
                      value={item.category}
                      options={scheduleCategoryOptions}
                      isOpen={openMenuKey === categoryMenuKey}
                      onToggle={() =>
                        setOpenMenuKey((prev) =>
                          prev === categoryMenuKey ? null : categoryMenuKey
                        )
                      }
                      onSelect={(nextValue) => {
                        setOpenMenuKey(null);
                        onUpdateTrainingSchedule?.({
                          id: item.id,
                          field: "category",
                          value: nextValue,
                        });
                      }}
                      menuPosition={menuPosition}
                    />
                  </div>
                </div>

                <div className="trainingScheduleMobileField">
                  <span>Siswa</span>
                  <div className="trainingScheduleField">
                    <StudentSelectButton
                      selectedNames={item.selectedStudentNames}
                      allLabel={allStudentLabel}
                      onOpen={() => {
                        setOpenMenuKey(null);
                        setStudentModalRowId(item.id);
                      }}
                    />
                  </div>
                </div>

                <div className="trainingScheduleMobileActions">
                  <button
                    type="button"
                    className="trainingScheduleActionButton isSave"
                    onClick={() => openSaveModal(item.id)}
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    className="trainingScheduleActionButton isDelete"
                    onClick={() => openDeleteModal(item.id)}
                  >
                    Hapus
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </article>

      <div className="adminTablePagination">
        <Pagination
          total={scheduleRows.length}
          page={1}
          pageSize={10}
          onPageChange={() => {}}
        />
      </div>

      {activeStudentModalRow && (
        <StudentSelectionModal
          selectedNames={activeStudentModalRow.selectedStudentNames}
          studentOptions={activeStudentModalRow.studentOptions}
          allLabel={activeStudentModalAllLabel}
          categoryLabel={activeStudentModalRow.categoryLabel}
          onClose={() => setStudentModalRowId(null)}
          onSave={(nextNames) => {
            onUpdateTrainingSchedule?.({
              id: activeStudentModalRow.id,
              field: "studentNames",
              value: nextNames,
            });
            setStudentModalRowId(null);
          }}
        />
      )}

      {activeSaveModalRow && (
        <div
          className="trainingScheduleConfirmModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi simpan jadwal latihan"
          onClick={() => {
            if (!isSavingSchedule) setSaveModalRowId(null);
          }}
        >
          <div className="trainingScheduleConfirmModal" onClick={(event) => event.stopPropagation()}>
            <div className="trainingScheduleConfirmModalHead">
              <span>Konfirmasi</span>
              <h3>Simpan jadwal?</h3>
            </div>
            <p>
              Jadwal {activeSaveModalRow.day} pukul {activeSaveModalRow.time} akan disimpan.
            </p>
            <div className="trainingScheduleConfirmModalActions">
              <button
                type="button"
                className="trainingScheduleConfirmCancelBtn"
                onClick={() => setSaveModalRowId(null)}
                disabled={isSavingSchedule}
              >
                Batal
              </button>
              <button
                type="button"
                className="trainingScheduleConfirmSaveBtn"
                onClick={confirmSaveRow}
                disabled={isSavingSchedule}
              >
                {isSavingSchedule ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDeleteModalRow && (
        <div
          className="trainingScheduleDeleteModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi hapus jadwal latihan"
          onClick={() => {
            if (!isDeletingSchedule) setDeleteModalRowId(null);
          }}
        >
          <div className="trainingScheduleDeleteModal" onClick={(event) => event.stopPropagation()}>
            <div className="trainingScheduleDeleteModalHead">
              <span>Konfirmasi</span>
              <h3>Hapus jadwal?</h3>
            </div>
            <p>
              Jadwal {activeDeleteModalRow.day} pukul {activeDeleteModalRow.time} akan dihapus dari daftar latihan.
            </p>
            <div className="trainingScheduleDeleteModalActions">
              <button
                type="button"
                className="trainingScheduleDeleteCancelBtn"
                onClick={() => setDeleteModalRowId(null)}
                disabled={isDeletingSchedule}
              >
                Batal
              </button>
              <button
                type="button"
                className="trainingScheduleDeleteConfirmBtn"
                onClick={confirmDeleteRow}
                disabled={isDeletingSchedule}
              >
                {isDeletingSchedule ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

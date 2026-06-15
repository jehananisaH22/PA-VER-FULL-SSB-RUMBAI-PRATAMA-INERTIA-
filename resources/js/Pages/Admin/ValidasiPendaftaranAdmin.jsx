import React from "react";
import { router, usePage } from "@inertiajs/react";
import Pagination from "../../components/Pagination";
import "./ValidasiPendaftaranAdmin.css";

const validationSortOptions = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
];

const validationStatusPriority = {
  "Belum Diperiksa": 0,
  "Perlu Perbaikan": 1,
  "Tidak Valid": 2,
  Valid: 3,
};

function AdminRegChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5 7.5 10 12.5 15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AdminRegSortSelect({ id, value, onChange, options, ariaLabel }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  React.useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className={`adminRegSortSelect ${isOpen ? "isOpen" : ""}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        className="adminRegSortTrigger"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span>{selectedOption.label}</span>
        <span className="adminRegSortIcon">
          <AdminRegChevronDownIcon />
        </span>
      </button>

      {isOpen ? (
        <div className="adminRegSortMenu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`adminRegSortOption ${option.value === value ? "isSelected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ValidasiPendaftaranAdmin({
  validationDocumentRows,
  setValidationDocumentRows,
  validationUploadFields,
  validationIdentityFields,
  getValidationChipClass,
  onSendValidationNotification,
  onCreateParentAccount,
  onRecordAdminActivity,
  requestedOpenDocNo,
  onHandledRequestedOpenDocNo,
}) {
  const { props } = usePage();
  const [selectedValidationDocNo, setSelectedValidationDocNo] = React.useState(null);
  const [isValidationDetailOpen, setIsValidationDetailOpen] = React.useState(false);
  const [validationSortOrder, setValidationSortOrder] = React.useState("newest");
  const [previewUploadKey, setPreviewUploadKey] = React.useState(null);
  const [actionToast, setActionToast] = React.useState(null);
  const [isSavingValidation, setIsSavingValidation] = React.useState(false);
  const [isRepairNoticeOpen, setIsRepairNoticeOpen] = React.useState(false);
  const [repairIdentitySelection, setRepairIdentitySelection] = React.useState({});
  const [repairUploadSelection, setRepairUploadSelection] = React.useState({});
  const closeDetailTimerRef = React.useRef(null);

  const csrfToken = React.useMemo(
    () =>
      props?.csrfToken ||
      document.head.querySelector('meta[name="csrf-token"]')?.content ||
      "",
    [props?.csrfToken]
  );

  React.useEffect(() => {
    if (!window.axios || !csrfToken) return;

    window.axios.defaults.headers.common["X-CSRF-TOKEN"] = csrfToken;

    const tokenMeta = document.head.querySelector('meta[name="csrf-token"]');
    if (tokenMeta) {
      tokenMeta.setAttribute("content", csrfToken);
    }
  }, [csrfToken]);

  const sortedValidationRows = React.useMemo(
    () =>
      [...validationDocumentRows].sort((a, b) => {
        const aPriority = validationStatusPriority[a.status] ?? 4;
        const bPriority = validationStatusPriority[b.status] ?? 4;
        if (aPriority !== bPriority) return aPriority - bPriority;

        const aSort = Number(a.createdAt ?? a.no ?? 0);
        const bSort = Number(b.createdAt ?? b.no ?? 0);
        return validationSortOrder === "newest" ? bSort - aSort : aSort - bSort;
      }),
    [validationDocumentRows, validationSortOrder]
  );

  const selectedValidationDoc = React.useMemo(
    () => validationDocumentRows.find((item) => item.no === selectedValidationDocNo) ?? null,
    [selectedValidationDocNo, validationDocumentRows]
  );

  const previewUploadMeta = React.useMemo(
    () => validationUploadFields.find((item) => item.key === previewUploadKey) ?? null,
    [previewUploadKey, validationUploadFields]
  );

  const previewUploadFiles = React.useMemo(() => {
    if (!previewUploadKey || !selectedValidationDoc) return [];
    const names = selectedValidationDoc.files?.[previewUploadKey] ?? [];
    const objects = selectedValidationDoc.fileObjects?.[previewUploadKey] ?? [];
    return names.map((name, index) => ({ name, file: objects[index] || null }));
  }, [previewUploadKey, selectedValidationDoc]);

  const invalidIdentityKeys = React.useMemo(
    () =>
      validationIdentityFields
        .map((field) => field.key)
        .filter((fieldKey) => Boolean(repairIdentitySelection[fieldKey])),
    [repairIdentitySelection, validationIdentityFields]
  );

  const invalidUploadKeys = React.useMemo(
    () =>
      validationUploadFields
        .map((field) => field.key)
        .filter((fieldKey) => Boolean(repairUploadSelection[fieldKey])),
    [repairUploadSelection, validationUploadFields]
  );

  const invalidIdentityLabels = React.useMemo(
    () =>
      validationIdentityFields
        .filter((field) => invalidIdentityKeys.includes(field.key))
        .map((field) => field.label),
    [invalidIdentityKeys, validationIdentityFields]
  );

  const invalidUploadLabels = React.useMemo(
    () =>
      validationUploadFields
        .filter((field) => invalidUploadKeys.includes(field.key))
        .map((field) => field.label),
    [invalidUploadKeys, validationUploadFields]
  );

  const invalidParts = React.useMemo(
    () => [...invalidIdentityLabels, ...invalidUploadLabels],
    [invalidIdentityLabels, invalidUploadLabels]
  );

  const hasRepairSelections = invalidParts.length > 0;

  const getValidationStatusTone = (status) => {
    if (status === "Valid") return "isValid";
    if (status === "Tidak Valid") return "isInvalid";
    if (status === "Perlu Perbaikan") return "isNeedsFix";
    return "isPending";
  };

  const getValidationStatusNote = (status) => {
    if (status === "Valid") return "Berkas sudah disetujui admin.";
    if (status === "Tidak Valid") return "Berkas belum memenuhi syarat.";
    if (status === "Perlu Perbaikan") return "Menunggu upload ulang dari orang tua.";
    return "Menunggu pemeriksaan admin.";
  };

  const openValidationDetail = React.useCallback(
    (docNo) => {
      const targetDoc = validationDocumentRows.find((item) => item.no === docNo);
      if (closeDetailTimerRef.current) {
        window.clearTimeout(closeDetailTimerRef.current);
        closeDetailTimerRef.current = null;
      }
      setSelectedValidationDocNo(docNo);
      setIsValidationDetailOpen(true);
      setRepairIdentitySelection(
        Object.fromEntries(
          validationIdentityFields.map((field) => [
            field.key,
            Boolean(targetDoc?.invalidIdentityFields?.includes(field.key)),
          ])
        )
      );
      setRepairUploadSelection(
        Object.fromEntries(
          validationUploadFields.map((field) => [
            field.key,
            Boolean(targetDoc?.invalidUploadFields?.includes(field.key)),
          ])
        )
      );
      setPreviewUploadKey(null);
      setIsRepairNoticeOpen(false);
    },
    [validationDocumentRows, validationIdentityFields, validationUploadFields]
  );

  const closeValidationDetail = () => {
    setIsValidationDetailOpen(false);
    setPreviewUploadKey(null);
    setIsRepairNoticeOpen(false);
    if (closeDetailTimerRef.current) {
      window.clearTimeout(closeDetailTimerRef.current);
    }
    closeDetailTimerRef.current = window.setTimeout(() => {
      setSelectedValidationDocNo(null);
      closeDetailTimerRef.current = null;
    }, 340);
  };

  React.useEffect(() => {
    if (!requestedOpenDocNo) return;
    openValidationDetail(requestedOpenDocNo);
    onHandledRequestedOpenDocNo?.();
  }, [requestedOpenDocNo, onHandledRequestedOpenDocNo, openValidationDetail]);

  React.useEffect(() => {
    if (!actionToast) return undefined;
    const timer = setTimeout(() => setActionToast(null), 5000);
    return () => clearTimeout(timer);
  }, [actionToast]);

  React.useEffect(
    () => () => {
      if (closeDetailTimerRef.current) {
        window.clearTimeout(closeDetailTimerRef.current);
      }
    },
    []
  );

const handleOpenPreviewFile = (fileItem) => {
  console.log("CLICK FILE:", fileItem);

  if (!fileItem) {
    console.error("fileItem kosong");
    return;
  }

  const url = `http://127.0.0.1:8000/api/file-pendaftaran-siswa/${fileItem.jenis}/${fileItem.filename}`;

  console.log("OPEN URL:", url);

  window.open(url, "_blank");
};

  const getIdentityValue = (field, document) => {
    if (!document) return "-";
    if (field.key === "childName") return document.childName || document.name || "-";
    if (field.key === "motherName") return document.motherName || "-";
    if (field.key === "fatherName") return document.fatherName || "-";
    return document[field.key] || "-";
  };

  const buildValidationPayload = (invalidIdentityKeys = [], invalidUploadKeys = []) => ({
    val_nama_siswa: invalidIdentityKeys.includes("childName") ? "tidak_valid" : "valid",
    val_nama_ibu: invalidIdentityKeys.includes("motherName") ? "tidak_valid" : "valid",
    val_nama_ayah: invalidIdentityKeys.includes("fatherName") ? "tidak_valid" : "valid",
    val_umur: invalidIdentityKeys.includes("age") ? "tidak_valid" : "valid",
    val_akta: invalidUploadKeys.includes("birthCert") ? "tidak_valid" : "valid",
    val_kk: invalidUploadKeys.includes("familyCard") ? "tidak_valid" : "valid",
    val_rapor: invalidUploadKeys.includes("reportCard") ? "tidak_valid" : "valid",
    val_foto: invalidUploadKeys.includes("photo") ? "tidak_valid" : "valid",
    val_bukti_pembayaran: invalidUploadKeys.includes("paymentProof") ? "tidak_valid" : "valid",
  });

  const saveValidationToServer = async (document, payload) => {
    if (!document?.no || !window.axios) return true;

    await window.axios.post(`/api/admin/pendaftaran/${document.no}/validasi`, payload, {
      headers: {
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    return true;
  };

  const handleApproveValidation = async () => {
    if (!selectedValidationDoc) return;
    setIsSavingValidation(true);

    try {
      await saveValidationToServer(selectedValidationDoc, buildValidationPayload());

      setValidationDocumentRows((prev) =>
        prev.map((item) =>
          item.no === selectedValidationDoc.no
            ? { ...item, status: "Valid", invalidIdentityFields: [], invalidUploadFields: [] }
            : item
        )
      );

      onCreateParentAccount?.({
        name: selectedValidationDoc.name,
        email: selectedValidationDoc.email,
        phone: selectedValidationDoc.phone,
        childName: selectedValidationDoc.childName || selectedValidationDoc.name,
        age: selectedValidationDoc.age,
      });
      onRecordAdminActivity?.({
        title: "Memvalidasi berkas pendaftaran",
        description: `${selectedValidationDoc.childName || selectedValidationDoc.name} dinyatakan valid.`,
      });

      setActionToast({
        type: "success",
        message: "Data dinyatakan valid dan akun berhasil diaktifkan.",
      });

      router.reload({ preserveScroll: true });
    } catch (error) {
      setActionToast({
        type: "error",
        message: error?.response?.data?.message || "Gagal menyimpan validasi ke server.",
      });
    } finally {
      setIsSavingValidation(false);
    }
  };

  const handleSendRepairNotification = async () => {
    if (!selectedValidationDoc || !hasRepairSelections) return;
    setIsSavingValidation(true);

    const message = `Dokumen ${selectedValidationDoc.name} belum valid pada: ${invalidParts.join(", ")}. Mohon upload ulang bagian yang ditandai.`;

    try {
      await saveValidationToServer(
        selectedValidationDoc,
        buildValidationPayload(invalidIdentityKeys, invalidUploadKeys)
      );

      setValidationDocumentRows((prev) =>
        prev.map((item) =>
          item.no === selectedValidationDoc.no
            ? {
                ...item,
                status: "Perlu Perbaikan",
                invalidIdentityFields: invalidIdentityKeys,
                invalidUploadFields: invalidUploadKeys,
              }
            : item
        )
      );

      onSendValidationNotification?.({
        type: "reupload",
        name: selectedValidationDoc.name,
        email: selectedValidationDoc.email,
        phone: selectedValidationDoc.phone,
        message,
        document: selectedValidationDoc,
        invalidIdentityFields: invalidIdentityKeys,
        invalidUploadFields: invalidUploadKeys,
      });
      onRecordAdminActivity?.({
        title: "Meminta perbaikan berkas",
        description: `${selectedValidationDoc.childName || selectedValidationDoc.name} perlu memperbaiki ${invalidParts.join(", ")}.`,
      });

      setActionToast({ type: "success", message: "Notifikasi perbaikan berhasil dikirim." });
      setIsRepairNoticeOpen(false);
      router.reload({ preserveScroll: true });
    } catch (error) {
      setActionToast({
        type: "error",
        message: error?.response?.data?.message || "Gagal menyimpan validasi ke server.",
      });
    } finally {
      setIsSavingValidation(false);
    }
  };

  const [validationPage, setValidationPage] = React.useState(1);
  const [validationPageSize, setValidationPageSize] = React.useState(10);
  const totalValidation = sortedValidationRows.length;
  const pagedValidationRows = React.useMemo(() => {
    const start = (validationPage - 1) * validationPageSize;
    return sortedValidationRows.slice(start, start + validationPageSize);
  }, [sortedValidationRows, validationPage, validationPageSize]);

  return (
    <section className="adminRegPage">
      {actionToast && (
        <div
          className={`adminRegToast ${actionToast.type === "success" ? "isSuccess" : ""}`}
          role="status"
          aria-live="polite"
        >
          <strong>{actionToast.type === "success" ? "Berhasil" : "Gagal"}</strong>
          <span>{actionToast.message}</span>
        </div>
      )}

      <article className="adminCard adminRegListCard">
        <div className="adminRegListHeader">
          <h2>Rekap Validasi Pendaftaran</h2>
          <div className="adminRegToolbar">
            <label htmlFor="admin-validation-sort">Urutkan</label>
            <AdminRegSortSelect
              id="admin-validation-sort"
              value={validationSortOrder}
              onChange={setValidationSortOrder}
              options={validationSortOptions}
              ariaLabel="Urutkan validasi pendaftaran"
            />
          </div>
        </div>

        <div className={`adminRegReviewLayout ${isValidationDetailOpen ? "hasAction" : ""}`}>
          <div className="adminRegNamePanel">
            <div className="adminRegTableWrap adminRegNameTableWrap">
              <table className="adminRegNameTable">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Anak</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedValidationRows.length > 0 ? (
                    pagedValidationRows.map((item, index) => {
                      const childName = item.childName || item.name;
                      const isSelected = item.no === selectedValidationDocNo && isValidationDetailOpen;

                      return (
                        <tr key={item.no} className={isSelected ? "isSelected" : ""}>
                          <td>{index + 1}</td>
                          <td>
                            <button
                              type="button"
                              className="adminRegNameBtn"
                              onClick={() => {
                                if (isSelected) {
                                  closeValidationDetail();
                                  return;
                                }
                                openValidationDetail(item.no);
                              }}
                              aria-pressed={isSelected}
                            >
                              <strong>{childName}</strong>
                              <span>{item.email}</span>
                            </button>
                          </td>
                          <td>
                            <span className={`adminChip ${getValidationChipClass(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="adminRegEmpty">Belum ada data.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside
            className={`adminRegActionPane ${isValidationDetailOpen && selectedValidationDoc ? "isOpen" : ""}`}
            aria-hidden={!isValidationDetailOpen}
          >
            {selectedValidationDoc ? (
              <div key={selectedValidationDoc.no} className="adminRegActionInner">
                <div className="adminRegActionHead">
                  <div>
                    <span>Detail Data Anak</span>
                    <h3>{selectedValidationDoc.childName || selectedValidationDoc.name}</h3>
                  </div>
                  <button
                    type="button"
                    className="adminRegCloseDetailBtn"
                    onClick={closeValidationDetail}
                  >
                    Tutup
                  </button>
                </div>

                <div
                  className={`adminRegActionStatus ${getValidationStatusTone(
                    selectedValidationDoc.status
                  )}`}
                >
                  <div className="adminRegStatusCopy">
                    <span>Status Validasi</span>
                    <small>{getValidationStatusNote(selectedValidationDoc.status)}</small>
                  </div>
                  <span className={`adminRegStatusBadge ${getValidationChipClass(selectedValidationDoc.status)}`}>
                    {selectedValidationDoc.status}
                  </span>
                </div>

                <section className="adminRegDataSection">
                  <h4>Data Kontak</h4>
                  <dl className="adminRegInfoGrid">
                    <div>
                      <dt>Email</dt>
                      <dd>{selectedValidationDoc.email}</dd>
                    </div>
                    <div>
                      <dt>No Handphone</dt>
                      <dd>{selectedValidationDoc.phone}</dd>
                    </div>
                  </dl>
                </section>

                <section className="adminRegDataSection">
                  <h4>Data Identitas</h4>
                  <dl className="adminRegInfoGrid">
                    {validationIdentityFields.map((field) => {
                      const isMarked = selectedValidationDoc.invalidIdentityFields?.includes(field.key);
                      return (
                        <div key={field.key} className={isMarked ? "isMarked" : ""}>
                          <dt>{field.label}</dt>
                          <dd>{getIdentityValue(field, selectedValidationDoc)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </section>

                <section className="adminRegDataSection">
                  <h4>Berkas Upload</h4>
                  <div className="adminRegFileGrid">
                    {validationUploadFields.map((field) => {
                      const fileCount = selectedValidationDoc.files?.[field.key]?.length || 0;
                      const isMarked = selectedValidationDoc.invalidUploadFields?.includes(field.key);
                      return (
                        <button
                          key={field.key}
                          type="button"
                          className={`adminRegFileTile ${isMarked ? "isMarked" : ""}`}
                          onClick={() => setPreviewUploadKey(field.key)}
                        >
                          <span>{field.label}</span>
                          <small>{fileCount > 0 ? `${fileCount} file` : "Belum ada file"}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="adminRegActionBox">
                  <span>Action Validasi</span>
                  <div className="adminRegActionButtons">
                    <button
                      type="button"
                      className="adminRegDecisionBtn isInvalid"
                      onClick={() => setIsRepairNoticeOpen(true)}
                      disabled={isSavingValidation}
                    >
                      Tidak Valid
                    </button>
                    <button
                      type="button"
                      className="adminRegDecisionBtn isValid"
                      onClick={handleApproveValidation}
                      disabled={isSavingValidation}
                    >
                      {isSavingValidation ? "Menyimpan..." : "Valid"}
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </aside>
        </div>

      </article>

      <div className="adminTablePagination">
        <Pagination
          total={totalValidation}
          page={validationPage}
          pageSize={validationPageSize}
          onPageChange={(p) => setValidationPage(p)}
          onPageSizeChange={(s) => {
            setValidationPageSize(s);
            setValidationPage(1);
          }}
        />
      </div>

      {selectedValidationDoc && isRepairNoticeOpen && (
        <div
          className="adminRegRepairOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Notifikasi perbaikan"
          onClick={() => setIsRepairNoticeOpen(false)}
        >
          <div className="adminRegRepairCard" onClick={(event) => event.stopPropagation()}>
            <div className="adminRegRepairHead">
              <h3>Notifikasi Perbaikan</h3>
              <button
                type="button"
                className="adminRegRepairClose"
                onClick={() => setIsRepairNoticeOpen(false)}
              >
                Tutup
              </button>
            </div>
            <p>
              Pilih bagian yang perlu diperbaiki untuk
              {" "}
              <strong>{selectedValidationDoc.name}</strong>.
            </p>
            <div className="adminRegRepairBody">
              <div className="adminRegRepairSection">
                <h4>Data Identitas</h4>
                <div className="adminRegRepairChecklist">
                  {validationIdentityFields.map((field) => (
                    <label key={field.key} className="adminRegRepairOption">
                      <input
                        type="checkbox"
                        checked={Boolean(repairIdentitySelection[field.key])}
                        onChange={(event) =>
                          setRepairIdentitySelection((prev) => ({
                            ...prev,
                            [field.key]: event.target.checked,
                          }))
                        }
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="adminRegRepairSection">
                <h4>Berkas Upload</h4>
                <div className="adminRegRepairChecklist">
                  {validationUploadFields.map((field) => (
                    <label key={field.key} className="adminRegRepairOption">
                      <input
                        type="checkbox"
                        checked={Boolean(repairUploadSelection[field.key])}
                        onChange={(event) =>
                          setRepairUploadSelection((prev) => ({
                            ...prev,
                            [field.key]: event.target.checked,
                          }))
                        }
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="adminRegRepairActions">
              <button
                type="button"
                className="adminRegRepairGhostBtn"
                onClick={() => setIsRepairNoticeOpen(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="adminRegRepairSubmitBtn"
                onClick={handleSendRepairNotification}
                disabled={!hasRepairSelections || isSavingValidation}
              >
                {isSavingValidation ? "Mengirim..." : "Kirim ke Halaman Perbaikan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedValidationDoc && previewUploadKey && (
        <div
          className="adminRegPreviewOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Preview berkas"
          onClick={() => setPreviewUploadKey(null)}
        >
          <div className="adminRegPreviewCard" onClick={(event) => event.stopPropagation()}>
            <div className="adminRegPreviewHead">
              <h3>{previewUploadMeta?.label}</h3>
              <button
                type="button"
                className="adminRegPreviewClose"
                onClick={() => setPreviewUploadKey(null)}
              >
                Tutup
              </button>
            </div>
            <ul className="adminRegPreviewList">
              {previewUploadFiles.length > 0 ? (
                previewUploadFiles.map((fileItem) => (
                  <li key={fileItem.name} className="adminRegPreviewItem">
                    <span>{fileItem.name}</span>
                    <button type="button" onClick={() => handleOpenPreviewFile(fileItem)}>
                      Lihat
                    </button>
                  </li>
                ))
              ) : (
                <li className="adminRegPreviewEmpty">File belum tersedia.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

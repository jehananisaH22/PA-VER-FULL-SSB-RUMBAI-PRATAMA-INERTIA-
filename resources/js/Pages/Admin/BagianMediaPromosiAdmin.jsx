import { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import "./BagianMediaPromosiAdmin.css";
import BeritaFallback from "../../../assets/Berita1.png";
import GaleriFallback from "../../../assets/Galeri1.png";

const emptyNewsForm = {
  id: null,
  groupId: null,
  title: "",
  body: "",
  image: "",
  imageFile: null,
  imageName: "",
};

const emptyGalleryForm = {
  id: null,
  groupId: null,
  title: "",
  image: "",
  imageFile: null,
  imageName: "",
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function excerpt(value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "Belum ada isi.";
  return normalized.length > 120 ? `${normalized.slice(0, 120).trimEnd()}...` : normalized;
}

function readImage(file, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(String(reader.result || ""));
  reader.readAsDataURL(file);
}

function fallbackForCategory(category) {
  return category === "Galeri" ? GaleriFallback : BeritaFallback;
}

function handleImageError(event, fallbackImage) {
  if (event.currentTarget.src !== fallbackImage) {
    event.currentTarget.src = fallbackImage;
  }
}

async function submitMedia(form, category) {
  const isEditing = Boolean(form.id);
  const formData = new FormData();
  formData.append("kategori", category);
  formData.append("target_mode", "semua");
  formData.append("judul", form.title.trim());
  formData.append("isi_promosi", category === "Berita" ? form.body.trim() : "");
  formData.append("tanggal_promosi", todayInputValue());

  if (form.imageFile) {
    formData.append("foto_promosi", form.imageFile);
  }

  const url = isEditing ? `/api/admin/media-promosi/${form.id}` : "/api/admin/tambah_media-promosi";
  const response = await window.axios.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

export default function BagianMediaPromosiAdmin({
  articles = [],
  onDeleteArticle,
  onRecordAdminActivity,
}) {
  const [activeTab, setActiveTab] = useState("berita");
  const [newsForm, setNewsForm] = useState(emptyNewsForm);
  const [galleryForm, setGalleryForm] = useState(emptyGalleryForm);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("success");
  const [confirmAction, setConfirmAction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newsItems = useMemo(
    () => articles.filter((item) => String(item.category || "").toLowerCase() === "berita"),
    [articles]
  );
  const galleryItems = useMemo(
    () => articles.filter((item) => String(item.category || "").toLowerCase() === "galeri"),
    [articles]
  );

  const showStatus = (message, type = "success") => {
    setStatusType(type);
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(""), 4200);
  };

  const apiErrorMessage = (error, fallback) => {
    const errors = error?.response?.data?.errors;
    const firstError = errors ? Object.values(errors).flat()[0] : "";
    return firstError || error?.response?.data?.message || fallback;
  };

  const handleImageChange = (event, category) => {
    const file = event.target.files?.[0];
    if (!file) return;

    readImage(file, (image) => {
      if (category === "Berita") {
        setNewsForm((prev) => ({ ...prev, image, imageFile: file, imageName: file.name }));
        return;
      }

      setGalleryForm((prev) => ({ ...prev, image, imageFile: file, imageName: file.name }));
    });
  };

  const validateNews = () => {
    if (!newsForm.title.trim() || !newsForm.body.trim() || (!newsForm.image && !newsForm.id)) {
      showStatus("Lengkapi judul, isi, dan foto berita.", "error");
      return false;
    }

    if (newsForm.body.length > 10000) {
      showStatus("Isi berita terlalu panjang. Maksimal 10.000 karakter.", "error");
      return false;
    }

    if (newsForm.imageFile && newsForm.imageFile.size > 10 * 1024 * 1024) {
      showStatus("Ukuran foto maksimal 10 MB.", "error");
      return false;
    }

    return true;
  };

  const saveNews = async () => {
    try {
      setIsSubmitting(true);
      await submitMedia(newsForm, "Berita");
      onRecordAdminActivity?.({
        title: newsForm.id ? "Mengubah berita" : "Mempublikasikan berita",
        description: newsForm.title.trim(),
      });
      setNewsForm(emptyNewsForm);
      showStatus(newsForm.id ? "Berita berhasil diperbarui." : "Berita berhasil dipublikasikan.");
      router.reload({ only: ["mediaArticles"], preserveScroll: true });
    } catch (error) {
      showStatus(apiErrorMessage(error, "Gagal menyimpan berita."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNews = (event) => {
    event.preventDefault();
    if (!validateNews()) return;
    setConfirmAction({
      title: newsForm.id ? "Simpan perubahan berita?" : "Publikasikan berita?",
      message: "Berita akan tersimpan ke database dan tampil di halaman publik.",
      confirmLabel: newsForm.id ? "Simpan" : "Publikasikan",
      onConfirm: saveNews,
    });
  };

  const validateGallery = () => {
    if (!galleryForm.title.trim() || (!galleryForm.image && !galleryForm.id)) {
      showStatus("Lengkapi judul dan foto galeri.", "error");
      return false;
    }

    if (galleryForm.imageFile && galleryForm.imageFile.size > 10 * 1024 * 1024) {
      showStatus("Ukuran foto maksimal 10 MB.", "error");
      return false;
    }

    return true;
  };

  const saveGallery = async () => {
    try {
      setIsSubmitting(true);
      await submitMedia(galleryForm, "Galeri");
      onRecordAdminActivity?.({
        title: galleryForm.id ? "Mengubah foto galeri" : "Menambah foto galeri",
        description: galleryForm.title.trim(),
      });
      setGalleryForm(emptyGalleryForm);
      showStatus(galleryForm.id ? "Foto galeri berhasil diperbarui." : "Foto galeri berhasil ditambahkan.");
      router.reload({ only: ["mediaArticles"], preserveScroll: true });
    } catch (error) {
      showStatus(apiErrorMessage(error, "Gagal menyimpan foto galeri."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveGallery = (event) => {
    event.preventDefault();
    if (!validateGallery()) return;
    setConfirmAction({
      title: galleryForm.id ? "Simpan perubahan foto?" : "Tambah foto ke galeri?",
      message: "Foto galeri akan tampil di halaman Galeri.",
      confirmLabel: galleryForm.id ? "Simpan" : "Tambah",
      onConfirm: saveGallery,
    });
  };

  const deleteMedia = async (item) => {
    const endpoint = item.groupId
      ? `/api/admin/media-promosi/group/${item.groupId}`
      : `/api/admin/media-promosi/${item.id}`;

    try {
      if (onDeleteArticle) {
        onDeleteArticle(item.groupId || item.id);
      } else {
        await window.axios.delete(endpoint);
        router.reload({ only: ["mediaArticles"], preserveScroll: true });
      }
      onRecordAdminActivity?.({
        title: item.category === "Galeri" ? "Menghapus foto galeri" : "Menghapus berita",
        description: item.title || "Media promosi",
      });
      showStatus("Media berhasil dihapus.");
    } catch (error) {
      showStatus(apiErrorMessage(error, "Gagal menghapus media."), "error");
    }
  };

  const handleDelete = (item) => {
    setConfirmAction({
      title: `Hapus ${item.category === "Galeri" ? "foto galeri" : "berita"}?`,
      message: `"${item.title || "Media ini"}" akan dihapus dari database dan tidak tampil lagi di halaman publik.`,
      confirmLabel: "Hapus",
      danger: true,
      onConfirm: () => deleteMedia(item),
    });
  };

  const editNews = (item) => {
    setActiveTab("berita");
    setNewsForm({
      id: item.id,
      groupId: item.groupId,
      title: item.title || "",
      body: item.body || "",
      image: item.image || "",
      imageFile: null,
      imageName: item.imageName || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const editGallery = (item) => {
    setActiveTab("galeri");
    setGalleryForm({
      id: item.id,
      groupId: item.groupId,
      title: item.title || "",
      image: item.image || "",
      imageFile: null,
      imageName: item.imageName || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="adminMediaSection">
      <div className="adminMediaHeader">
        <div>
          <span className="adminMediaEyebrow">Media Promosi</span>
          <h2>Kelola Berita dan Galeri</h2>
          <p>Tambahkan konten publik yang langsung tersimpan ke database dan tampil di halaman website.</p>
        </div>

        <div className="adminMediaTabs" role="tablist" aria-label="Media promosi">
          <button
            type="button"
            className={activeTab === "berita" ? "isActive" : ""}
            onClick={() => setActiveTab("berita")}
          >
            Berita
          </button>
          <button
            type="button"
            className={activeTab === "galeri" ? "isActive" : ""}
            onClick={() => setActiveTab("galeri")}
          >
            Tambah Foto Galeri
          </button>
        </div>
      </div>

      {activeTab === "berita" ? (
        <form className="adminMediaPanel" onSubmit={handleSaveNews}>
          <div className="adminMediaFormGrid">
            <div className="adminMediaFields">
              <label>
                <span>Judul Berita</span>
                <input
                  type="text"
                  value={newsForm.title}
                  onChange={(event) => setNewsForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Contoh: Persiapan Latihan Rutin Sebelum Liga"
                />
              </label>
              <label>
                <span>Isi Berita</span>
                <textarea
                  value={newsForm.body}
                  onChange={(event) => setNewsForm((prev) => ({ ...prev, body: event.target.value }))}
                  placeholder="Tulis isi berita yang akan muncul di halaman detail."
                />
              </label>
            </div>

            <div className="adminMediaUploadBox">
              {newsForm.image ? (
                <img
                  src={newsForm.image}
                  alt="Preview berita"
                  onError={(event) => handleImageError(event, BeritaFallback)}
                />
              ) : (
                <div className="adminMediaUploadEmpty">Belum ada foto berita</div>
              )}
              <label className="adminMediaUploadButton">
                <input type="file" accept="image/*" onChange={(event) => handleImageChange(event, "Berita")} />
                {newsForm.image ? "Ganti Foto" : "Upload Foto"}
              </label>
              {newsForm.imageName && <small>{newsForm.imageName}</small>}
            </div>
          </div>

          <div className="adminMediaActions">
            {newsForm.id && (
              <button type="button" className="adminMediaGhostButton" onClick={() => setNewsForm(emptyNewsForm)}>
                Batal
              </button>
            )}
            <button type="submit" className="adminMediaPrimaryButton" disabled={isSubmitting}>
              {newsForm.id ? "Simpan Berita" : "Publikasikan Berita"}
            </button>
          </div>
        </form>
      ) : (
        <form className="adminMediaPanel" onSubmit={handleSaveGallery}>
          <div className="adminMediaLibraryHeader">
            <h3>Tambah Foto Galeri</h3>
            <button type="button" className="adminMediaGhostButton" onClick={() => setActiveTab("berita")}>
              Kembali ke Berita
            </button>
          </div>

          <div className="adminMediaFormGrid compact">
            <label className="adminMediaTitleField">
              <span>Judul Foto</span>
              <input
                type="text"
                value={galleryForm.title}
                onChange={(event) => setGalleryForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Contoh: Latihan Minggu Pagi"
              />
            </label>

            <div className="adminMediaUploadBox">
              {galleryForm.image ? (
                <img
                  src={galleryForm.image}
                  alt="Preview galeri"
                  onError={(event) => handleImageError(event, GaleriFallback)}
                />
              ) : (
                <div className="adminMediaUploadEmpty">Belum ada foto galeri</div>
              )}
              <label className="adminMediaUploadButton">
                <input type="file" accept="image/*" onChange={(event) => handleImageChange(event, "Galeri")} />
                {galleryForm.image ? "Ganti Foto" : "Upload Foto"}
              </label>
              {galleryForm.imageName && <small>{galleryForm.imageName}</small>}
            </div>
          </div>

          <div className="adminMediaActions">
            {galleryForm.id && (
              <button type="button" className="adminMediaGhostButton" onClick={() => setGalleryForm(emptyGalleryForm)}>
                Batal
              </button>
            )}
            <button type="submit" className="adminMediaPrimaryButton" disabled={isSubmitting}>
              {galleryForm.id ? "Simpan Foto" : "Tambah ke Galeri"}
            </button>
          </div>
        </form>
      )}

      {statusMessage && (
        <div className={`adminMediaToast ${statusType === "error" ? "isError" : "isSuccess"}`}>
          <strong>{statusType === "error" ? "Gagal" : "Berhasil"}</strong>
          <span>{statusMessage}</span>
        </div>
      )}

      <section className="adminMediaLibrary">
        <div className="adminMediaLibraryHeader">
          <h3>{activeTab === "berita" ? "Berita Aktif" : "Foto Galeri"}</h3>
          <span>{activeTab === "berita" ? newsItems.length : galleryItems.length} item</span>
        </div>

        <div className="adminMediaLibraryGrid">
          {(activeTab === "berita" ? newsItems : galleryItems).map((item) => (
            <article key={`${item.category}-${item.groupId || item.id}`} className="adminMediaCard">
              <div className="adminMediaThumb">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    onError={(event) =>
                      handleImageError(event, fallbackForCategory(item.category))
                    }
                  />
                ) : (
                  <img src={fallbackForCategory(item.category)} alt={item.title || "Media"} />
                )}
              </div>
              <div className="adminMediaCardBody">
                <small>{item.dateLabel}</small>
                <h4>{item.title}</h4>
                {activeTab === "berita" && <p>{excerpt(item.body)}</p>}
                <div className="adminMediaCardActions">
                  <button type="button" className="adminMediaGhostButton" onClick={() => (activeTab === "berita" ? editNews(item) : editGallery(item))}>
                    Edit
                  </button>
                  <button type="button" className="adminMediaDangerButton" onClick={() => handleDelete(item)}>
                    Hapus
                  </button>
                </div>
              </div>
            </article>
          ))}

          {(activeTab === "berita" ? newsItems : galleryItems).length === 0 && (
            <div className="adminMediaEmpty">Belum ada {activeTab === "berita" ? "berita" : "foto galeri"}.</div>
          )}
        </div>
      </section>

      {confirmAction && (
        <div className="adminMediaConfirmBackdrop" role="presentation">
          <div className="adminMediaConfirmDialog" role="dialog" aria-modal="true">
            <h3>{confirmAction.title}</h3>
            <p>{confirmAction.message}</p>
            <div className="adminMediaConfirmActions">
              <button
                type="button"
                className="adminMediaGhostButton"
                onClick={() => setConfirmAction(null)}
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="button"
                className={confirmAction.danger ? "adminMediaDangerButton" : "adminMediaPrimaryButton"}
                disabled={isSubmitting}
                onClick={async () => {
                  const action = confirmAction.onConfirm;
                  setConfirmAction(null);
                  await action();
                }}
              >
                {isSubmitting ? "Menyimpan..." : confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

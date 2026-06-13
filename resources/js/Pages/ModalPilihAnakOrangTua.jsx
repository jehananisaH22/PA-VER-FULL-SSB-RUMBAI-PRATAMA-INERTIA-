import "../../css/ModalPilihAnakOrangTua.css";

export default function ModalPilihAnakOrangTua({
  open,
  childrenOptions = [],
  onSelectChild,
  isLoading = false,
  error = "",
}) {
  if (!open) return null;

  return (
    <div className="childPickerOverlay" role="dialog" aria-modal="true" aria-label="Pilih anak">
      <div className="childPickerCard">
        <h2>Pilih Anak</h2>
        <p>Pilih nama anak, lalu masukkan kata kunci akun anak tersebut.</p>
        <div className="childPickerList">
          {isLoading && childrenOptions.length === 0 && <div className="childPickerState">Memuat data anak...</div>}
          {!isLoading && error && <div className="childPickerState is-error">{error}</div>}
          {!isLoading && !error && childrenOptions.length === 0 && (
            <div className="childPickerState">Belum ada data anak.</div>
          )}
          {!error && childrenOptions.map((child) => {
            const childId = child?.id_siswa ?? child?.id ?? child;
            const childName = child?.nama_siswa ?? child?.name ?? child;

            return (
              <button
                key={childId}
                type="button"
                className="childPickerItem"
                onClick={() => onSelectChild?.(child)}
              >
                {childName}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import './ParentPaymentLockModal.css';

const rupiah = (amount) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(Number(amount || 0));

export default function ParentPaymentLockModal() {
  const { overduePayment } = usePage().props;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!overduePayment?.isLocked) return null;

  const pending = Number(overduePayment.pendingAmount || 0);
  const logout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    router.post('/logout', {}, {
      replace: true,
      onError: () => setIsLoggingOut(false),
      onCancel: () => setIsLoggingOut(false),
    });
  };

  return (
    <div className="parentPaymentLock" role="dialog" aria-modal="true" aria-labelledby="payment-lock-title">
      <section className="parentPaymentLockCard">
        <div className="parentPaymentLockIcon" aria-hidden="true">Rp</div>
        <p className="parentPaymentLockEyebrow">Pembayaran belum lunas</p>
        <h1 id="payment-lock-title">Akses akun sementara dikunci</h1>
        <p>
          Pembayaran {overduePayment.studentName ? `untuk ${overduePayment.studentName} ` : ''}
          pada periode <strong>{overduePayment.periodLabel}</strong> belum memenuhi target bulanan.
        </p>

        <dl className="parentPaymentLockDetails">
          <div><dt>Target pembayaran</dt><dd>{rupiah(overduePayment.targetAmount)}</dd></div>
          <div><dt>Sudah disetujui admin</dt><dd>{rupiah(overduePayment.paidAmount)}</dd></div>
          {pending > 0 && <div><dt>Menunggu validasi admin</dt><dd>{rupiah(pending)}</dd></div>}
          <div className="isRemaining"><dt>Kekurangan</dt><dd>{rupiah(overduePayment.remainingAmount)}</dd></div>
        </dl>

        <p className="parentPaymentLockHelp">
          Silakan lakukan pembayaran kepada pelatih. Pelatih akan mengunggah bukti dan nominal pembayaran,
          lalu admin akan memvalidasinya. Halaman terbuka kembali otomatis setelah total pembayaran disetujui dan lunas.
        </p>
        {pending > 0 && (
          <div className="parentPaymentLockPending">Bukti pembayaran sedang menunggu validasi admin.</div>
        )}
        <button
          type="button"
          className="parentPaymentLockLogout"
          onClick={logout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Sedang logout...' : 'Logout'}
        </button>
      </section>
    </div>
  );
}

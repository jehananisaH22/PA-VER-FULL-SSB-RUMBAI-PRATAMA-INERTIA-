import { router } from "@inertiajs/react";

export const parentRoutes = {
  home: "/",
  dashboard: "/orang-tua/dashboard",
  attendance: "/orang-tua/kehadiran",
  performance: "/orang-tua/performa",
  achievements: "/orang-tua/prestasi",
  notes: "/orang-tua/catatan-pelatih",
  payments: "/orang-tua/pembayaran",
  reupload: "/orang-tua/upload-ulang",
  profile: "/profile/orangtua",
  logout: "/login/orangtua",
};

export function visitOrCall(handler, path) {
  return () => {
    if (handler) {
      handler();
      return;
    }

    router.visit(path);
  };
}

import { router } from "@inertiajs/react"; 

export const coachRoutes = { 
  home: "/", 
  dashboard: "/pelatih/dashboard", 
  attendance: "/pelatih/kehadiran", 
  performance: "/pelatih/performa", 
  notes: "/pelatih/catatan", 
  payments: "/pelatih/pembayaran", 
  profile: "/profile/pelatih", 
  logout: "/login/pelatih"
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

import { Head, router } from "@inertiajs/react"; 
import Beranda from "../Beranda.jsx"; 

export default function Welcome({ articles = [], galeri = [] }) {
  const visit = (url) => router.visit(url); 

  return (
    <>
             <Head title="SSB Rumbai Pratama" />
             <Beranda
        articles={articles}
        galleryItems={galeri}
        onOpenDaftar={() => visit("/register")}
        onOpenLogin={() => visit("/login")}
        onOpenBeritaList={() => visit("/berita")}
        onOpenBeritaDetail={() => visit("/berita")}
        onOpenGaleri={() => visit("/galeri")} />
      
        </>);

}

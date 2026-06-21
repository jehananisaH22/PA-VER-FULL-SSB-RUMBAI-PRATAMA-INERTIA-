import Berita1 from "../../assets/Berita1.png"; 
import Berita2 from "../../assets/Berita2.png"; 

const defaultArticleImages = [Berita1, Berita2]; 

export const defaultArticles = [
{ 
  id: "default-1", 
  title: "Latihan Rutin SSB Rumbai Pratama Bangun Disiplin dan Kekompakan Pemain", 
  excerpt:
  "Program latihan rutin menjadi ruang pembinaan teknik dasar, fisik, dan karakter pemain muda SSB Rumbai Pratama.", 
  body:
  "SSB Rumbai Pratama terus menjalankan latihan rutin sebagai bagian dari pembinaan pemain usia dini dan remaja. Setiap sesi latihan dirancang untuk meningkatkan kemampuan dasar sepak bola, mulai dari kontrol bola, passing, dribbling, penyelesaian akhir, hingga pemahaman posisi di lapangan.\n\nSelain aspek teknik, pelatih juga menekankan kedisiplinan, kerja sama tim, dan sportivitas. Para pemain dibiasakan datang tepat waktu, mengikuti instruksi dengan baik, serta saling mendukung selama latihan berlangsung.\n\nMelalui kegiatan ini, SSB Rumbai Pratama berharap para pemain dapat berkembang secara bertahap, percaya diri saat bertanding, dan membawa nilai positif baik di lapangan maupun dalam kehidupan sehari-hari.", 
  image: Berita1, 
  imageName: "Berita1.png", 
  dateLabel: "26 Mei 2026", 
  postedAt: new Date("2026-05-26T08:00:00+07:00").getTime(), 
  category: "Berita"
},
{ 
  id: "default-2", 
  title: "Semangat Bertanding Pemain Muda Jadi Modal Prestasi Berikutnya", 
  excerpt:
  "Pemain SSB Rumbai Pratama menunjukkan semangat tinggi dalam pertandingan uji coba dan terus diasah untuk tampil lebih matang.", 
  body:
  "Pertandingan uji coba menjadi kesempatan penting bagi pemain SSB Rumbai Pratama untuk menerapkan hasil latihan secara langsung. Dalam kegiatan ini, pemain belajar membaca situasi pertandingan, menjaga komunikasi antar lini, dan mengambil keputusan dengan cepat.\n\nPelatih memberikan evaluasi setelah pertandingan agar setiap pemain memahami hal yang sudah baik dan bagian yang perlu diperbaiki. Evaluasi dilakukan dengan pendekatan pembinaan supaya pemain tetap termotivasi dan berani berkembang.\n\nDengan semangat bertanding yang terus dijaga, SSB Rumbai Pratama menargetkan pembinaan yang konsisten sehingga pemain muda mampu tumbuh menjadi pribadi yang tangguh, sportif, dan siap meraih prestasi.", 
  image: Berita2, 
  imageName: "Berita2.png", 
  dateLabel: "24 Mei 2026", 
  postedAt: new Date("2026-05-24T08:00:00+07:00").getTime(), 
  category: "Berita"
}]; 


export function resolveArticles(articles = []) {
  const source = Array.isArray(articles) && articles.length > 0 ? articles : defaultArticles; 

  return source.map((article, index) => ({
    ...defaultArticles[index % defaultArticles.length],
    ...article, 
    image: article?.image || defaultArticleImages[index % defaultArticleImages.length], 
    fallbackImage: defaultArticleImages[index % defaultArticleImages.length], 
    excerpt: article?.excerpt || defaultArticles[index % defaultArticles.length].excerpt, 
    body: article?.body || article?.excerpt || defaultArticles[index % defaultArticles.length].body, 
    dateLabel: article?.dateLabel || defaultArticles[index % defaultArticles.length].dateLabel
  }));
}

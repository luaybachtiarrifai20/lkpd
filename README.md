# LajuNalar — E-LKPD Interaktif Laju Reaksi Berbasis PBL-ESD

Website edukasi interaktif (E-LKPD) untuk mata pelajaran Kimia SMA topik **Laju Reaksi**, terdiri dari 4 Kegiatan Belajar berbasis **Problem Based Learning (PBL)** yang diintegrasikan dengan **Education for Sustainable Development (ESD)**.

## Identitas Proyek

- **Judul Penelitian:** Pengembangan E-LKPD Berbasis PBL-ESD dengan Integrasi Platform E-Assessment untuk Meningkatkan Penalaran Kimia dan Argumentasi Siswa pada Materi Laju Reaksi
- **Pengembang:** Bela Anisa Putri
- **Program Studi:** Magister Pendidikan Kimia, Universitas Sebelas Maret (UNS)
- **Sumber Dana:** Hibah Penelitian Tesis Magister UNS 2026
- **Tahun:** 2026

## Teknologi

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Routing:** React Router v7
- **QR Code:** qrcode.react
- **PDF Export:** jsPDF
- **Icons:** lucide-react

## Cara Menjalankan

```bash
npm install
npm run dev      # mode pengembangan
npm run build    # build produksi
npm run typecheck # cek tipe TypeScript
```

Server dev otomatis berjalan. Buka browser ke URL yang ditampilkan.

## Struktur Project

```
src/
├── App.tsx                      # Routing utama + proteksi peran
├── content/
│   └── kegiatanContent.ts       # SKEMA KONTEN 4 kegiatan (lihat cara edit di bawah)
├── context/
│   ├── AuthContext.tsx          # Sesi & profil pengguna
│   └── ToastContext.tsx         # Notifikasi
├── lib/
│   ├── supabase.ts              # Klien Supabase + tipe data
│   ├── answers.ts               # Operasi CRUD jawaban/assessment
│   └── pdf.ts                   # Ekspor PDF (individu & rekap)
├── components/
│   ├── ui/                      # Button, Card, Badge, Modal, ProgressBar
│   ├── interactive/             # TextAnswer, EditableTable, FileUpload, TAP, dll
│   └── layout/                  # Navbar, Sidebar, Footer
└── pages/
    ├── LandingPage.tsx          # Beranda publik
    ├── AboutPage.tsx            # Tentang produk & penelitian
    ├── AuthPage.tsx             # Login & Daftar (siswa/guru)
    ├── student/                 # Dashboard, Activity (PBL stepper), Riwayat, Profil
    └── teacher/                 # Dashboard, Kelas, Rekap, SiswaDetail, Assessment, Ekspor
```

## Peran Pengguna

### Siswa
- Daftar dengan kode kelas dari guru, atau tanpa kode (bergabung nanti).
- Mengerjakan 4 kegiatan via stepper Sintaks PBL 1–5.
- Isi jawaban: teks, tabel, upload file, argumentasi TAP.
- Akses kuis e-assessment via embed iframe atau QR code.
- Lihat riwayat & nilai.

### Guru
- Buat kelas dengan kode undangan otomatis.
- Rekap progres siswa per kegiatan.
- Lihat detail jawaban siswa, beri nilai & feedback.
- Kelola tautan kuis eksternal (Google Forms/Quizizz/dll.) — sistem auto-generate embed + QR.
- Ekspor PDF: individu per siswa, massal per kelas, rekap tabel.

## Cara Menambah / Mengubah Konten Kegiatan

Seluruh konten 4 kegiatan didefinisikan di **`src/content/kegiatanContent.ts`** sebagai data terstruktur (`KegiatanContent`). Tidak perlu mengubah database — cukup edit file ini.

### Struktur `KegiatanContent`

```typescript
{
  nomor: 1,                          // nomor kegiatan (1-4)
  judul: 'Kegiatan 1 — ...',         // judul lengkap
  subjudul: '...',                   // sub-judul tema ESD
  warna: '#D84315',                  // warna identitas (lihat palet)
  warnaLight: '#FBE9E7',             // warna light untuk background
  sdg: [{ nomor: 12, warna: '#BF8B2E', label: '...' }],  // badge SDG
  tujuan: ['...', '...'],            // tujuan pembelajaran
  materi: '...',                     // ringkasan materi
  steps: [                           // 5 sintaks PBL + assessment
    {
      id: 's1',
      sintaks: 1,
      label: 'Orientasi Masalah',
      ringkas: '...',
      blocks: [ /* ContentBlock[] — lihat jenis di bawah */ ]
    },
    // ... sintaks 2-5
  ]
}
```

### Jenis `ContentBlock` yang tersedia

| `kind` | Deskripsi | Field wajib |
|---|---|---|
| `stimulus` | Card abu-abu berisi stimulus | `title`, `body` |
| `masalah` | Card kuning narasi masalah | `title`, `body` |
| `pertanyaan` | Pertanyaan + input teks | `id`, `text`, `hint?` |
| `tabel-org` | Tabel isian Diketahui/Perlu Diketahui/Hipotesis | `id`, `headers`, `rowCount`, `title` |
| `data-eksperimen` | Tabel data read-only | `title`, `headers`, `rows` |
| `input-hitung` | Input angka + penjelasan + upload gambar | `id`, `label`, `unit?`, `allowImage?` |
| `diagram-submikro` | Perbandingan dua kolom visual | `title`, `kiri`, `kanan` |
| `analitis` | Pertanyaan analitis + textarea | `id`, `text` |
| `instruksi-pengembangan` | Instruksi tugas | `title`, `body` |
| `upload-hasil` | Widget upload file | `id`, `title`, `body` |
| `ringkasan-rekomendasi` | Textarea ringkasan | `id`, `text` |
| `alternatif-kasus` | Radio card pilihan + alasan | `id`, `title`, `options[]`, `alasanId` |
| `argumentasi-tap` | Diagram alur TAP 6 komponen | `id`, `title`, `kasus` |
| `penalaran-level` | Ringkasan 3 level representasi | `makroskopik`, `submikroskopik`, `simbolik` |

Setiap `id` pada block yang butuh input harus **unik** per kegiatan (digunakan sebagai key penyimpanan jawaban).

### Contoh: menambah pertanyaan baru

```typescript
{ kind: 'pertanyaan', id: 'k1_p3', text: 'Apa hubungan suhu dengan laju penguraian?', hint: 'Pikirkan tentang energi kinetik partikel.' }
```

### E-Assessment (Kuis Eksternal)

Kuis TIDAK dibangun native. Guru menempelkan link kuis dari platform eksternal melalui menu **"Tautan E-Assessment"** di dashboard guru. Sistem otomatis:
1. Menampilkan kuis sebagai **iframe embed** di halaman siswa.
2. Men-generate **QR code** dari link yang sama.
3. Menyediakan checkbox "Saya sudah mengerjakan" untuk progress tracker.

Skor kuis tetap direkap di platform eksternal; guru dapat input skor manual agar tampil di rekap & PDF.

## Database (Supabase)

Skema sudah dibuat via migration:

| Tabel | Fungsi |
|---|---|
| `kelas` | Kelas yang dikelola guru + kode undangan |
| `profiles` | Profil siswa/guru (tertaut auth.users) |
| `kegiatan` | Metadata 4 kegiatan (di-seed) |
| `jawaban` | Dokumen jawaban siswa per kegiatan (JSONB) |
| `assessment_eksternal` | Tautan kuis eksternal per kegiatan |
| `status_kuis_siswa` | Penanda siswa sudah mengerjakan kuis + skor manual |

**RLS aktif** di semua tabel: siswa hanya akses datanya sendiri; guru akses siswa di kelasnya.

## Palet Warna

| Token | Hex | Penggunaan |
|---|---|---|
| primary-green | `#2E7D32` | Brand utama |
| teal | `#00695C` | Aksen kegiatan genap |
| amber | `#F9A825` | Narasi masalah |
| student | `#1565C0` | Aksen siswa |
| teacher | `#4527A0` | Aksen guru |

Warna identitas kegiatan: K1 `#D84315`, K2 `#1565C0`, K3 `#2E7D32`, K4 `#00695C`.

## Catatan

Konten naskah lengkap tiap kegiatan (materi, tabel data, pertanyaan, studi kasus) saat ini berisi placeholder terstruktur. Untuk mengisi konten final, edit `src/content/kegiatanContent.ts` mengikuti struktur di atas, atau gunakan naskah dari berkas E-LKPD Word.

import type { KegiatanContent } from '../types';

export const kegiatan1: KegiatanContent = {
  nomor: 1,
  judul: 'Kegiatan 1 — Mengapa Makanan Cepat Basi?',
  subjudul: 'Pengaruh Suhu terhadap Laju Reaksi',
  warna: '#D84315',
  warnaLight: '#FBE9E7',
  sdg: [
    { nomor: 2, warna: '#DDA63A', label: 'Zero Hunger' },
    { nomor: 12, warna: '#BF8B2E', label: 'Konsumsi & Produksi Bertanggung Jawab' },
  ],
  cakupanMateri: [
    'Pengertian laju reaksi',
    'Faktor suhu terhadap laju reaksi',
    'Teori tumbukan',
    'Energi aktivasi (pengantar)',
    'Perhitungan laju reaksi',
  ],
  tujuan: [
    'Menjelaskan pengaruh suhu terhadap laju reaksi berdasarkan teori tumbukan.',
    'Menghitung laju pembusukan makanan pada berbagai suhu.',
    'Menganalisis hubungan suhu dengan energi kinetik partikel dan jumlah tumbukan efektif.',
    'Memberikan rekomendasi penyimpanan makanan untuk mengurangi food waste.',
    'Menyusun argumentasi ilmiah menggunakan kerangka TAP.',
  ],
  materi:
    'Laju reaksi adalah kecepatan perubahan jumlah reaktan atau produk per satuan waktu. Suhu memengaruhi laju reaksi karena peningkatan suhu meningkatkan energi kinetik partikel, sehingga frekuensi tumbukan efektif meningkat dan lebih banyak partikel melebihi energi aktivasi.',
  steps: [
    {
      id: 's1',
      sintaks: 1,
      label: 'Orientasi pada Masalah',
      ringkas: 'Stimulus, narasi masalah & pertanyaan pemantik',
      blocks: [
        {
          kind: 'stimulus',
          title: 'Amati dan Simak',
          body: 'Video time-lapse proses pembusukan roti yang disimpan pada suhu ruang dibandingkan dengan roti yang disimpan dalam lemari pendingin. Gambar pengamatan: roti di meja (suhu ruang) tampak berjamur, roti di lemari pendingin masih layak dikonsumsi. Artikel pendukung: data singkat mengenai kondisi food waste di Indonesia.',
        },
        {
          kind: 'masalah',
          title: 'Narasi Masalah',
          body: 'Sebuah kantin sekolah sering membuang makanan karena cepat basi. Pengelola kantin ingin mengetahui cara penyimpanan yang tepat agar makanan tetap aman dikonsumsi tanpa meningkatkan pemborosan energi.',
        },
        { kind: 'pertanyaan', id: 'k1_p1', text: 'Mengapa makanan lebih cepat basi pada suhu ruang?' },
        { kind: 'pertanyaan', id: 'k1_p2', text: 'Bagaimana suhu memengaruhi laju pembusukan makanan?' },
        { kind: 'pertanyaan', id: 'k1_p3', text: 'Bagaimana konsep laju reaksi dapat membantu mengurangi food waste?' },
      ],
    },
    {
      id: 's2',
      sintaks: 2,
      label: 'Mengorganisasi Peserta Didik',
      ringkas: 'Diagnosis awal & perencanaan penyelidikan',
      blocks: [
        {
          kind: 'tabel-org',
          id: 'k1_org',
          headers: ['Apa yang sudah diketahui?', 'Apa yang perlu diketahui?', 'Hipotesis'],
          rowCount: 3,
          title: 'Aktivitas 1 — Diagnosis Awal',
          perencanaanId: 'k1_rencana',
          perencanaanText: 'Aktivitas 2 — Perencanaan Penyelidikan: Tuliskan informasi apa saja yang harus dikumpulkan agar dapat menentukan cara penyimpanan makanan yang paling tepat.',
        },
      ],
    },
    {
      id: 's3',
      sintaks: 3,
      label: 'Membimbing Penyelidikan',
      ringkas: 'Data percobaan & pertanyaan analisis',
      blocks: [
        {
          kind: 'data-eksperimen',
          title: 'Data Percobaan — Pengamatan pembusukan makanan pada variasi suhu',
          headers: ['Suhu', 'Makanan Membusuk', 'Waktu'],
          rows: [['5 °C', '10 gram', '5 hari'], ['25 °C', '10 gram', '2 hari'], ['35 °C', '10 gram', '1 hari']],
        },
        { kind: 'bagian-header', label: 'Pertanyaan Analisis' },
        { kind: 'input-hitung', id: 'k1_h1', label: 'Hitung laju pembusukan makanan pada masing-masing suhu', unit: 'gram/hari', allowImage: true },
        { kind: 'analitis', id: 'k1_h2', text: 'Urutkan suhu berdasarkan laju pembusukan dari yang paling lambat hingga paling cepat.', allowImage: true },
        { kind: 'analitis', id: 'k1_h3', text: 'Buat grafik hubungan suhu terhadap laju reaksi.', allowImage: true },
        { kind: 'analitis', id: 'k1_h4', text: 'Jelaskan hubungan suhu dengan energi kinetik partikel.' },
        { kind: 'analitis', id: 'k1_h5', text: 'Jelaskan hubungan suhu dengan jumlah tumbukan efektif.' },
        { kind: 'analitis', id: 'k1_h6', text: 'Mengapa peningkatan suhu dapat mempercepat laju reaksi menurut teori tumbukan?' },
        { kind: 'analitis', id: 'k1_h7', text: 'Mengapa suhu tinggi menyebabkan lebih banyak partikel memiliki energi melebihi energi aktivasi?' },
      ],
    },
    {
      id: 's4',
      sintaks: 4,
      label: 'Mengembangkan dan Menyajikan Hasil',
      ringkas: 'Infografik rekomendasi & unggah karya',
      blocks: [
        {
          kind: 'instruksi-pengembangan',
          title: 'Buat Infografik Rekomendasi Penyimpanan Makanan',
          body: 'Bersama kelompok, buatlah sebuah infografik rekomendasi penyimpanan makanan yang memuat:',
          bullets: [
            'Hasil analisis data percobaan.',
            'Hubungan suhu dan laju reaksi.',
            'Penjelasan berdasarkan teori tumbukan.',
            'Rekomendasi penyimpanan makanan untuk mengurangi food waste.',
          ],
        },
        { kind: 'upload-hasil', id: 'k1_up', title: 'Unggah Karya', body: 'Unggah infografik kelompok Anda pada kolom yang tersedia.' },
      ],
    },
    {
      id: 's5',
      sintaks: 5,
      label: 'Menganalisis dan Mengevaluasi',
      ringkas: 'Studi kasus, alternatif & argumentasi TAP',
      blocks: [
        {
          kind: 'alternatif-kasus',
          id: 'k1_alt',
          title: 'Studi Kasus — Kantin ingin mengurangi biaya listrik. Pilih alternatif paling tepat:',
          options: [
            { id: 'a', label: 'Alternatif A', deskripsi: 'Semua makanan disimpan pada suhu ruang agar biaya listrik lebih hemat.' },
            { id: 'b', label: 'Alternatif B', deskripsi: 'Seluruh makanan disimpan dalam lemari pendingin agar makanan lebih awet.' },
            { id: 'c', label: 'Alternatif C', deskripsi: 'Menyimpan makanan sesuai karakteristiknya: bahan mudah rusak di lemari pendingin, bahan tahan lama pada suhu ruang dengan pengelolaan stok yang baik.' },
          ],
          alasanId: 'k1_alt_alasan',
        },
        {
          kind: 'argumentasi-tap',
          id: 'k1_tap',
          title: 'Argumentasi Ilmiah (TAP)',
          kasus: 'Berdasarkan hasil perhitungan laju pembusukan, alternatif manakah yang paling tepat untuk mengurangi food waste sekaligus efisien energi? Susun argumentasimu dengan kerangka TAP.',
        },
        {
          kind: 'penalaran-level',
          makroskopik: 'Makanan yang cepat basi.',
          submikroskopik: 'Ilustrasi tumbukan partikel pada suhu rendah dan tinggi.',
          simbolik: 'Grafik suhu terhadap laju pembusukan serta perhitungan laju reaksi.',
        },
      ],
    },
  ],
};

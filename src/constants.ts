import { StatusAbsensi, JenisPelanggaran } from './types';

// NOTE: Most INITIAL_*_DATA arrays have been moved to `services/apiService.ts` to simulate a database.
// The data below is treated as static configuration for the app.

export const INITIAL_STATUS_ABSENSI_DATA: StatusAbsensi[] = [
    { id: 1, nama: 'Hadir', kode: 'hadir', warna: 'green', prioritas: 1, aktif: true },
    { id: 2, nama: 'Tidak Hadir', kode: 'tidak', warna: 'red', prioritas: 2, aktif: true },
    { id: 3, nama: 'Izin', kode: 'izin', warna: 'yellow', prioritas: 3, aktif: true },
    { id: 4, nama: 'Sakit', kode: 'sakit', warna: 'orange', prioritas: 4, aktif: true },
    { id: 5, nama: 'Terlambat', kode: 'terlambat', warna: 'purple', prioritas: 5, aktif: true }
];

export const INITIAL_JENIS_PELANGGARAN_DATA: JenisPelanggaran[] = [
    { id: 1, nama: 'Terlambat Sholat', kode: 'terlambat', poin: 5, aktif: true, deskripsi: 'Terlambat mengikuti sholat berjamaah' },
    { id: 2, nama: 'Tidak Hadir Tanpa Keterangan', kode: 'tidak-hadir', poin: 10, aktif: true, deskripsi: 'Tidak mengikuti kegiatan tanpa izin' },
    { id: 3, nama: 'Tidak Berpakaian Rapi', kode: 'tidak-rapi', poin: 3, aktif: true, deskripsi: 'Tidak memakai seragam atau peci' },
    { id: 4, nama: 'Membuat Gaduh', kode: 'gaduh', poin: 7, aktif: true, deskripsi: 'Mengganggu ketenangan saat kegiatan' },
    { id: 5, nama: 'Tidak Membawa Al-Quran', kode: 'tidak-alquran', poin: 2, aktif: true, deskripsi: 'Lupa membawa Al-Quran saat mengaji' },
    { id: 6, nama: 'Berbicara Saat Ustadz Mengajar', kode: 'berbicara', poin: 5, aktif: true, deskripsi: 'Berbicara atau bercanda saat pembelajaran' }
];


export const SANTRI_UPLOAD_HEADERS = ['nomor_induk', 'nama', 'kelas', 'ttl', 'wali', 'kontak_wali', 'alamat'];
export const PEMBINA_UPLOAD_HEADERS = ['id_pembina', 'nama', 'kontak', 'alamat', 'pendidikan', 'status', 'kelas_diampu'];
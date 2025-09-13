export interface Santri {
  id: number;
  nomor_induk: string;
  nama: string;
  kelas: string;
  ttl: string;
  alamat: string;
  wali: string;
  kontak_wali: string;
  status: 'hadir' | 'tidak' | 'izin' | 'terlambat' | null;
  waktu: string | null;
  keterangan?: string | null;
}

export interface Pembina {
  id: number;
  id_pembina: string;
  nama: string;
  kontak: string;
  alamat: string;
  pendidikan: string;
  status: 'Aktif' | 'Tidak Aktif';
  kelas_diampu: string[];
}

export interface Kelas {
  id: number;
  nama_kelas: string;
  tingkat: 'Pemula' | 'Menengah' | 'Lanjutan';
  kapasitas: number;
  jumlah_santri: number;
  pembina: string;
  jadwal: string;
  ruangan: string;
  deskripsi: string;
}

export interface Kegiatan {
  id: number;
  nama: string;
  jam_mulai: string;
  jam_selesai: string;
  hari_aktif: string[];
  status: 'aktif' | 'nonaktif';
  deskripsi: string;
}

export interface StatusAbsensi {
    id: number;
    nama: string;
    kode: string;
    warna: string;
    prioritas: number;
    aktif: boolean;
}

export interface JenisPelanggaran {
    id: number;
    nama: string;
    kode: string;
    poin: number;
    aktif: boolean;
    deskripsi: string;
}

export interface Pelanggaran {
    id: number;
    santri_id: number;
    santri_nama: string;
    jenis: string;
    deskripsi: string;
    tanggal: string;
    pembina: string;
}

export interface Kesehatan {
    id: number;
    santri_id: number;
    santri_nama: string;
    status: 'sakit' | 'sembuh' | 'izin';
    catatan: string;
    tanggal: string;
    pembina: string;
}

export interface AbsensiRecord {
  id: number;
  santri_id: number;
  santri_nama: string;
  kelas: string;
  status: 'hadir' | 'tidak' | 'izin' | 'terlambat';
  waktu: string;
  tanggal: string;
  kegiatan: string;
  keterangan?: string;
}

export interface AdminData {
    id: number;
    name: string;
    username: string;
    password?: string;
}


export type UserRole = 'admin' | 'pembina' | 'superadmin';

export interface User {
  role: UserRole;
  name: string;
  username?: string;
  id?: string;
}

export type Section = 'dashboard' | 'absensi' | 'laporan' | 'manajemen' | 'pembinaan';

export type ReportTab = 'absensi' | 'pelanggaran' | 'kesehatan';

export type DataTab = 'santri' | 'pembina' | 'kelas' | 'kegiatan' | 'admin';

export type QuickModalType = 'pembina' | 'kegiatan' | 'kelas' | 'status' | 'pelanggaran' | 'backup' | null;

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}
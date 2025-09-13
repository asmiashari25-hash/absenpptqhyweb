
import { Santri, Pembina, Kelas } from '../types';

declare const XLSX: any;

export const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
  if (typeof XLSX === 'undefined') {
    console.error("XLSX library is not loaded.");
    alert("Excel export functionality is not available.");
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const downloadSantriTemplate = () => {
    const wsData = [
        ['nomor_induk', 'nama', 'kelas', 'ttl', 'wali', 'kontak_wali', 'alamat'],
        ['S101', 'Nama Santri', '1A', 'Jakarta, 01 Januari 2010', 'Nama Wali', '081234567890', 'Alamat Lengkap'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Santri');
    XLSX.writeFile(wb, 'template_santri.xlsx');
};

export const downloadPembinaTemplate = () => {
    const wsData = [
        ['id_pembina', 'nama', 'kontak', 'alamat', 'pendidikan', 'status', 'kelas_diampu'],
        ['P101', 'Nama Pembina', '081234567890', 'Alamat Lengkap', 'S1 Pendidikan', 'Aktif', '1A, 1B'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Pembina');
    XLSX.writeFile(wb, 'template_pembina.xlsx');
};

export const importFromExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') {
            console.error("XLSX library is not loaded.");
            reject(new Error("Excel import functionality is not available."));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                resolve(json);
            } catch (error) {
                console.error("Error parsing Excel file:", error);
                reject(new Error("Gagal memproses file Excel. Pastikan format file benar."));
            }
        };

        reader.onerror = (error) => {
            console.error("FileReader error:", error);
            reject(new Error("Gagal membaca file."));
        };
        
        reader.readAsBinaryString(file);
    });
};

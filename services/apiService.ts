import { Santri, Pembina, Kelas, Kegiatan, Pelanggaran, Kesehatan, AbsensiRecord, AdminData } from '../types';

// =================================================================================
// !!! PENTING: GANTI DENGAN URL WEB APP BARU ANDA SETELAH DEPLOY ULANG SCRIPT !!!
// URL ini harus didapatkan dari proses "Deploy > New deployment" di Google Apps Script.
// =================================================================================
const API_URL: string = 'https://script.google.com/macros/s/AKfycbxh8aXUle0MrkqTXnpiMgNTGNLCKG8gESmzBVbyiL1UUSwQWCudrwJIr1szrRTyciKg/exec'; 

// --- FUNGSI HELPER UNTUK VALIDASI DAN FETCH ---

/**
 * Menambahkan parameter unik ke URL untuk mencegah masalah cache (cache busting).
 * Ini sangat membantu mengatasi NetworkError yang terkait dengan CORS dan redirect.
 */
function getUrlWithCacheBust(url: string): string {
    const urlObj = new URL(url);
    urlObj.searchParams.append('v', new Date().getTime().toString());
    return urlObj.toString();
}


/**
 * Memvalidasi API_URL untuk memastikan URL tersebut adalah URL Google Apps Script yang valid.
 * @throws {Error} jika URL tidak valid.
 */
function validateApiUrl() {
    if (!API_URL || !API_URL.startsWith('https://script.google.com/macros/s/')) {
        const errorMessage = `API_URL belum dikonfigurasi. Harap ganti placeholder di services/apiService.ts dengan URL Web App Anda yang baru.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
    }
}

/**
 * Fungsi utama untuk berkomunikasi dengan Google Apps Script API.
 */
async function apiCall(action: 'add' | 'update' | 'delete', type: string, payload: any) {
    validateApiUrl();

    const fetchUrl = getUrlWithCacheBust(API_URL);

    const response = await fetch(fetchUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: JSON.stringify({ action, type, payload }),
        redirect: 'follow',
    });

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    try {
        const result = JSON.parse(responseText);
        if (result.error) {
            throw new Error(`API Error from Google Script: ${result.message}`);
        }
        return result;
    } catch (e) {
        console.error("Gagal mem-parsing JSON dari API POST. Respon mentah:", responseText);
        throw new Error("Gagal mem-parsing respon dari server. Periksa log Google Apps Script untuk detail.");
    }
}


// --- API FUNCTIONS (CRUD) ---

const createApiHandlers = <T extends { id: number }>(type: string) => {
    return {
        add: (item: Omit<T, 'id'>): Promise<T> => apiCall('add', type, item),
        update: (updatedItem: T): Promise<T> => apiCall('update', type, updatedItem),
        delete: (id: number): Promise<{ id: number }> => apiCall('delete', type, { id }),
    };
};

export const santriApi = createApiHandlers<Santri>('santri');
export const pembinaApi = createApiHandlers<Pembina>('pembina');
export const kelasApi = createApiHandlers<Kelas>('kelas');
export const kegiatanApi = createApiHandlers<Kegiatan>('kegiatan');
export const pelanggaranApi = createApiHandlers<Pelanggaran>('pelanggaran');
export const kesehatanApi = createApiHandlers<Kesehatan>('kesehatan');
export const absensiHistoryApi = createApiHandlers<AbsensiRecord>('absensiHistory');
export const adminApi = createApiHandlers<AdminData>('admin');


// --- FUNGSI UNTUK MENGAMBIL SEMUA DATA SEKALIGUS ---

export const fetchAllData = async () => {
    validateApiUrl();

    const fetchUrl = getUrlWithCacheBust(API_URL);

    const response = await fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow'
    });

    if (!response.ok) {
        throw new Error(`Gagal mengambil data: ${response.statusText}`);
    }

    const responseText = await response.text();
    try {
        const data = JSON.parse(responseText);
        return data;
    } catch (e) {
        console.error("Gagal mem-parsing JSON dari API. Respon mentah:", responseText);
        throw new Error("Gagal mem-parsing respon dari server. Pastikan Google Apps Script dideploy dengan benar dan tidak ada error.");
    }
};
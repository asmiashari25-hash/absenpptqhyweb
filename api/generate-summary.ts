import { GoogleGenAI } from "@google/genai";

// Vercel akan secara otomatis menangani tipe Request dan Response.
// Namun, jika Anda menggunakan TypeScript secara ketat, Anda bisa mengimpornya:
// import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { data, reportType } = req.body;
    
    // Validasi input sederhana
    if (!data || !reportType || !Array.isArray(data)) {
        return res.status(400).json({ message: 'Input data tidak valid.' });
    }

    // Ambil API Key dari environment variables di Vercel
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY tidak ditemukan di environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Batasi jumlah data yang dikirim untuk mencegah prompt yang terlalu panjang
    const dataPreview = JSON.stringify(data.slice(0, 20), null, 2);

    const prompt = `
        Anda adalah asisten administrasi untuk sebuah pondok pesantren bernama PPTQ Haqqul Yaqin.
        Tugas Anda adalah menganalisis data laporan dan memberikan ringkasan yang jelas, singkat, dan bermanfaat.
        Fokus pada tren utama, anomali, atau santri yang memerlukan perhatian khusus.
        Berikan jawaban dalam format poin-poin menggunakan Bahasa Indonesia.

        Berikut adalah data laporan ${reportType} dalam format JSON:
        ${dataPreview}

        Berikan ringkasan analisis Anda.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    const summary = response.text;

    // Kirim kembali ringkasan sebagai respons JSON
    res.status(200).json({ summary });

  } catch (error) {
    console.error("Error in generate-summary API route:", error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat menghasilkan ringkasan AI.', error: error.message });
  }
}

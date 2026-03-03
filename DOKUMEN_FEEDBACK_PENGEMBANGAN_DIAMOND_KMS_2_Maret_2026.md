# DOKUMEN FEEDBACK & PENGEMBANGAN SISTEM: DIAMOND KMS

Tanggal: 2 Maret 2026\
Status: Urgent / Pengembangan Batch Berikutnya

------------------------------------------------------------------------

## I. PENYESUAIAN HAK AKSES & SCOPING (ROLE: STAFF)

Untuk meningkatkan relevansi data per divisi, diperlukan pembatasan
akses (Data Isolation) sebagai berikut:

### 1. Modul Dokumen

-   Hilangkan opsi drop-down **"Gabungkan Dokumen"** pada level Staff.
-   Filter dokumen secara otomatis hanya menampilkan file yang sesuai
    dengan divisi user.

### 2. Modul Konten

-   Materi yang muncul wajib sesuai dengan divisi user (tidak global).

### 3. Modul Quiz

-   Pembatasan akses quiz berdasarkan per divisi.

### 4. Leaderboard

-   Ubah cakupan ranking menjadi **Scope per Divisi** (bukan akumulasi
    seluruh organisasi).

------------------------------------------------------------------------

## II. PENINGKATAN FITUR AI & SMART SEARCH

### 5. UI/UX Chatbot

-   Pisahkan halaman Chatbot AI menjadi menu tersendiri (Menu Sidebar).
-   Tidak disatukan di dalam modul Dokumen atau Konten.

### 6. Smart Search (RAG System)

-   Implementasi pencarian berbasis konten/isi dokumen.
-   Contoh: Pencarian keyword *"Lalu Lintas"* pada dokumen UU harus
    menampilkan lokasi spesifik (Bab dan Nomor Halaman).

### 7. Perilaku AI (Prompt Engineering)

-   Hilangkan "Sumber Referensi" jika input user hanya berupa sapaan
    (Hallo, Hai, dll).
-   Sertakan sumber referensi hanya jika user bertanya mengenai isi
    konten atau dokumen.

### 8. Konfigurasi AI (LLM Provider)

Implementasi 3 opsi koneksi: - **BYOK**: User bisa memasukkan API Key
sendiri (Gemini, OpenAI, Anthropic, DeepSeek). - **Managed by
Weldn_AI**: Menggunakan OpenAI Compatible API yang mengarah ke server
Weldn. - **Local Deployment**: OpenAI compatible API ke localhost
(tersedia jika sewa server fisik di kantor klien).

------------------------------------------------------------------------

## III. DASHBOARD ADMIN & MAINTENANCE (HRD / SUPER ADMIN)

### 9. Onboarding Baru

-   Buat halaman konfigurasi awal untuk akun HRD baru (Pemilihan model
    AI, Setup Divisi, dll).

### 10. Billing Management

-   Tambahkan fitur riwayat transaksi.
-   HRD dapat mengunduh bukti pembayaran bulan-bulan sebelumnya.

### 11. Account Setting

-   Tambahkan fitur **"Ubah Kata Sandi"** pada profil HRD.

### 12. Maintenance Mode

-   Tambahkan fitur **Maintenance Dashboard** bagi developer untuk
    menonaktifkan fitur tertentu jika ada kendala.
-   Tambahkan notifikasi otomatis kepada user jika suatu fitur sedang
    dalam perbaikan.
-   Tambahkan fitur Backup Database untuk kebutuhan migrasi data.

------------------------------------------------------------------------

## IV. PERBAIKAN BUG & UI (FIXES)

### 13. Tracking Reader

-   Fitur pelacakan pembaca dokumen saat ini belum berfungsi (Wajib
    diperbaiki).

### 14. Approval System

-   Fitur Approval Content saat ini belum berjalan (Wajib diperbaiki).

### 15. Sidebar Sync

-   Nama organisasi di sidebar tidak terupdate secara otomatis setelah
    diubah di pengaturan.

### 16. API Gemini

-   Koneksi Gemini masih terkendala.
-   Mohon update menggunakan API Key terbaru (Terlampir).

### 17. Iconography

-   Ganti logo menu "Setting" agar tidak menggunakan icon dokumen.

------------------------------------------------------------------------

## V. MANAJEMEN KONTEN & FAQ (ROLE BASED)

### 18. Hierarki Pembuatan Konten / FAQ / Dokumen

-   **Super Admin (HRD)**: Berhak membuat/unggah konten untuk seluruh
    divisi.
-   **Supervisor & Kadiv**: Hanya berhak membuat/unggah konten untuk
    divisinya masing-masing.

------------------------------------------------------------------------

Dokumen ini menjadi dasar pengembangan batch berikutnya dan wajib
ditindaklanjuti sesuai prioritas urgent.

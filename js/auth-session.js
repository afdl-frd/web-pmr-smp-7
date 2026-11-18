/**
 * Auth Session Manager - SIAMO PMR
 * Mengelola penyimpanan sesi login di localStorage browser.
 */

const SESSION_KEY = 'siamo_pmr_user';

const AuthSession = {
  // Simpan data user ke localStorage
  saveUser(userData) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    } catch (e) {
      console.error('Gagal menyimpan sesi:', e);
    }
  },

  // Ambil data user dari localStorage
  getUser() {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Gagal membaca sesi:', e);
      this.clearSession();
      return null;
    }
  },

  // Perbarui foto profil di dalam sesi tersimpan
  updatePhoto(newBase64Photo) {
    const user = this.getUser();
    if (user) {
      user.foto = newBase64Photo;
      this.saveUser(user);
    }
  },

  // Hapus sesi (Logout)
  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }
};
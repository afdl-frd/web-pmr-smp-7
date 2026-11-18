/**
 * SIAMO PMR - Modul Popup Login & Pendaftaran Kustom (js/auth-popup.js)
 */

const AuthPopup = {
  renderAuthModal() {
    const kelasOptions = [7, 8, 9, 10, 11, 12]
      .map(k => `<option value="${k}">Kelas ${k}</option>`)
      .join('');
    const subKelasOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']
      .map(s => `<option value="${s}">${s}</option>`)
      .join('');

    return `
      <div id="customAuthModal" class="auth-modal-overlay">
        <div class="auth-modal-card">
          <div class="brand-header">
            <div class="logo-icon-box">
              <svg class="auth-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <h1>SIAMO PMR</h1>
            <p>SMP Negeri 7 Pontianak</p>
          </div>

          <div class="tab-switcher">
            <button id="btnModalMasuk" class="tab-btn active" onclick="AuthPopup.switchTab('masuk')">Masuk</button>
            <button id="btnModalDaftar" class="tab-btn" onclick="AuthPopup.switchTab('daftar')">Daftar Akun</button>
          </div>

          <!-- FORM MASUK -->
          <form id="modalFormMasuk" class="form-section">
            <div class="input-group">
              <label>Email Anggota</label>
              <input type="email" id="modalLoginEmail" placeholder="nama@email.com" required>
            </div>
            <div class="input-group">
              <label>Password</label>
              <input type="password" id="modalLoginPassword" placeholder="••••••••" required>
            </div>
            <button type="submit" id="btnSubmitMasuk" class="btn-primary">Masuk ke Portal</button>
          </form>

          <!-- FORM DAFTAR -->
          <form id="modalFormDaftar" class="form-section hidden">
            <div class="input-row">
              <div class="input-group">
                <label>Nama Lengkap</label>
                <input type="text" id="regNama" placeholder="Sesuai kartu identitas" required>
              </div>
              <div class="input-group">
                <label>Email Aktif</label>
                <input type="email" id="regEmail" placeholder="nama@email.com" required>
              </div>
            </div>
            <div class="input-row">
              <div class="input-group">
                <label>Password</label>
                <input type="password" id="regPassword" placeholder="Min. 6 karakter" required>
              </div>
              <div class="input-group">
                <label>NIK (16 Digit)</label>
                <input type="text" id="regNik" maxlength="16" placeholder="Nomor Induk Kependudukan" required>
              </div>
            </div>
            <div class="input-row">
              <div class="input-group">
                <label>Tempat Lahir</label>
                <input type="text" id="regTempatLahir" placeholder="Kota kelahiran" required>
              </div>
              <div class="input-group">
                <label>Tanggal Lahir</label>
                <input type="date" id="regTglLahir" required>
              </div>
            </div>
            <div class="input-row">
              <div class="input-group">
                <label>Kelas</label>
                <select id="regKelas" required>${kelasOptions}</select>
              </div>
              <div class="input-group">
                <label>Sub Kelas</label>
                <select id="regSubKelas" required>${subKelasOptions}</select>
              </div>
            </div>
            <div class="input-row">
              <div class="input-group">
                <label>Asal Sekolah</label>
                <select id="regSekolah" required>
                  <option value="SMPN 7 Pontianak">SMPN 7 Pontianak</option>
                </select>
              </div>
              <div class="input-group">
                <label>Tingkatan PMR</label>
                <select id="regTingkatan" required>
                  <option value="Mula">Mula (SD)</option>
                  <option value="Madya" selected>Madya (SMP)</option>
                  <option value="Wira">Wira (SMA/K)</option>
                </select>
              </div>
            </div>
            <div class="input-row">
              <div class="input-group">
                <label>Nama Orang Tua / Wali</label>
                <input type="text" id="regNamaOrtu" placeholder="Nama Orang Tua" required>
              </div>
              <div class="input-group">
                <label>Nomor HP Orang Tua</label>
                <input type="text" id="regNoOrtu" placeholder="08xxxxxxxxxx" required>
              </div>
            </div>
            <div class="input-row">
              <div class="input-group">
                <label>Angkatan</label>
                <input type="text" id="regAngkatan" placeholder="Contoh: 2026" required>
              </div>
              <div class="input-group">
                <label>Foto Profil</label>
                <input type="file" id="regFoto" accept="image/*" required>
              </div>
            </div>
            <button type="submit" id="btnSubmitDaftar" class="btn-primary">Daftar Akun Sekarang</button>
          </form>
        </div>
      </div>
    `;
  },

  switchTab(type) {
    const btnMasuk = document.getElementById('btnModalMasuk');
    const btnDaftar = document.getElementById('btnModalDaftar');
    const formMasuk = document.getElementById('modalFormMasuk');
    const formDaftar = document.getElementById('modalFormDaftar');

    if (type === 'masuk') {
      btnMasuk.classList.add('active');
      btnDaftar.classList.remove('active');
      formMasuk.classList.remove('hidden');
      formDaftar.classList.add('hidden');
    } else {
      btnDaftar.classList.add('active');
      btnMasuk.classList.remove('active');
      formDaftar.classList.remove('hidden');
      formMasuk.classList.add('hidden');
    }
  }
};
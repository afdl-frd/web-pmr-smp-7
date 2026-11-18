/**
 * SIAMO PMR - Modul Popup Pilihan & Edit Anggota Admin (js/admin-popup.js)
 * Dirancang anti-lag (tanpa native <select>, tanpa blur, tanpa animasi berat)
 */

const AdminPopup = {
  currentMember: null,
  selectedStatus: 'APPROVED',
  selectedJabatan: 'Anggota',
  selectedTingkatan: 'Mula',
  selectedKelas: '7',
  selectedSubKelas: 'A',
  onSaveCallback: null,

  init() {
    if (document.getElementById('adminCustomPopupOverlay')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'adminCustomPopupOverlay';
    wrapper.className = 'admin-popup-overlay hidden';
    wrapper.innerHTML = `<div id="adminCustomPopupBox" class="admin-popup-card"></div>`;
    document.body.appendChild(wrapper);
  },

  close() {
    const overlay = document.getElementById('adminCustomPopupOverlay');
    if (overlay) overlay.classList.add('hidden');
  },

  showConfirm({ title, message, isConfirm = false, onConfirm = null }) {
    this.init();
    const box = document.getElementById('adminCustomPopupBox');
    box.innerHTML = `
      <div class="popup-header">
        <h3>${title}</h3>
      </div>
      <p class="popup-desc">${message}</p>
      <div class="popup-actions">
        <button type="button" id="popupBtnOk" class="btn-primary-admin">OK</button>
        ${isConfirm ? '<button type="button" id="popupBtnCancel" class="btn-secondary-admin">Batal</button>' : ''}
      </div>
    `;
    document.getElementById('adminCustomPopupOverlay').classList.remove('hidden');

    document.getElementById('popupBtnOk').onclick = () => {
      this.close();
      if (onConfirm) onConfirm();
    };
    if (isConfirm) {
      document.getElementById('popupBtnCancel').onclick = () => this.close();
    }
  },

  openMemberEditor(member, onSave) {
    this.init();
    this.currentMember = member;
    this.selectedStatus = String(member.status || 'PENDING').toUpperCase();
    this.selectedJabatan = member.jabatan || 'Anggota';
    this.selectedTingkatan = member.tingkatan || 'Mula';
    this.selectedKelas = String(member.kelas || '7');
    this.selectedSubKelas = String(member.subKelas || 'A').toUpperCase();
    this.onSaveCallback = onSave;

    const jabatanOptions = ['Anggota', 'Ketua', 'Wakil Ketua', 'Sekretaris', 'Bendahara', 'Koordinator'];
    const tingkatanOptions = ['Mula', 'Madya', 'Wira'];
    const kelasOptions = ['7', '8', '9', '10', '11', '12'];
    const subKelasOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
    const statusOptions = [
      { val: 'APPROVED', label: '✅ Diterima (Approved)' },
      { val: 'PENDING', label: '⏳ Pending' },
      { val: 'REJECTED', label: '❌ Ditolak' }
    ];

    const box = document.getElementById('adminCustomPopupBox');
    box.innerHTML = `
      <div class="popup-header">
        <div>
          <h3>Kelola Data Anggota</h3>
          <small style="color:#6b7280;">${member.nama} • ${member.sekolah || 'SMPN 7 Pontianak'}</small>
        </div>
        <button type="button" class="popup-close-x" onclick="AdminPopup.close()">&times;</button>
      </div>

      <div class="popup-body">
        <!-- PILIHAN STATUS AKUN -->
        <div class="popup-section">
          <label>Status Keanggotaan</label>
          <div class="pill-group" id="pillStatusGroup">
            ${statusOptions.map(st => `
              <button type="button" class="pill-btn ${this.selectedStatus === st.val ? 'active' : ''}" 
                onclick="AdminPopup.selectOption('status', '${st.val}', this)">${st.label}</button>
            `).join('')}
          </div>
        </div>

        <!-- PILIHAN KELAS & SUB KELAS -->
        <div class="popup-section">
          <label>Kelas (7 - 12)</label>
          <div class="pill-group" id="pillKelasGroup">
            ${kelasOptions.map(kl => `
              <button type="button" class="pill-btn ${this.selectedKelas === kl ? 'active' : ''}" 
                onclick="AdminPopup.selectOption('kelas', '${kl}', this)">${kl}</button>
            `).join('')}
          </div>
        </div>

        <div class="popup-section">
          <label>Sub Kelas (A - K)</label>
          <div class="pill-group" id="pillSubKelasGroup">
            ${subKelasOptions.map(sk => `
              <button type="button" class="pill-btn ${this.selectedSubKelas === sk ? 'active' : ''}" 
                onclick="AdminPopup.selectOption('subKelas', '${sk}', this)">${sk}</button>
            `).join('')}
          </div>
        </div>

        <!-- ANGKATAN -->
        <div class="popup-section">
          <label>Angkatan</label>
          <input type="text" id="popAngkatan" value="${member.angkatan || ''}" placeholder="Contoh: 2026" style="width:100%; padding:8px 12px; border:1.5px solid #d1d5db; border-radius:8px;">
        </div>

        <!-- PILIHAN TINGKATAN PMR -->
        <div class="popup-section">
          <label>Tingkatan PMR</label>
          <div class="pill-group" id="pillTingkatanGroup">
            ${tingkatanOptions.map(tk => `
              <button type="button" class="pill-btn ${this.selectedTingkatan === tk ? 'active' : ''}" 
                onclick="AdminPopup.selectOption('tingkatan', '${tk}', this)">${tk}</button>
            `).join('')}
          </div>
        </div>

        <!-- PILIHAN JABATAN -->
        <div class="popup-section">
          <label>Jabatan Struktural</label>
          <div class="pill-group" id="pillJabatanGroup">
            ${jabatanOptions.map(jb => `
              <button type="button" class="pill-btn ${this.selectedJabatan === jb ? 'active' : ''}" 
                onclick="AdminPopup.selectOption('jabatan', '${jb}', this)">${jb}</button>
            `).join('')}
          </div>
        </div>

        <!-- ABSENSI & SKOR KEAKTIFAN -->
        <div class="popup-section">
          <label>Rekap Absensi & Poin Tambahan</label>
          <div class="popup-grid-4">
            <div class="mini-input">
              <span>Hadir (+10)</span>
              <input type="number" id="popHadir" value="${member.hadir || 0}">
            </div>
            <div class="mini-input">
              <span>Izin</span>
              <input type="number" id="popIzin" value="${member.izin || 0}">
            </div>
            <div class="mini-input">
              <span>Alpha</span>
              <input type="number" id="popAlpha" value="${member.alpha || 0}">
            </div>
            <div class="mini-input">
              <span>Poin (+/-)</span>
              <input type="number" id="popSkorLain" value="${member.skorLain || 0}">
            </div>
          </div>
        </div>
      </div>

      <div class="popup-actions">
        <button type="button" id="btnSaveMemberPopup" class="btn-primary-admin" style="flex:1;" onclick="AdminPopup.submitMemberEdit()">💾 Simpan Perubahan</button>
        <button type="button" class="btn-secondary-admin" onclick="AdminPopup.close()">Batal</button>
      </div>
    `;

    document.getElementById('adminCustomPopupOverlay').classList.remove('hidden');
  },

  selectOption(type, value, btnElement) {
    if (type === 'status') this.selectedStatus = value;
    if (type === 'tingkatan') this.selectedTingkatan = value;
    if (type === 'jabatan') this.selectedJabatan = value;
    if (type === 'kelas') this.selectedKelas = value;
    if (type === 'subKelas') this.selectedSubKelas = value;

    const parent = btnElement.parentElement;
    parent.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
  },

  async submitMemberEdit() {
    const btn = document.getElementById('btnSaveMemberPopup');
    btn.disabled = true;
    btn.innerText = 'Menyimpan...';

    const payload = {
      id: this.currentMember.id,
      status: this.selectedStatus,
      jabatan: this.selectedJabatan,
      tingkatan: this.selectedTingkatan,
      kelas: this.selectedKelas,
      subKelas: this.selectedSubKelas,
      angkatan: document.getElementById('popAngkatan').value.trim(),
      hadir: parseInt(document.getElementById('popHadir').value) || 0,
      izin: parseInt(document.getElementById('popIzin').value) || 0,
      alpha: parseInt(document.getElementById('popAlpha').value) || 0,
      skorLain: parseInt(document.getElementById('popSkorLain').value) || 0
    };

    if (this.onSaveCallback) {
      await this.onSaveCallback(payload);
    }
    this.close();
  }
};
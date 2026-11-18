document.addEventListener('DOMContentLoaded', () => {
  const menuItems = document.querySelectorAll('.menu-item');
  const panels = document.querySelectorAll('.admin-panel');

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menuItems.forEach(i => i.classList.remove('active'));
      panels.forEach(p => p.classList.add('hidden'));
      item.classList.add('active');
      document.getElementById(item.getAttribute('data-target')).classList.remove('hidden');
    });
  });

  let allMembersData = [];
  let selectedSchool = 'ALL';

  async function fetchAdminData() {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getAllMembers&t=${Date.now()}`);
      allMembersData = await res.json();
      renderSchoolTabs();
      loadAdminActivities();
      loadAdminBooks();
      loadCurrentHomeConfig();
    } catch (err) { console.error(err); }
  }

  async function loadCurrentHomeConfig() {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getPublicData&t=${Date.now()}`);
      const data = await res.json();
      if (data.hero) {
        document.getElementById('editHeroTitle').value = data.hero.title || '';
        document.getElementById('editHeroDesc').value = data.hero.desc || '';
      }
      if (data.schedule) {
        document.getElementById('editScheduleTime').value = data.schedule.time || '';
        document.getElementById('editScheduleLoc').value = data.schedule.loc || '';
      }
      if (data.stats) {
        document.getElementById('editStatTotal').value = data.stats.totalMembers || '';
        document.getElementById('editStatBatch').value = data.stats.currentBatch || '';
      }
    } catch (e) {}
  }

  function renderSchoolTabs() {
    const container = document.getElementById('schoolTabsContainer');
    if (!container) return;

    if (!allMembersData.length) {
      container.innerHTML = '<p style="font-size:13px; color:#6b7280;">Belum ada data pendaftar.</p>';
      renderMemberTables();
      return;
    }

    const schools = [...new Set(allMembersData.map(u => String(u.sekolah || 'SMPN 7 Pontianak').trim()))];

    let tabsHTML = `
      <button class="school-tab-btn ${selectedSchool === 'ALL' ? 'active' : ''}" onclick="selectSchool('ALL')">
        🌐 Semua Sekolah (${allMembersData.length})
      </button>
    `;

    tabsHTML += schools.map(sch => {
      const count = allMembersData.filter(u => String(u.sekolah || 'SMPN 7 Pontianak').trim() === sch).length;
      return `
        <button class="school-tab-btn ${sch === selectedSchool ? 'active' : ''}" onclick="selectSchool('${sch.replace(/'/g, "\\'")}')">
          🏫 ${sch} (${count})
        </button>
      `;
    }).join('');

    container.innerHTML = tabsHTML;
    renderMemberTables();
  }

  window.selectSchool = function(sch) {
    selectedSchool = sch;
    document.getElementById('schoolSuggestionsBox')?.classList.add('hidden');
    renderSchoolTabs();
  };

  window.handleSearchInput = function() {
    const input = document.getElementById('memberSearchInput');
    const sugBox = document.getElementById('schoolSuggestionsBox');
    const query = input.value.trim().toLowerCase();

    if (query.length > 0 && allMembersData.length > 0) {
      const registeredSchools = [...new Set(allMembersData.map(u => String(u.sekolah || 'SMPN 7 Pontianak').trim()))];
      const matchedSchools = registeredSchools.filter(s => s.toLowerCase().includes(query));

      if (matchedSchools.length > 0) {
        sugBox.innerHTML = `
          <div style="padding: 6px 12px; font-size: 11px; font-weight: 700; color: #6b7280; background: #f3f4f6;">Saran Sekolah Terdaftar:</div>
          ${matchedSchools.map(sch => `
            <div class="suggestion-item" onclick="applySchoolSuggestion('${sch.replace(/'/g, "\\'")}')">🏫 <strong>${sch}</strong></div>
          `).join('')}
        `;
        sugBox.classList.remove('hidden');
      } else {
        sugBox.classList.add('hidden');
      }
    } else {
      sugBox.classList.add('hidden');
    }
    renderMemberTables();
  };

  window.applySchoolSuggestion = function(schoolName) {
    const input = document.getElementById('memberSearchInput');
    const sugBox = document.getElementById('schoolSuggestionsBox');
    selectedSchool = schoolName;
    input.value = '';
    sugBox.classList.add('hidden');
    renderSchoolTabs();
  };

  window.resetSearchFilter = function() {
    document.getElementById('memberSearchInput').value = '';
    document.getElementById('schoolSuggestionsBox').classList.add('hidden');
    selectedSchool = 'ALL';
    renderSchoolTabs();
  };

  function renderMemberTables() {
    const searchVal = document.getElementById('memberSearchInput').value.trim().toLowerCase();
    const pendingTbody = document.getElementById('pendingMembersTableBody');
    const approvedTbody = document.getElementById('approvedMembersTableBody');

    const filtered = allMembersData.filter(u => {
      const userSchool = String(u.sekolah || 'SMPN 7 Pontianak').trim();
      const userName = String(u.nama || '').toLowerCase();
      const userNik = String(u.nik || '').toLowerCase();

      const matchSchoolTab = (selectedSchool === 'ALL') || (userSchool === selectedSchool);
      const matchSearch = !searchVal || userName.includes(searchVal) || userNik.includes(searchVal) || userSchool.toLowerCase().includes(searchVal);
      return matchSchoolTab && matchSearch;
    });

    const pending = filtered.filter(u => !u.status || String(u.status).toUpperCase() === 'PENDING');
    const approved = filtered.filter(u => String(u.status).toUpperCase() === 'APPROVED');

    pendingTbody.innerHTML = pending.length ? pending.map(u => `
      <tr>
        <td><img src="${u.foto || 'https://via.placeholder.com/40'}" class="admin-avatar-img" onclick="openZoomImage(this.src)"></td>
        <td><strong>${u.nama}</strong><br><small>NIK: ${u.nik}</small><br><small>Ortu: ${u.namaOrtu || '-'} (${u.noOrtu || '-'})</small></td>
        <td>${u.sekolah}<br><strong>${u.tingkatan || 'Mula'}</strong></td>
        <td>
          <button onclick="openMemberPopup(${u.id})" class="btn-primary-admin" style="padding:6px 12px; font-size:12px;">⚙️ Atur / Verifikasi</button>
          <button onclick="deleteMember(${u.id})" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; font-size:12px; cursor:pointer; margin-left:4px;">Hapus</button>
        </td>
      </tr>
    `).join('') : `<tr><td colspan="4" style="text-align:center; padding:12px;">Tidak ada data pending.</td></tr>`;

    approvedTbody.innerHTML = approved.length ? approved.map(u => {
      const totalPoin = ((parseInt(u.hadir) || 0) * 10) + (parseInt(u.skorLain) || 0);
      return `
        <tr>
          <td><img src="${u.foto || 'https://via.placeholder.com/40'}" class="admin-avatar-img" onclick="openZoomImage(this.src)"></td>
          <td><strong>${u.nama}</strong><br><small>NIK: ${u.nik}</small><br><small>${u.sekolah}</small></td>
          <td><span class="badge-pill-info">${u.jabatan || 'Anggota'}</span><br><small>Tingkat: <strong>${u.tingkatan || 'Mula'}</strong></small></td>
          <td>H: <strong>${u.hadir || 0}</strong> | I: <strong>${u.izin || 0}</strong> | A: <strong>${u.alpha || 0}</strong><br><small style="color:#15803d; font-weight:700;">Total Skor: ${totalPoin} PTS</small></td>
          <td>
            <button onclick="openMemberPopup(${u.id})" class="btn-primary-admin" style="padding:6px 12px; font-size:12px;">✏️ Edit Data</button>
            <button onclick="deleteMember(${u.id})" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; font-size:12px; cursor:pointer; margin-left:4px;">Hapus</button>
          </td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="5" style="text-align:center; padding:12px;">Tidak ada data anggota aktif.</td></tr>`;
  }

  // Buka Popup Kustom Pilihan Anggota & Langsung Perbarui Layar
  window.openMemberPopup = function(id) {
    const member = allMembersData.find(m => String(m.id) === String(id));
    if (!member) return;

    AdminPopup.openMemberEditor(member, async (updatedData) => {
      // Langsung update state lokal agar perubahan langsung terlihat di layar
      const idx = allMembersData.findIndex(m => String(m.id) === String(updatedData.id));
      if (idx !== -1) {
        allMembersData[idx] = { ...allMembersData[idx], ...updatedData };
        renderSchoolTabs();
      }

      try {
        const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'updateMemberDetails', ...updatedData })
        });
        const result = await res.json();
        if (result.status === 'success') {
          AdminPopup.showConfirm({ title: 'Berhasil', message: 'Perubahan status, tingkatan, jabatan, absen & poin telah tersimpan!' });
          fetchAdminData();
        } else {
          AdminPopup.showConfirm({ title: 'Gagal', message: result.message || 'Gagal menyimpan ke server.' });
        }
      } catch (err) {
        AdminPopup.showConfirm({ title: 'Error Jaringan', message: 'Gagal terhubung ke server: ' + err });
      }
    });
  };

  window.deleteMember = function(id) {
    AdminPopup.showConfirm({
      title: 'Konfirmasi Hapus',
      message: 'Yakin ingin menghapus permanen akun anggota ini?',
      isConfirm: true,
      onConfirm: async () => {
        await fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteMember', id }) });
        fetchAdminData();
      }
    });
  };

  window.openZoomImage = function(src) {
    if (!src) return;
    document.getElementById('zoomedImg').src = src;
    document.getElementById('imageZoomModal').classList.remove('hidden');
  };
  window.closeZoomImage = function() {
    document.getElementById('imageZoomModal').classList.add('hidden');
  };

  document.getElementById('formAddActivity')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('actTitle').value;
    const date = document.getElementById('actDate').value;
    const quota = document.getElementById('actQuota').value;
    const type = document.getElementById('actType').value;
    const desc = document.getElementById('actDesc').value;

    await fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'addActivity', title, date, quota, type, desc }) });
    AdminPopup.showConfirm({ title: 'Sukses', message: 'Kegiatan berhasil ditambahkan!' });
    loadAdminActivities();
    e.target.reset();
  });

  async function loadAdminActivities() {
    const list = document.getElementById('adminActivitiesList');
    if (!list) return;
    const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getActivities&t=${Date.now()}`);
    const acts = await res.json();
    list.innerHTML = acts.map(a => `
      <div style="background:#f9fafb; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #e5e7eb;">
        <strong>${a.title}</strong> (${a.date}) - Kuota: ${a.quota} | Peserta: <strong>${a.participants || 'Belum ada'}</strong>
        <button onclick="deleteActivity(${a.id})" style="float:right; background:#ef4444; color:white; border:none; padding:2px 6px; border-radius:4px; cursor:pointer;">Hapus</button>
      </div>
    `).join('');
  }

  window.deleteActivity = function(id) {
    AdminPopup.showConfirm({
      title: 'Konfirmasi',
      message: 'Hapus kegiatan ini?',
      isConfirm: true,
      onConfirm: async () => {
        await fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteActivity', id }) });
        loadAdminActivities();
      }
    });
  };

  document.getElementById('formAddBook')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('bookTitle').value;
    const category = document.getElementById('bookCat').value;
    const url = document.getElementById('bookUrl').value;

    await fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'addBook', title, category, url }) });
    AdminPopup.showConfirm({ title: 'Sukses', message: 'Buku berhasil diupload!' });
    loadAdminBooks();
    e.target.reset();
  });

  async function loadAdminBooks() {
    const list = document.getElementById('adminBooksList');
    if (!list) return;
    const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getBooks&t=${Date.now()}`);
    const books = await res.json();
    list.innerHTML = books.map(b => `
      <div style="background:#f9fafb; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #e5e7eb;">
        📖 <strong>${b.title}</strong> (${b.category})
        <button onclick="deleteBook(${b.id})" style="float:right; background:#ef4444; color:white; border:none; padding:2px 6px; border-radius:4px; cursor:pointer;">Hapus</button>
      </div>
    `).join('');
  }

  window.deleteBook = function(id) {
    AdminPopup.showConfirm({
      title: 'Konfirmasi',
      message: 'Hapus buku ini?',
      isConfirm: true,
      onConfirm: async () => {
        await fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteBook', id }) });
        loadAdminBooks();
      }
    });
  };

  document.getElementById('formEditHomeHero')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('editHeroTitle').value;
    const desc = document.getElementById('editHeroDesc').value;
    const time = document.getElementById('editScheduleTime').value;
    const loc = document.getElementById('editScheduleLoc').value;
    const totalMembers = document.getElementById('editStatTotal').value;
    const currentBatch = document.getElementById('editStatBatch').value;

    await fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'saveHero', title, desc }) });
    await fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'saveSchedule', time, loc }) });
    await fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'saveStats', totalMembers, currentBatch }) });
    AdminPopup.showConfirm({ title: 'Sukses', message: 'Pengaturan Beranda & Statistik berhasil disimpan!' });
  });

  fetchAdminData();
});
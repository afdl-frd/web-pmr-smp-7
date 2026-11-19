document.addEventListener('DOMContentLoaded', () => {
  const dynamicAuthContainer = document.getElementById('dynamicAuthContainer');
  const pendingPanel = document.getElementById('pendingPanel');
  const appNavbar = document.getElementById('appNavbar');
  const btnLogout = document.getElementById('btnLogout');
  const changePhotoInput = document.getElementById('changePhotoInput');

  let currentUser = null;

  // 1. Cek Sesi Login dengan Pengaman Fallback Anti-Blank
  const savedUser = (typeof AuthSession !== 'undefined' && AuthSession.getUser) ? AuthSession.getUser() : null;

  if (savedUser && savedUser.email) {
    currentUser = savedUser;
    const st = String(currentUser.status || currentUser.statusAcc || 'PENDING').trim().toUpperCase();
    if (st === 'APPROVED') {
      if (dynamicAuthContainer) dynamicAuthContainer.innerHTML = '';
      if (appNavbar) appNavbar.classList.remove('hidden');
      document.getElementById('pageHome')?.classList.remove('hidden');
      loadPublicData();
      renderUserData();
      checkNotifications();
      refreshCurrentUserFromServer();
    } else {
      if (dynamicAuthContainer) dynamicAuthContainer.innerHTML = '';
      pendingPanel?.classList.remove('hidden');
    }
  } else {
    if (dynamicAuthContainer) {
      if (typeof AuthPopup !== 'undefined' && AuthPopup.renderAuthModal) {
        dynamicAuthContainer.innerHTML = AuthPopup.renderAuthModal();
      } else {
        dynamicAuthContainer.innerHTML = `
          <div class="auth-modal-overlay">
            <div class="auth-modal-card">
              <div class="brand-header">
                <h1>SIAMO PMR</h1>
                <p>SMP Negeri 7 Pontianak</p>
              </div>
              <form id="modalFormMasuk" class="form-section">
                <div class="input-group"><label>Email Anggota</label><input type="email" id="modalLoginEmail" placeholder="nama@email.com" required></div>
                <div class="input-group"><label>Password</label><input type="password" id="modalLoginPassword" placeholder="••••••••" required></div>
                <button type="submit" id="btnSubmitMasuk" class="btn-primary">Masuk ke Portal</button>
              </form>
            </div>
          </div>
        `;
      }
      initAuthListeners();
    }
  }

  // Sinkronkan data terbaru user yang sedang login
  async function refreshCurrentUserFromServer() {
    if (!currentUser || !currentUser.email) return;
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getAllMembers&t=${Date.now()}`);
      const members = await res.json();
      const freshUser = members.find(m => m.email && String(m.email).trim().toLowerCase() === String(currentUser.email).trim().toLowerCase());
      if (freshUser) {
        currentUser = freshUser;
        if (typeof AuthSession !== 'undefined') AuthSession.saveUser(currentUser);
        renderUserData();
      }
    } catch (e) {}
  }

  // Toggle Menu Hamburger di HP
  const btnHamburger = document.getElementById('btnHamburger');
  const navMenuDrawer = document.getElementById('navMenuDrawer');

  if (btnHamburger && navMenuDrawer) {
    btnHamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenuDrawer.classList.toggle('open');
      btnHamburger.classList.toggle('open', isOpen);
      btnHamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // Tutup menu otomatis setelah salah satu item diklik di HP
    navMenuDrawer.querySelectorAll('.nav-link').forEach((item) => {
      item.addEventListener('click', () => {
        navMenuDrawer.classList.remove('open');
        btnHamburger.classList.remove('open');
        btnHamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Tutup menu jika klik di luar area navbar
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#appNavbar')) {
        navMenuDrawer.classList.remove('open');
        btnHamburger.classList.remove('open');
        btnHamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 2. Event Listener Form Masuk & Daftar
  function initAuthListeners() {
    const formMasuk = document.getElementById('modalFormMasuk');
    const formDaftar = document.getElementById('modalFormDaftar');

    if (formMasuk) {
      formMasuk.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btnSubmitMasuk');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Memeriksa...';

        const reqEmail = document.getElementById('modalLoginEmail').value.trim().toLowerCase();
        const reqPass = document.getElementById('modalLoginPassword').value.trim();

        try {
          const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getAllMembers&t=${Date.now()}`);
          const members = await res.json();
          const user = members.find(m => m.email && String(m.email).trim().toLowerCase() === reqEmail && String(m.password).trim() === reqPass);

          if (user) {
            currentUser = user;
            if (typeof AuthSession !== 'undefined') AuthSession.saveUser(currentUser);
            const status = String(user.status || 'PENDING').trim().toUpperCase();

            if (status === 'APPROVED') {
              dynamicAuthContainer.innerHTML = '';
              appNavbar.classList.remove('hidden');
              document.getElementById('pageHome').classList.remove('hidden');
              loadPublicData();
              renderUserData();
              checkNotifications();
            } else if (status === 'REJECTED') {
              alert('Maaf, pendaftaran akun Anda ditolak oleh admin.');
            } else {
              dynamicAuthContainer.innerHTML = '';
              pendingPanel.classList.remove('hidden');
            }
          } else {
            alert('Email atau Password salah!');
          }
        } catch (err) {
          alert('Kesalahan jaringan: ' + err);
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Masuk ke Portal';
        }
      });
    }

    if (formDaftar) {
      formDaftar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btnSubmitDaftar');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Mengirim...';

        const nik = document.getElementById('regNik').value.trim();
        if (nik.length !== 16 || isNaN(nik)) {
          alert('NIK harus 16 digit angka!');
          submitBtn.disabled = false;
          submitBtn.innerText = 'Daftar Akun Sekarang';
          return;
        }

        const fileInput = document.getElementById('regFoto');
        let fotoBase64 = '';
        if (fileInput && fileInput.files[0]) {
          fotoBase64 = await compressImage(fileInput.files[0], 200, 0.5);
        }

        const payload = {
          action: 'register',
          nama: document.getElementById('regNama').value.trim(),
          email: document.getElementById('regEmail').value.trim().toLowerCase(),
          password: document.getElementById('regPassword').value.trim(),
          nik: nik,
          tempatLahir: document.getElementById('regTempatLahir').value.trim(),
          tglLahir: document.getElementById('regTglLahir').value,
          kelas: document.getElementById('regKelas').value,
          subKelas: document.getElementById('regSubKelas').value,
          sekolah: document.getElementById('regSekolah').value,
          tingkatan: document.getElementById('regTingkatan').value,
          namaOrtu: document.getElementById('regNamaOrtu').value.trim(),
          noOrtu: document.getElementById('regNoOrtu').value.trim(),
          angkatan: document.getElementById('regAngkatan').value.trim(),
          jabatan: 'Anggota',
          foto: fotoBase64
        };

        try {
          const res = await fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
          const data = await res.json();
          if (data.status === 'success') {
            dynamicAuthContainer.innerHTML = '';
            pendingPanel.classList.remove('hidden');
          } else {
            alert(data.message || 'Pendaftaran gagal.');
          }
        } catch (err) {
          alert('Gagal daftar: ' + err);
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Daftar Akun Sekarang';
        }
      });
    }
  }

  // 3. Navigasi Antar Halaman Publik
  const navLinks = document.querySelectorAll('.nav-link');
  const pageSections = document.querySelectorAll('.page-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-target');
      if (!targetId) return;

      navLinks.forEach(n => n.classList.remove('active'));
      pageSections.forEach(s => s.classList.add('hidden'));

      link.classList.add('active');
      const targetSec = document.getElementById(targetId);
      if (targetSec) targetSec.classList.remove('hidden');

      if (targetId === 'pageMembers') loadActiveMembers();
      else if (targetId === 'pageRank') loadLeaderboards();
      else if (targetId === 'pageActivities') loadPublicActivities();
      else if (targetId === 'pageBooks') loadPublicBooks();
      else if (targetId === 'pageHome' || targetId === 'pageDocs') loadPublicData();
      else if (targetId === 'pageProfile') {
        renderUserData();
        refreshCurrentUserFromServer();
      }
    });
  });

  // 4. Muat Data Publik (Anti-Cache)
  async function loadPublicData() {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getPublicData&t=${Date.now()}`);
      const data = await res.json();

      if (data && data.status !== 'error') {
        if (data.hero) {
          const hTitle = document.getElementById('homeHeroTitle');
          const hDesc = document.getElementById('homeHeroDesc');
          if (hTitle) hTitle.innerText = data.hero.title || 'Selamat Datang di Portal SIAMO PMR';
          if (hDesc) hDesc.innerText = data.hero.desc || 'Wadah pembinaan kepalangmerahan remaja.';
        }
        if (data.schedule) {
          const sTime = document.getElementById('scheduleTimeText');
          const sLoc = document.getElementById('scheduleLocText');
          if (sTime) sTime.innerText = data.schedule.time || 'Setiap Sabtu, 15.00 WIB';
          if (sLoc) sLoc.innerText = data.schedule.loc || 'Lapangan Sekolah';
        }
        if (data.stats) {
          const stTotal = document.getElementById('statTotalMembers');
          const stBatch = document.getElementById('statCurrentBatch');
          if (stTotal) stTotal.innerText = data.stats.totalMembers || '120+';
          if (stBatch) stBatch.innerText = data.stats.currentBatch || '2025 / 2026';
        }
        if (data.contacts) {
          const contBox = document.getElementById('homeContactsContainer');
          if (contBox) {
            contBox.innerHTML = data.contacts.length ? data.contacts.map(c => `
              <div class="contact-card">
                <div class="contact-info" style="width:100%;">
                  <h4>${c.nama}</h4><p>${c.jabatan}</p>
                  <a href="https://wa.me/${c.wa}" target="_blank" class="btn-wa">💬 Chat WA</a>
                </div>
              </div>
            `).join('') : '<p class="text-center">Belum ada kontak pengurus.</p>';
          }
        }
        if (data.docs) {
          const docLombaCont = document.getElementById('docLombaContainer');
          const docUmumCont = document.getElementById('docUmumContainer');
          const lombaItems = data.docs.filter(d => d.category === 'lomba');
          const umumItems = data.docs.filter(d => d.category === 'umum');

          if (docLombaCont) {
            docLombaCont.innerHTML = lombaItems.length ? lombaItems.map(d => `
              <div class="doc-card">
                <img src="${d.img}" alt="${d.title}" class="doc-img zoomable" onclick="openZoomImage(this.src)">
                <div class="doc-body"><span class="doc-date">📅 ${d.date}</span><h4>${d.title}</h4><p>${d.desc}</p></div>
              </div>
            `).join('') : '<p class="text-center">Belum ada dokumentasi lomba.</p>';
          }
          if (docUmumCont) {
            docUmumCont.innerHTML = umumItems.length ? umumItems.map(d => `
              <div class="doc-card">
                <img src="${d.img}" alt="${d.title}" class="doc-img zoomable" onclick="openZoomImage(this.src)">
                <div class="doc-body"><span class="doc-date">📅 ${d.date}</span><h4>${d.title}</h4><p>${d.desc}</p></div>
              </div>
            `).join('') : '<p class="text-center">Belum ada dokumentasi umum.</p>';
          }
        }
        if (data.links) {
          const quizLink = document.querySelector('#pageQuiz a');
          const gameLink = document.querySelector('#pageGame a');
          if (quizLink && data.links.quiz) quizLink.href = data.links.quiz;
          if (gameLink && data.links.game) gameLink.href = data.links.game;
        }
      }
    } catch (err) { console.error('Error loadPublicData:', err); }
  }

  // 5. Muat Daftar Anggota Aktif (Dengan Filter Angkatan Terdaftar)
  let cachedActiveMembers = [];
  let selectedPublicAngkatan = 'ALL';

  async function loadActiveMembers() {
    const grid = document.getElementById('membersGridContainer');
    if (!grid) return;
    grid.innerHTML = '<p class="text-center">Memuat daftar anggota...</p>';

    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getAllMembers&t=${Date.now()}`);
      const members = await res.json();
      cachedActiveMembers = members.filter(m => String(m.status).trim().toUpperCase() === 'APPROVED');

      renderPublicAngkatanFilter();
      renderMembersGrid();
    } catch (err) {
      grid.innerHTML = '<p class="text-center" style="color:red;">Gagal memuat anggota.</p>';
    }
  }

  function renderPublicAngkatanFilter() {
    const filterContainer = document.getElementById('publicAngkatanFilterContainer');
    if (!filterContainer) return;

    const batches = [...new Set(cachedActiveMembers.map(m => String(m.angkatan || '').trim()).filter(Boolean))].sort();
    if (!batches.length) {
      filterContainer.innerHTML = '';
      return;
    }

    filterContainer.innerHTML = `
      <button type="button" class="tab-btn ${selectedPublicAngkatan === 'ALL' ? 'active' : ''}" onclick="filterPublicMembersByAngkatan('ALL')" style="padding:6px 14px; font-size:12px;">
        Semua Angkatan (${cachedActiveMembers.length})
      </button>
      ${batches.map(b => {
        const count = cachedActiveMembers.filter(m => String(m.angkatan || '').trim() === b).length;
        return `
          <button type="button" class="tab-btn ${selectedPublicAngkatan === b ? 'active' : ''}" onclick="filterPublicMembersByAngkatan('${b}')" style="padding:6px 14px; font-size:12px;">
            Angkatan ${b} (${count})
          </button>
        `;
      }).join('')}
    `;
  }

  window.filterPublicMembersByAngkatan = function(angkatan) {
    selectedPublicAngkatan = angkatan;
    renderPublicAngkatanFilter();
    renderMembersGrid();
  };

  function renderMembersGrid() {
    const grid = document.getElementById('membersGridContainer');
    if (!grid) return;

    const list = selectedPublicAngkatan === 'ALL'
      ? cachedActiveMembers
      : cachedActiveMembers.filter(m => String(m.angkatan || '').trim() === selectedPublicAngkatan);

    if (!list.length) {
      grid.innerHTML = '<p class="text-center">Belum ada anggota aktif.</p>';
      return;
    }

    grid.innerHTML = list.map(m => {
      const kelasStr = m.kelas ? `Kelas ${m.kelas}${m.subKelas || ''}` : '';
      const angkatanStr = m.angkatan ? `Angkatan ${m.angkatan}` : '';
      return `
        <div class="member-card">
          <img src="${m.foto || 'https://via.placeholder.com/70'}" alt="${m.nama}" class="member-avatar zoomable" onclick="openZoomImage(this.src)">
          <h4>${m.nama}</h4>
          <p>${m.jabatan || 'Anggota'} • ${m.tingkatan || 'Mula'}</p>
          ${kelasStr ? `<p style="font-size:12px; font-weight:700; color:#3730a3; margin:2px 0;">${kelasStr}${angkatanStr ? ` • ${angkatanStr}` : ''}</p>` : ''}
          <span style="font-size: 11px; color: #16a34a; font-weight: 700;">${m.sekolah}</span>
        </div>
      `;
    }).join('');
  }

  // 6. Muat Leaderboard
  window.switchRankTab = function(type) {
    ['btnRankQuiz', 'btnRankGame', 'btnRankLatihan'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    ['rankQuizContainer', 'rankGameContainer', 'rankLatihanContainer'].forEach(id => document.getElementById(id)?.classList.add('hidden'));

    if (type === 'quiz') {
      document.getElementById('btnRankQuiz')?.classList.add('active');
      document.getElementById('rankQuizContainer')?.classList.remove('hidden');
    } else if (type === 'game') {
      document.getElementById('btnRankGame')?.classList.add('active');
      document.getElementById('rankGameContainer')?.classList.remove('hidden');
    } else {
      document.getElementById('btnRankLatihan')?.classList.add('active');
      document.getElementById('rankLatihanContainer')?.classList.remove('hidden');
    }
  };

  async function loadLeaderboards() {
    const contQuiz = document.getElementById('rankQuizContainer');
    const contGame = document.getElementById('rankGameContainer');
    const contLatihan = document.getElementById('rankLatihanContainer');

    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getAllMembers&t=${Date.now()}`);
      const members = await res.json();
      const users = members.filter(m => String(m.status).trim().toUpperCase() === 'APPROVED');

      if (!users.length) {
        if (contQuiz) contQuiz.innerHTML = '<p class="text-center">Belum ada data peringkat.</p>';
        return;
      }

      if (contQuiz) {
        const sortedQuiz = [...users].sort((a, b) => (parseInt(b.skorKuis) || 0) - (parseInt(a.skorKuis) || 0));
        contQuiz.innerHTML = sortedQuiz.map((u, i) => `
          <div class="rank-item">
            <div class="rank-left"><div class="rank-badge">${i + 1}</div><div class="rank-user-info"><h4>${u.nama}</h4><p>${u.sekolah}</p></div></div>
            <div class="rank-score">${u.skorKuis || 0} POIN</div>
          </div>
        `).join('');
      }

      if (contGame) {
        const sortedGame = [...users].sort((a, b) => (parseInt(b.skorGame) || 0) - (parseInt(a.skorGame) || 0));
        contGame.innerHTML = sortedGame.map((u, i) => `
          <div class="rank-item">
            <div class="rank-left"><div class="rank-badge">${i + 1}</div><div class="rank-user-info"><h4>${u.nama}</h4><p>${u.sekolah}</p></div></div>
            <div class="rank-score">${u.skorGame || 0} POIN</div>
          </div>
        `).join('');
      }

      if (contLatihan) {
        const sortedPoin = [...users].map(u => ({
          ...u,
          totalPoin: ((parseInt(u.hadir) || 0) * 10) + (parseInt(u.skorLain) || 0)
        })).sort((a, b) => b.totalPoin - a.totalPoin);

        contLatihan.innerHTML = sortedPoin.map((u, i) => `
          <div class="rank-item">
            <div class="rank-left"><div class="rank-badge">${i + 1}</div><div class="rank-user-info"><h4>${u.nama}</h4><p>${u.hadir || 0} Hadir • ${u.sekolah}</p></div></div>
            <div class="rank-score">${u.totalPoin} POIN</div>
          </div>
        `).join('');
      }
    } catch (err) {
      if (contQuiz) contQuiz.innerHTML = '<p class="text-center" style="color:red;">Gagal memuat peringkat.</p>';
    }
  }

  // 7. Muat Kegiatan & Pendaftaran Kuota
  async function loadPublicActivities() {
    const container = document.getElementById('publicActivitiesContainer');
    if (!container) return;
    container.innerHTML = '<p class="text-center">Memuat kegiatan...</p>';

    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getActivities&t=${Date.now()}`);
      const acts = await res.json();
      if (!acts.length) {
        container.innerHTML = '<p class="text-center">Belum ada jadwal kegiatan.</p>';
        return;
      }

      container.innerHTML = acts.map(a => {
        let parts = a.participants ? String(a.participants).split(",").filter(Boolean) : [];
        let isRegistered = currentUser && parts.includes(currentUser.nama);
        let quotaNum = parseInt(a.quota) || 0;
        let isFull = quotaNum > 0 && parts.length >= quotaNum;

        return `
          <div class="activity-card">
            <h4>${a.title}</h4>
            <p><strong>📅 Tanggal:</strong> ${a.date}</p>
            <p><strong>📝 Deskripsi:</strong> ${a.desc}</p>
            ${a.type === 'biasa' ? '<span class="badge-code">ℹ️ Pemberitahuan Umum</span>' : `
              <p><strong>👥 Kuota Terdaftar:</strong> ${parts.length} / ${quotaNum} Peserta</p>
              <div style="margin-top:15px;">
                ${isRegistered ? '<span class="badge-active">✅ Anda Sudah Terdaftar</span>' : 
                  isFull ? '<button class="btn-secondary" disabled>Kuota Sudah Penuh</button>' : 
                  `<button id="btnAct_${a.id}" onclick="registerActivity(${a.id})" class="btn-primary">Daftar Kegiatan</button>`}
              </div>
            `}
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = '<p class="text-center" style="color:red;">Gagal memuat kegiatan.</p>';
    }
  }

  window.registerActivity = async function(activityId) {
    if (!currentUser) return;
    const btn = document.getElementById(`btnAct_${activityId}`);
    if (btn) { btn.disabled = true; btn.innerText = 'Mendaftarkan...'; }

    try {
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'registerActivity', activityId, memberName: currentUser.nama })
      });
      const data = await res.json();
      alert(data.message);
      loadPublicActivities();
    } catch (err) {
      alert('Gagal mendaftar: ' + err);
      if (btn) { btn.disabled = false; btn.innerText = 'Daftar Kegiatan'; }
    }
  };

  // 8. Muat Buku PMR
  async function loadPublicBooks() {
    const container = document.getElementById('publicBooksContainer');
    if (!container) return;
    container.innerHTML = '<p class="text-center">Memuat buku PMR...</p>';

    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getBooks&t=${Date.now()}`);
      const books = await res.json();
      if (!books.length) {
        container.innerHTML = '<p class="text-center">Belum ada modul buku.</p>';
        return;
      }

      container.innerHTML = books.map(b => `
        <div class="book-card">
          <h4>📖 ${b.title}</h4>
          <p>Kategori: <strong>${b.category}</strong></p>
          <a href="${b.url}" target="_blank" class="btn-primary" style="display:inline-block; margin-top:10px; text-decoration:none; padding:10px 18px; font-size:13px;">📥 Buka / Unduh PDF</a>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = '<p class="text-center" style="color:red;">Gagal memuat buku.</p>';
    }
  }

  window.switchDocTab = function(type) {
    const btnLomba = document.getElementById('btnDocLomba');
    const btnUmum = document.getElementById('btnDocUmum');
    const contLomba = document.getElementById('docLombaContainer');
    const contUmum = document.getElementById('docUmumContainer');

    if (type === 'lomba') {
      btnLomba?.classList.add('active'); btnUmum?.classList.remove('active');
      contLomba?.classList.remove('hidden'); contUmum?.classList.add('hidden');
    } else {
      btnUmum?.classList.add('active'); btnLomba?.classList.remove('active');
      contUmum?.classList.remove('hidden'); contLomba?.classList.add('hidden');
    }
  };

  // 9. Render Profil & Kartu ID
  function renderUserData() {
    if (!currentUser) return;
    document.getElementById('userGreeting').innerText = currentUser.nama;
    const photo = currentUser.foto || 'https://via.placeholder.com/90';
    document.getElementById('profileAvatar').src = photo;
    document.getElementById('navUserAvatar').src = photo;
    document.getElementById('cardAvatar').src = photo;

    const kelasFull = currentUser.kelas ? `Kelas ${currentUser.kelas}${currentUser.subKelas || ''}` : '-';
    document.getElementById('userCodeBadge').innerText = `Kode PMR: PMR-${currentUser.id}`;
    document.getElementById('userBadgeTingkatan').innerText = `Tingkatan: ${currentUser.tingkatan || 'Mula'} • ${kelasFull}`;
    document.getElementById('userJabatanDisplay').innerText = currentUser.jabatan || 'Anggota';

    const hadir = parseInt(currentUser.hadir) || 0;
    const skorLain = parseInt(currentUser.skorLain) || 0;
    document.getElementById('userTotalSkor').innerText = (hadir * 10) + skorLain;

    document.getElementById('cardNama').innerText = currentUser.nama;
    document.getElementById('cardKode').innerText = `PMR-${currentUser.id}`;
    document.getElementById('cardJabatan').innerText = `${currentUser.jabatan || 'Anggota'} (${kelasFull})`;
    document.getElementById('cardTingkatBadge').innerText = (currentUser.tingkatan || 'MULA').toUpperCase();
    document.getElementById('cardSekolah').innerText = currentUser.sekolah;

    document.getElementById('attHadir').innerText = hadir;
    document.getElementById('attIzin').innerText = currentUser.izin || 0;
    document.getElementById('attAlpha').innerText = currentUser.alpha || 0;

    document.getElementById('userInfoDisplay').innerHTML = `
      <p><strong>NIK:</strong> ${currentUser.nik}</p>
      <p><strong>Email:</strong> ${currentUser.email}</p>
      <p><strong>Kelas:</strong> ${kelasFull}</p>
      <p><strong>Angkatan:</strong> ${currentUser.angkatan || '-'}</p>
      <p><strong>Sekolah:</strong> ${currentUser.sekolah}</p>
      <p><strong>Nama Orang Tua:</strong> ${currentUser.namaOrtu || '-'}</p>
      <p><strong>No HP Ortu:</strong> ${currentUser.noOrtu || '-'}</p>
    `;
  }

  if (changePhotoInput) {
    changePhotoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const base64 = await compressImage(file, 200, 0.5);
      currentUser.foto = base64;
      if (typeof AuthSession !== 'undefined') AuthSession.updatePhoto(base64);
      renderUserData();
      alert('Foto profil berhasil diperbarui!');
    });
  }

  async function checkNotifications() {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getActivities&t=${Date.now()}`);
      const acts = await res.json();
      const notifCount = document.getElementById('notifCount');
      const notifBell = document.getElementById('notifBellBtn');
      if (acts && acts.length > 0 && notifCount) {
        notifCount.classList.remove('hidden');
        notifCount.innerText = acts.length;
      }
      if (notifBell) {
        notifBell.onclick = () => document.querySelector('[data-target="pageActivities"]')?.click();
      }
    } catch (e) {}
  }

  window.openZoomImage = function(src) {
    if (!src) return;
    document.getElementById('zoomedImg').src = src;
    document.getElementById('imageZoomModal').classList.remove('hidden');
  };
  window.closeZoomImage = function() {
    document.getElementById('imageZoomModal').classList.add('hidden');
  };

  window.downloadIdCard = function() {
    const card = document.getElementById('pmrIdCard');
    if (!card || !currentUser) return;
    html2canvas(card, { scale: 2, useCORS: true }).then(canvas => {
      const link = document.createElement('a');
      link.download = `Kartu-PMR-${currentUser.nama.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (typeof AuthSession !== 'undefined') AuthSession.clearSession();
      location.reload();
    });
  }

  function compressImage(file, maxW, quality) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = e => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
      };
    });
  }
});

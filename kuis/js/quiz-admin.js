/**
 * SIAMO PMR - Logika Admin Navigasi & Live Lobby (quiz/js/quiz-admin-nav.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const menuItems = document.querySelectorAll('.menu-item');
  const panels = document.querySelectorAll('.admin-panel');

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menuItems.forEach(i => i.classList.remove('active'));
      panels.forEach(p => p.classList.add('hidden'));
      
      item.classList.add('active');
      const targetId = item.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.remove('hidden');

      const titles = {
        panelSukaSuka: 'Panel Admin: Main Suka-Suka',
        panelHarian: 'Panel Admin: Tugas Harian',
        panelUjian: 'Panel Admin: Ujian Resmi',
        panelRekap: 'Panel Admin: Rekap Nilai Siswa'
      };
      document.getElementById('pageHeaderTitle').innerText = titles[targetId] || 'Panel Admin';

      if (targetId === 'panelRekap') {
        QuizNavMaster.loadRecapList();
      } else if (targetId === 'panelSukaSuka') {
        QuizNavMaster.loadActiveSukaRooms();
      }
    });
  });

  QuizNavMaster.addCard('suka');
  QuizNavMaster.addCard('harian');
  QuizNavMaster.addCard('ujian');
  QuizNavMaster.loadActiveSukaRooms();
});

const QuizNavMaster = {
  data: { suka: [], harian: [], ujian: [] },

  showModal(title, message) {
    const modal = document.getElementById('customAdminModal');
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalMessage').innerText = message;
    modal.classList.remove('hidden');
    document.getElementById('modalBtnOk').onclick = () => modal.classList.add('hidden');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  },

  addCard(type) {
    const qId = 'q_' + type + '_' + Date.now() + Math.floor(Math.random() * 1000);
    this.data[type].push({ id: qId, text: '', optA: '', optB: '', optC: '', optD: '', correct: 'A', image: '' });
    this.renderCards(type);
  },

  removeCard(type, qId) {
    if (this.data[type].length <= 1) {
      this.showModal('Peringatan', 'Minimal harus ada 1 soal!');
      return;
    }
    this.data[type] = this.data[type].filter(q => q.id !== qId);
    this.renderCards(type);
  },

  updateField(type, qId, field, value) {
    const item = this.data[type].find(q => q.id === qId);
    if (item) item[field] = value;
  },

  async handleImg(type, qId, fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    const base64 = await this.compress(file, 160, 0.4);
    const item = this.data[type].find(q => q.id === qId);
    if (item) {
      item.image = base64;
      const prevEl = document.getElementById(`prev_${qId}`);
      if (prevEl) prevEl.innerHTML = `<img src="${base64}" style="max-height:80px; border-radius:6px; margin-top:8px; border:2px solid #1a1a1a;"><small style="color:#16a34a; font-weight:700; display:block;">Gambar siap!</small>`;
    }
  },

  compress(file, maxW, quality) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = e => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
      };
    });
  },

  renderCards(type) {
    const container = document.getElementById('container' + type.charAt(0).toUpperCase() + type.slice(1));
    if (!container) return;
    container.innerHTML = this.data[type].map((q, index) => `
      <div class="form-question-card">
        <div class="card-question-top">
          <span class="question-number-badge">Soal Nomor ${index + 1}</span>
          <button type="button" onclick="QuizNavMaster.removeCard('${type}', '${q.id}')" class="btn-delete-question">🗑️ Hapus</button>
        </div>
        <div class="input-group" style="margin-bottom: 12px;">
          <label>Pertanyaan</label>
          <textarea rows="2" placeholder="Tulis pertanyaan..." oninput="QuizNavMaster.updateField('${type}', '${q.id}', 'text', this.value)">${q.text}</textarea>
        </div>
        <div class="input-group" style="margin-bottom: 12px;">
          <label>Gambar Pendukung (Opsional)</label>
          <input type="file" accept="image/*" onchange="QuizNavMaster.handleImg('${type}', '${q.id}', this)">
          <div id="prev_${q.id}">${q.image ? `<img src="${q.image}" style="max-height:80px; border-radius:6px; margin-top:8px;">` : ''}</div>
        </div>
        <div class="input-grid-2" style="margin-bottom: 10px;">
          <div class="input-group"><label>Pilihan A</label><input type="text" value="${q.optA}" placeholder="Jawaban A" oninput="QuizNavMaster.updateField('${type}', '${q.id}', 'optA', this.value)"></div>
          <div class="input-group"><label>Pilihan B</label><input type="text" value="${q.optB}" placeholder="Jawaban B" oninput="QuizNavMaster.updateField('${type}', '${q.id}', 'optB', this.value)"></div>
        </div>
        <div class="input-grid-2" style="margin-bottom: 10px;">
          <div class="input-group"><label>Pilihan C</label><input type="text" value="${q.optC}" placeholder="C (Opsional)" oninput="QuizNavMaster.updateField('${type}', '${q.id}', 'optC', this.value)"></div>
          <div class="input-group"><label>Pilihan D</label><input type="text" value="${q.optD}" placeholder="D (Opsional)" oninput="QuizNavMaster.updateField('${type}', '${q.id}', 'optD', this.value)"></div>
        </div>
        <div class="input-group" style="max-width: 250px;">
          <label>Kunci Jawaban</label>
          <select onchange="QuizNavMaster.updateField('${type}', '${q.id}', 'correct', this.value)">
            <option value="A" ${q.correct === 'A' ? 'selected' : ''}>A</option>
            <option value="B" ${q.correct === 'B' ? 'selected' : ''}>B</option>
            <option value="C" ${q.correct === 'C' ? 'selected' : ''}>C</option>
            <option value="D" ${q.correct === 'D' ? 'selected' : ''}>D</option>
          </select>
        </div>
      </div>
    `).join('');
  },

  async publish(categoryType) {
    const mapKey = categoryType === 'sukasuka' ? 'suka' : (categoryType === 'harian' ? 'harian' : 'ujian');
    const titleId = 'title' + mapKey.charAt(0).toUpperCase() + mapKey.slice(1);
    const durationId = 'duration' + mapKey.charAt(0).toUpperCase() + mapKey.slice(1);

    const title = document.getElementById(titleId).value.trim();
    const duration = document.getElementById(durationId).value;
    const listSoal = this.data[mapKey];

    if (!title) { this.showModal('Peringatan', 'Judul wajib diisi!'); return; }

    const payload = {
      action: 'createQuiz',
      title: title,
      category: categoryType,
      duration: duration,
      maxScore: 100,
      questions: listSoal
    };

    try {
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        this.showModal('Sukses', 'Berhasil dipublikasikan!');
        document.getElementById(titleId).value = '';
        this.data[mapKey] = [];
        this.addCard(mapKey);
        if (categoryType === 'sukasuka') this.loadActiveSukaRooms();
      } else {
        this.showModal('Gagal', data.message);
      }
    } catch (err) {
      this.showModal('Error', err);
    }
  },

  async loadActiveSukaRooms() {
    const container = document.getElementById('adminSukaRoomsList');
    if (!container) return;
    container.innerHTML = '<p class="text-center">Memuat room...</p>';

    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getQuizList&t=${Date.now()}`);
      const quizzes = await res.json();
      const list = Array.isArray(quizzes) ? quizzes.filter(q => String(q.category || '').trim().toLowerCase() === 'sukasuka' && String(q.status || '').toUpperCase() !== 'FINISHED') : [];

      if (!list.length) {
        container.innerHTML = '<p style="color:#6b7280; font-size:13px; text-align:center;">Belum ada room suka-suka aktif.</p>';
        return;
      }

      container.innerHTML = list.map(q => `
        <div class="quiz-item-card" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${q.title}</strong>
            <p id="roomCount_${q.id}" style="margin:4px 0 0 0; font-size:12px; color:var(--rh-purple); font-weight:700;">Peserta bergabung: Memuat...</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" onclick="QuizNavMaster.startSukaRoom('${q.id}', '${q.title}')" class="btn-publish-quiz" style="padding:8px 14px; font-size:12px; background:#16a34a;">▶️ Mulai</button>
            <button type="button" onclick="QuizNavMaster.finishSukaRoom('${q.id}', '${q.title}')" class="btn-delete-question" style="padding:8px 14px; font-size:12px;">⏹️ Selesaikan</button>
          </div>
        </div>
      `).join('');

      list.forEach(q => this.pollAdminRoom(q.id));
    } catch(e) {
      container.innerHTML = '<p style="color:red; text-align:center;">Gagal memuat room.</p>';
    }
  },

  async pollAdminRoom(quizId) {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getRoomStatus&quizId=${quizId}&t=${Date.now()}`);
      const data = await res.json();
      const el = document.getElementById(`roomCount_${quizId}`);
      if (el) {
        const names = data.participants.map(p => p.name).join(', ') || 'Belum ada';
        el.innerText = `Peserta (${data.participants.length}): ${names}`;
      }
    } catch(e) {}
  },

  async startSukaRoom(quizId, title) {
    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'startQuizRoom', quizId: quizId })
      });
      this.showModal('Mulai Kuis!', `Room "${title}" telah dimulai secara serentak!`);
    } catch(e) {
      this.showModal('Error', 'Gagal memulai room.');
    }
  },

  async finishSukaRoom(quizId, title) {
    if (!confirm(`Yakin ingin menyelesaikan room "${title}"? Peserta tidak akan bisa join lagi.`)) return;
    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'finishQuizRoom', quizId: quizId })
      });
      this.showModal('Selesai', `Room "${title}" berhasil ditutup.`);
      this.loadActiveSukaRooms();
    } catch(e) {
      this.showModal('Error', 'Gagal menutup room.');
    }
  },

  async loadRecapList() {
    const cont = document.getElementById('containerQuizRecap');
    cont.innerHTML = '<p class="text-center">Memuat daftar...</p>';
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getQuizList&t=${Date.now()}`);
      const quizzes = await res.json();
      const list = Array.isArray(quizzes) ? quizzes : [];
      if (!list.length) { cont.innerHTML = '<p class="text-center">Belum ada kuis.</p>'; return; }
      cont.innerHTML = list.map(q => `
        <div class="quiz-item-card" style="margin-bottom: 12px;">
          <div><strong>${q.title}</strong><p style="font-size:12px; color:#4b5563; margin:2px 0 0 0;">Kategori: <strong>${q.category.toUpperCase()}</strong></p></div>
          <button type="button" onclick="QuizNavMaster.viewSubmissions('${q.id}', '${q.title}')" class="btn-small-primary">📋 Lihat Rekap</button>
        </div>
      `).join('');
    } catch (err) { cont.innerHTML = '<p class="text-center" style="color:#d9381e;">Gagal memuat.</p>'; }
  },

  async viewSubmissions(quizId, quizTitle) {
    const modal = document.getElementById('quizSubmissionsModal');
    const titleEl = document.getElementById('subModalTitle');
    const bodyEl = document.getElementById('subModalBody');
    titleEl.innerText = `Rekap: ${quizTitle}`;
    bodyEl.innerHTML = '<p class="text-center">Memuat...</p>';
    modal.classList.remove('hidden');

    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getQuizSubmissions&quizId=${quizId}&t=${Date.now()}`);
      const subs = await res.json();
      const list = Array.isArray(subs) ? subs : [];
      if (!list.length) { bodyEl.innerHTML = '<p class="text-center" style="padding:20px; color:#6b7280;">Belum ada siswa yang mengerjakan.</p>'; return; }
      bodyEl.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead><tr style="border-bottom:2px solid #1a1a1a; text-align:left;"><th style="padding:8px;">No</th><th style="padding:8px;">Nama Siswa</th><th style="padding:8px;">Skor</th><th style="padding:8px;">Waktu</th></tr></thead>
          <tbody>${list.map((s, i) => `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;">${i + 1}</td><td style="padding:8px;"><strong>${s.memberName}</strong></td><td style="padding:8px; color:#16a34a; font-weight:700;">${s.score} PTS</td><td style="padding:8px;"><small>${s.timestamp}</small></td></tr>`).join('')}</tbody>
        </table>
      `;
    } catch (err) { bodyEl.innerHTML = '<p class="text-center" style="color:#d9381e;">Gagal memuat rekap.</p>'; }
  }
};
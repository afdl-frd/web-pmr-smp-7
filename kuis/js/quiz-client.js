/**
 * SIAMO PMR - Logika Kuis Siswa & Lobby (quiz/js/quiz-client.js)
 */

const QuizClient = {
  currentUser: null,
  activeQuestions: [],
  currentIdx: 0,
  userAnswers: {},
  activeCategory: 'sukasuka',
  currentQuizId: null,
  lobbyInterval: null,

  init() {
    this.currentUser = typeof AuthSession !== 'undefined' ? AuthSession.getUser() : null;
    if (this.currentUser) {
      const greet = document.getElementById('quizUserGreeting');
      if (greet) greet.innerText = `Halo, ${this.currentUser.nama}`;
    } else {
      alert('Silakan login terlebih dahulu di portal utama!');
      location.href = '../index.html';
    }
  },

  selectMode(mode) {
    document.getElementById('quizMainHub').classList.add('hidden');
    if (mode === 'sukasuka') {
      this.loadQuizList('sukasuka');
    } else {
      document.getElementById('quizSeriusSubMenu').classList.remove('hidden');
      this.loadQuizList('harian');
    }
  },

  backToHub() {
    if (this.lobbyInterval) clearInterval(this.lobbyInterval);
    document.getElementById('quizMainHub').classList.remove('hidden');
    document.getElementById('quizSeriusSubMenu').classList.add('hidden');
    document.getElementById('quizPlayArea').classList.add('hidden');
    document.getElementById('quizPodiumArea').classList.add('hidden');
    const lobby = document.getElementById('quizLobbyArea');
    if (lobby) lobby.classList.add('hidden');
    this.loadQuizList('sukasuka'); // Refresh otomatis
  },

  switchSeriusTab(type) {
    document.getElementById('btnSeriusHarian').classList.toggle('active', type === 'harian');
    document.getElementById('btnSeriusUjian').classList.toggle('active', type === 'ujian');
    this.loadQuizList(type);
  },

  async loadQuizList(cat) {
    this.activeCategory = cat;
    const container = cat === 'sukasuka' ? document.getElementById('quizMainHub') : document.getElementById('quizSeriusListContainer');
    if (cat !== 'sukasuka') container.innerHTML = '<p class="loading-text">Sedang memuat data...</p>';

    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getQuizList&t=${Date.now()}`);
      const quizzes = await res.json();
      const list = Array.isArray(quizzes) ? quizzes : [];
      
      const filtered = list.filter(q => {
        if (cat === 'sukasuka') {
          return String(q.category || '').trim().toLowerCase() === 'sukasuka' && String(q.status || '').toUpperCase() !== 'FINISHED';
        } else {
          return String(q.category || '').trim().toLowerCase() === cat;
        }
      });

      if (cat === 'sukasuka') {
        let html = `
          <div class="quiz-title-area">
            <h2>Room Suka-Suka Aktif</h2>
            <p>Pilih room untuk masuk ke ruang tunggu:</p>
          </div>
          <div class="quiz-btn-stack">
        `;
        html += filtered.length ? filtered.map(q => `
          <button type="button" class="btn-quiz-choice suka" onclick="QuizClient.joinLobby('${q.id}', '${q.title}')">
            <span class="icon">🎉</span>
            <div class="text"><strong>${q.title}</strong><small>Durasi: ${q.duration}s | Status: ${q.status === 'STARTED' ? 'Sedang Berlangsung' : 'Menunggu Mulai'}</small></div>
          </button>
        `).join('') : '<p style="text-align:center; color:#6b7280; padding:20px;">Belum ada room suka-suka aktif.</p>';
        html += `
          </div>
          <div style="margin-top: 25px; text-align: center;">
            <button type="button" class="btn-text-back" onclick="QuizClient.backToHub()">← Refresh Daftar Room</button>
          </div>
        `;
        document.getElementById('quizMainHub').innerHTML = html;
      } else {
        container.innerHTML = filtered.length ? filtered.map(q => `
          <div class="quiz-item-card">
            <div><strong>${q.title}</strong><p>Durasi: ${q.duration} Detik • Poin: ${q.maxScore}</p></div>
            <button type="button" class="btn-small-primary" onclick="QuizClient.startDirectQuiz('${q.id}', '${q.title}')">Mulai</button>
          </div>
        `).join('') : '<p style="text-align:center; color:#6b7280; padding:20px;">Belum ada tugas di kategori ini.</p>';
      }
    } catch (e) {
      if (cat !== 'sukasuka') container.innerHTML = '<p style="text-align:center; color:#d9381e;">Gagal memuat data.</p>';
    }
  },

  async joinLobby(quizId, title) {
    this.currentQuizId = quizId;
    document.getElementById('quizMainHub').classList.add('hidden');
    
    let lobby = document.getElementById('quizLobbyArea');
    if (!lobby) {
      lobby = document.createElement('div');
      lobby.id = 'quizLobbyArea';
      lobby.className = 'quiz-section-block';
      lobby.innerHTML = `
        <div class="forms-header-card" style="text-align:center; padding:40px;">
          <h2 id="lobbyTitle" style="margin-bottom:10px;">Menunggu Admin Memulai Room...</h2>
          <p style="color:#4b5563; margin-bottom:20px;">Kamu sudah di ruang tunggu. Kuis akan dimulai serentak oleh admin.</p>
          <div style="font-size:32px; margin-bottom:15px;">⏳</div>
          <h4 id="lobbyCountParticipant" style="color:var(--rh-purple); font-weight:800;">Peserta Bergabung: Memuat...</h4>
          <div style="margin-top:30px;"><button type="button" class="btn-text-back" onclick="QuizClient.backToHub()">Keluar Room</button></div>
        </div>
      `;
      document.querySelector('.quiz-content-box').appendChild(lobby);
    }
    lobby.classList.remove('hidden');
    document.getElementById('lobbyTitle').innerText = `Room: ${title}`;

    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'joinQuizRoom', quizId: quizId, email: this.currentUser.email, name: this.currentUser.nama })
      });
    } catch(e) {}

    if (this.lobbyInterval) clearInterval(this.lobbyInterval);
    this.lobbyInterval = setInterval(() => this.checkRoomStatus(quizId, title), 3000);
  },

  async checkRoomStatus(quizId, title) {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getRoomStatus&quizId=${quizId}&t=${Date.now()}`);
      const data = await res.json();
      
      if (data.status === 'FINISHED') {
        clearInterval(this.lobbyInterval);
        alert('Room ini telah ditutup oleh admin.');
        this.backToHub();
        return;
      }

      document.getElementById('lobbyCountParticipant').innerText = `Peserta Bergabung: ${data.participants.length} orang`;

      if (data.status === 'STARTED') {
        clearInterval(this.lobbyInterval);
        document.getElementById('quizLobbyArea').classList.add('hidden');
        this.startDirectQuiz(quizId, title);
      }
    } catch(e) {}
  },

  async startDirectQuiz(quizId, title) {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getQuizDetail&quizId=${quizId}&t=${Date.now()}`);
      const data = await res.json();
      if (!data.questions || !data.questions.length) {
        alert('Soal kuis belum tersedia.');
        return;
      }
      this.activeQuestions = data.questions;
      this.currentQuizId = quizId;
      this.currentIdx = 0;
      this.userAnswers = {};

      document.getElementById('quizMainHub').classList.add('hidden');
      document.getElementById('quizSeriusSubMenu').classList.add('hidden');
      const lobby = document.getElementById('quizLobbyArea');
      if (lobby) lobby.classList.add('hidden');

      document.getElementById('quizPlayArea').classList.remove('hidden');
      document.getElementById('activeQuizTitle').innerText = title;
      this.renderQuestion();
    } catch (e) {
      alert('Gagal memuat soal kuis.');
    }
  },

  renderQuestion() {
    const container = document.getElementById('quizQuestionContainer');
    const q = this.activeQuestions[this.currentIdx];
    if (!q) {
      this.finishQuiz();
      return;
    }
    let imgHtml = q.image ? `<img src="${q.image}" style="max-height:160px; border-radius:8px; margin-bottom:12px; display:block;">` : '';
    container.innerHTML = `
      <div style="font-size:13px; font-weight:800; color:var(--rh-red); margin-bottom:6px;">Soal ${this.currentIdx + 1} dari ${this.activeQuestions.length}</div>
      ${imgHtml}
      <h4 style="font-size:16px; font-weight:800; color:var(--rh-ink); margin-bottom:16px; line-height:1.5;">${q.questionText}</h4>
      <div class="options-stack">
        <button type="button" onclick="QuizClient.selectAnswer('${q.id}', 'A')" class="opt-row-btn" id="optA_${q.id}">A. ${q.optA}</button>
        <button type="button" onclick="QuizClient.selectAnswer('${q.id}', 'B')" class="opt-row-btn" id="optB_${q.id}">B. ${q.optB}</button>
        ${q.optC ? `<button type="button" onclick="QuizClient.selectAnswer('${q.id}', 'C')" class="opt-row-btn" id="optC_${q.id}">C. ${q.optC}</button>` : ''}
        ${q.optD ? `<button type="button" onclick="QuizClient.selectAnswer('${q.id}', 'D')" class="opt-row-btn" id="optD_${q.id}">D. ${q.optD}</button>` : ''}
      </div>
    `;
    document.getElementById('btnNextQuizQuestion').classList.remove('hidden');
  },

  selectAnswer(qId, key) {
    this.userAnswers[qId] = key;
    ['A', 'B', 'C', 'D'].forEach(k => {
      const btn = document.getElementById(`opt${k}_${qId}`);
      if (btn) btn.classList.toggle('selected', k === key);
    });
  },

  nextQuestion() {
    this.currentIdx++;
    if (this.currentIdx < this.activeQuestions.length) {
      this.renderQuestion();
    } else {
      this.finishQuiz();
    }
  },

  async finishQuiz() {
    document.getElementById('quizPlayArea').classList.add('hidden');
    let correctCount = 0;
    this.activeQuestions.forEach(q => {
      if (this.userAnswers[q.id] && String(this.userAnswers[q.id]).trim().toUpperCase() === String(q.correctKey).trim().toUpperCase()) {
        correctCount++;
      }
    });
    const finalScore = Math.round((correctCount / this.activeQuestions.length) * 100);

    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'submitQuizResult',
          quizId: this.currentQuizId || '123',
          email: this.currentUser.email,
          name: this.currentUser.nama,
          score: finalScore,
          category: this.activeCategory
        })
      });
    } catch (e) {}

    document.getElementById('quizPodiumArea').classList.remove('hidden');
    document.getElementById('finalScoreDisplay').innerText = finalScore;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  QuizClient.init();
});
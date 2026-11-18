/**
 * SIAMO PMR - Logika Kuis Siswa Lengkap (Tanggal Pembuatan + Lembar Ujian + Anti-Keluar Room)
 */

const QuizClient = {
  currentUser: null,
  activeQuestions: [],
  currentIdx: 0,
  userAnswers: {},
  activeCategory: 'sukasuka',
  currentQuizId: null,
  lobbyInterval: null,
  questionTimer: null,
  globalTimer: null,
  timeLeft: 30,
  maxDuration: 30,
  useTimer: true,

  init() {
    this.currentUser = typeof AuthSession !== 'undefined' ? AuthSession.getUser() : null;
    if (this.currentUser) {
      const greet = document.getElementById('quizUserGreeting');
      if (greet) greet.innerText = `Halo, ${this.currentUser.nama}`;
    } else {
      this.currentUser = {
        nama: "Siswa Tamu",
        email: "siswa@siamopmr.test"
      };
      const greet = document.getElementById('quizUserGreeting');
      if (greet) greet.innerText = `Halo, ${this.currentUser.nama}`;
    }
  },

  selectMode(mode) {
    if (mode === 'sukasuka') {
      this.loadQuizList('sukasuka');
    } else {
      const mainHub = document.getElementById('quizMainHub');
      if (mainHub) mainHub.classList.add('hidden');
      const seriusSubMenu = document.getElementById('quizSeriusSubMenu');
      if (seriusSubMenu) seriusSubMenu.classList.remove('hidden');
      this.loadQuizList('harian');
    }
  },

  backToHub() {
    if (this.lobbyInterval) clearInterval(this.lobbyInterval);
    if (this.questionTimer) clearInterval(this.questionTimer);
    if (this.globalTimer) clearInterval(this.globalTimer);
    
    const mainHub = document.getElementById('quizMainHub');
    const seriusSubMenu = document.getElementById('quizSeriusSubMenu');
    const playArea = document.getElementById('quizPlayArea');
    const podiumArea = document.getElementById('quizPodiumArea');
    const lobby = document.getElementById('quizLobbyArea');

    if (mainHub) mainHub.classList.remove('hidden');
    if (seriusSubMenu) seriusSubMenu.classList.add('hidden');
    if (playArea) playArea.classList.add('hidden');
    if (podiumArea) podiumArea.classList.add('hidden');
    if (lobby) lobby.classList.add('hidden');
    
    this.renderHubMainButtons();
  },

  renderHubMainButtons() {
    const mainHub = document.getElementById('quizMainHub');
    if (!mainHub) return;

    mainHub.innerHTML = `
      <div class="quiz-title-area">
        <h2>Arena Kuis & Ujian PMR</h2>
        <p>Pilih mode kuis di bawah ini untuk mulai belajar atau menguji kemampuanmu.</p>
      </div>
      <div class="quiz-btn-stack">
        <button type="button" class="btn-quiz-choice suka" onclick="QuizClient.selectMode('sukasuka')">
          <span class="icon">🎉</span>
          <div class="text"><strong>Main Suka-Suka</strong><small>Kuis interaktif, bergabung di ruang tunggu bersama teman.</small></div>
        </button>
        <button type="button" class="btn-quiz-choice serius" onclick="QuizClient.selectMode('serius')">
          <span class="icon">📝</span>
          <div class="text"><strong>Main Serius</strong><small>Tugas harian dan ujian resmi, nilai langsung masuk ke rapor akun.</small></div>
        </button>
      </div>
    `;
  },

  switchSeriusTab(type) {
    const btnHarian = document.getElementById('btnSeriusHarian');
    const btnUjian = document.getElementById('btnSeriusUjian');
    if (btnHarian) btnHarian.classList.toggle('active', type === 'harian');
    if (btnUjian) btnUjian.classList.toggle('active', type === 'ujian');
    this.loadQuizList(type);
  },

  async loadQuizList(cat) {
    this.activeCategory = cat;
    const mainHub = document.getElementById('quizMainHub');
    const container = cat === 'sukasuka' ? mainHub : document.getElementById('quizSeriusListContainer');
    if (!container) return;

    if (cat !== 'sukasuka') container.innerHTML = '<p class="loading-text">Sedang memuat data...</p>';

    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getQuizList&t=${Date.now()}`);
      const quizzes = await res.json();
      const list = Array.isArray(quizzes) ? quizzes : [];
      
      const filtered = list.filter(q => {
        let qCat = String(q.category || '').trim().toLowerCase();
        let qStatus = String(q.status || '').trim().toUpperCase();
        
        if (cat === 'sukasuka') {
          return qCat === 'sukasuka' && qStatus !== 'FINISHED';
        } else {
          return qCat === cat && qStatus !== 'FINISHED';
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
        
        if (filtered.length > 0) {
          html += filtered.map(q => `
            <button type="button" class="btn-quiz-choice suka" onclick="QuizClient.joinLobby('${q.id}', '${q.title}', ${q.duration})">
              <span class="icon">🎉</span>
              <div class="text">
                <strong>${q.title}</strong>
                <small>📅 Dibuat: ${q.createdAt || 'Baru'} | Durasi: ${q.duration}s</small>
              </div>
            </button>
          `).join('');
        } else {
          html += `
            <div style="text-align:center; padding:20px; background:#fff; border:2.5px solid #1a1a1a; border-radius:12px;">
              <p style="color:#6b7280; font-weight:700; margin-bottom:12px;">Belum ada room Suka-Suka yang dibuka admin.</p>
              <button type="button" class="btn-small-primary" onclick="QuizClient.loadQuizList('sukasuka')">🔄 Refresh Room</button>
            </div>
          `;
        }

        html += `
          </div>
          <div style="margin-top: 25px; text-align: center;">
            <button type="button" class="btn-text-back" onclick="QuizClient.backToHub()">← Kembali ke Menu Utama</button>
          </div>
        `;
        mainHub.innerHTML = html;
        mainHub.classList.remove('hidden');
      } else {
        container.innerHTML = filtered.length ? filtered.map(q => `
          <div class="quiz-item-card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <strong>${q.title}</strong>
              <p style="margin:4px 0 0 0; font-size:12px; color:#4b5563;">
                📅 Dibuat: <strong>${q.createdAt || '-'}</strong> • ${q.useTimer ? `Durasi: ${q.duration} Menit` : 'Tanpa Batas Waktu'} • Poin: ${q.maxScore}
              </p>
            </div>
            <button type="button" class="btn-small-primary" onclick="QuizClient.startPaginatedExam('${q.id}', '${q.title}', ${q.duration}, ${q.useTimer})">Mulai</button>
          </div>
        `).join('') : '<p style="text-align:center; color:#6b7280; padding:20px;">Belum ada tugas di kategori ini.</p>';
      }
    } catch (e) {
      if (cat === 'sukasuka') {
        mainHub.innerHTML = `
          <div class="quiz-title-area">
            <h2>Room Suka-Suka Aktif</h2>
            <p style="color:#d9381e; font-weight:700;">Gagal memuat room dari server.</p>
          </div>
          <div style="text-align:center; margin-top:20px;">
            <button type="button" class="btn-small-primary" onclick="QuizClient.loadQuizList('sukasuka')">🔄 Coba Lagi</button>
            <br><br>
            <button type="button" class="btn-text-back" onclick="QuizClient.backToHub()">← Kembali</button>
          </div>
        `;
      }
    }
  },

  async joinLobby(quizId, title, duration) {
    this.currentQuizId = quizId;
    this.maxDuration = Number(duration) || 30;
    const mainHub = document.getElementById('quizMainHub');
    if (mainHub) mainHub.classList.add('hidden');
    
    let lobby = document.getElementById('quizLobbyArea');
    if (!lobby) {
      lobby = document.createElement('div');
      lobby.id = 'quizLobbyArea';
      lobby.className = 'quiz-section-block';
      lobby.innerHTML = `
        <div class="forms-header-card" style="text-align:center; padding:40px;">
          <h2 id="lobbyTitle" style="margin-bottom:10px;">Menunggu Admin Memulai Room...</h2>
          <p style="color:#4b5563; margin-bottom:20px;">Kamu sudah berada di ruang tunggu. Kuis akan dimulai serentak oleh admin.</p>
          <div style="font-size:32px; margin-bottom:15px;">⏳</div>
          <h4 id="lobbyCountParticipant" style="color:var(--rh-purple); font-weight:800;">Peserta Bergabung: Menghubungkan...</h4>
          <div style="margin-top:30px;"><button type="button" class="btn-text-back" onclick="QuizClient.backToHub()">Keluar Room</button></div>
        </div>
      `;
      const contentBox = document.querySelector('.quiz-content-box');
      if (contentBox) contentBox.appendChild(lobby);
    }
    
    lobby.classList.remove('hidden');
    const lobbyTitle = document.getElementById('lobbyTitle');
    if (lobbyTitle) lobbyTitle.innerText = `Room: ${title}`;

    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'joinQuizRoom', 
          quizId: quizId, 
          email: this.currentUser.email, 
          name: this.currentUser.nama 
        })
      });
    } catch(e) {}

    if (this.lobbyInterval) clearInterval(this.lobbyInterval);
    this.lobbyInterval = setInterval(() => this.checkRoomStatus(quizId, title), 2500);
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

      const countEl = document.getElementById('lobbyCountParticipant');
      if (countEl) countEl.innerText = `Peserta Bergabung: ${data.participants.length} orang`;

      if (data.status === 'STARTED') {
        clearInterval(this.lobbyInterval);
        const lobby = document.getElementById('quizLobbyArea');
        if (lobby) lobby.classList.add('hidden');
        this.startLiveSukaQuiz(quizId, title, this.maxDuration);
      }
    } catch(e) {}
  },

  async startLiveSukaQuiz(quizId, title, duration) {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getQuizDetail&quizId=${quizId}&t=${Date.now()}`);
      const data = await res.json();
      if (!data.questions || !data.questions.length) {
        alert('Soal kuis belum tersedia.');
        this.backToHub();
        return;
      }
      this.activeQuestions = data.questions;
      this.currentQuizId = quizId;
      this.currentIdx = 0;
      this.userAnswers = {};
      this.maxDuration = Number(duration) || 30;

      const playArea = document.getElementById('quizPlayArea');
      playArea.classList.remove('hidden');
      playArea.innerHTML = `
        <div class="quiz-play-header">
          <h3 id="activeQuizTitle">${title}</h3>
        </div>
        <div id="quizQuestionContainer" class="question-box"></div>
        <div style="margin-top: 20px; text-align: right;">
          <button type="button" id="btnNextQuizQuestion" onclick="QuizClient.nextLiveQuestion()" class="btn-submit-answer">Selanjutnya →</button>
        </div>
      `;
      
      this.renderLiveQuestion();
    } catch (e) {
      alert('Gagal memuat soal kuis.');
      this.backToHub();
    }
  },

  renderLiveQuestion() {
    if (this.questionTimer) clearInterval(this.questionTimer);
    
    const container = document.getElementById('quizQuestionContainer');
    const q = this.activeQuestions[this.currentIdx];
    if (!q) {
      this.finishQuiz();
      return;
    }

    this.timeLeft = this.maxDuration;
    let imgHtml = q.image ? `<img src="${q.image}" style="max-height:160px; border-radius:8px; margin-bottom:12px; display:block;">` : '';
    
    container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; margin-bottom: 6px;">
          <span style="color:var(--rh-red);">Soal ${this.currentIdx + 1} dari ${this.activeQuestions.length}</span>
          <span id="timerTextDisplay">${this.timeLeft}s</span>
        </div>
        <div style="width: 100%; height: 12px; background: #e5e7eb; border-radius: 6px; border: 2px solid #1a1a1a; overflow: hidden;">
          <div id="quizTimerBar" style="width: 100%; height: 100%; background: #16a34a; transition: width 1s linear, background-color 0.5s ease;"></div>
        </div>
      </div>

      ${imgHtml}
      <h4 style="font-size: 16px; font-weight: 800; color: var(--rh-ink); margin-bottom: 16px; line-height: 1.5;">${q.questionText}</h4>
      <div class="options-stack">
        <button type="button" onclick="QuizClient.selectLiveAnswer('${q.id}', 'A')" class="opt-row-btn" id="optA_${q.id}">A. ${q.optA}</button>
        <button type="button" onclick="QuizClient.selectLiveAnswer('${q.id}', 'B')" class="opt-row-btn" id="optB_${q.id}">B. ${q.optB}</button>
        ${q.optC ? `<button type="button" onclick="QuizClient.selectLiveAnswer('${q.id}', 'C')" class="opt-row-btn" id="optC_${q.id}">C. ${q.optC}</button>` : ''}
        ${q.optD ? `<button type="button" onclick="QuizClient.selectLiveAnswer('${q.id}', 'D')" class="opt-row-btn" id="optD_${q.id}">D. ${q.optD}</button>` : ''}
      </div>
    `;

    this.questionTimer = setInterval(() => {
      this.timeLeft--;
      const textDisp = document.getElementById('timerTextDisplay');
      const barDisp = document.getElementById('quizTimerBar');

      if (textDisp) textDisp.innerText = `${this.timeLeft}s`;

      if (barDisp) {
        let pct = (this.timeLeft / this.maxDuration) * 100;
        barDisp.style.width = `${pct}%`;

        if (pct <= 25) {
          barDisp.style.backgroundColor = '#d9381e';
        } else if (pct <= 50) {
          barDisp.style.backgroundColor = '#facc15';
        } else {
          barDisp.style.backgroundColor = '#16a34a';
        }
      }

      if (this.timeLeft <= 0) {
        clearInterval(this.questionTimer);
        this.nextLiveQuestion();
      }
    }, 1000);
  },

  selectLiveAnswer(qId, key) {
    this.userAnswers[qId] = key;
    ['A', 'B', 'C', 'D'].forEach(k => {
      const btn = document.getElementById(`opt${k}_${qId}`);
      if (btn) btn.classList.toggle('selected', k === key);
    });
  },

  nextLiveQuestion() {
    if (this.questionTimer) clearInterval(this.questionTimer);
    this.currentIdx++;
    if (this.currentIdx < this.activeQuestions.length) {
      this.renderLiveQuestion();
    } else {
      this.finishQuiz();
    }
  },

  async startPaginatedExam(quizId, title, duration, useTimerFlag = true) {
    try {
      const checkRes = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'checkStudentExamAccess',
          quizId: quizId,
          email: this.currentUser.email
        })
      });
      const checkData = await checkRes.json();
      
      if (checkData.status === 'blocked') {
        alert(checkData.message);
        return;
      }

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
      this.useTimer = useTimerFlag !== false;
      this.timeLeft = (Number(duration) || 30) * 60;

      document.getElementById('quizMainHub').classList.add('hidden');
      document.getElementById('quizSeriusSubMenu').classList.add('hidden');

      const playArea = document.getElementById('quizPlayArea');
      playArea.classList.remove('hidden');
      
      playArea.innerHTML = `
        <div class="quiz-play-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
          <h3 id="activeQuizTitle" style="font-size:16px; font-weight:800;">${title} <span style="font-size:11px; color:#d9381e; background:#fee2e2; padding:3px 8px; border-radius:4px; margin-left:6px;">⚠️ Jangan keluar/refresh!</span></h3>
          <div id="timerBadgeContainer" class="timer-badge" style="${this.useTimer ? '' : 'display:none;'}">Sisa Waktu: <strong id="timeLeftDisplay">00:00</strong></div>
        </div>

        <div class="quiz-exam-layout" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
          <div class="exam-question-pane" style="grid-column: span 2; background:#fff; border:2.5px solid #1a1a1a; padding:24px; border-radius:12px; box-shadow:4px 4px 0px #1a1a1a;">
            <div id="quizQuestionContainer"></div>
            <div style="display:flex; justify-content:space-between; margin-top:24px; border-top:2px solid #e5e7eb; padding-top:16px;">
              <button type="button" onclick="QuizClient.prevExamPage()" class="btn-small-primary" style="background:#e5e7eb; color:#1a1a1a;">← Sebelumnya</button>
              <button type="button" id="btnNextOrSubmit" onclick="QuizClient.nextExamPage()" class="btn-small-primary" style="background:var(--rh-purple);">Selanjutnya →</button>
            </div>
          </div>

          <div class="exam-nav-pane" style="background:#fff; border:2.5px solid #1a1a1a; padding:16px; border-radius:12px; box-shadow:4px 4px 0px #1a1a1a; height:fit-content;">
            <h4 style="font-size:14px; font-weight:800; margin-bottom:12px; text-align:center;">Navigasi Nomor Soal</h4>
            <div id="questionNumberGrid" style="display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; margin-bottom:16px;"></div>
            <button type="button" onclick="QuizClient.confirmSubmitExam()" class="btn-publish-quiz" style="width:100%; background:#16a34a; font-size:13px; padding:10px;">Selesai & Kirim</button>
          </div>
        </div>
      `;

      this.renderExamPage();

      if (this.useTimer) {
        this.startGlobalExamTimer();
      }
    } catch (e) {
      alert('Gagal memuat soal atau terjadi gangguan jaringan.');
    }
  },

  renderExamPage() {
    const q = this.activeQuestions[this.currentIdx];
    const container = document.getElementById('quizQuestionContainer');
    if (!q || !container) return;

    let imgHtml = q.image ? `<img src="${q.image}" style="max-height:160px; border-radius:8px; margin-bottom:12px; display:block;">` : '';
    let currentSelected = this.userAnswers[q.id] || '';

    container.innerHTML = `
      <div style="font-size:13px; font-weight:800; color:var(--rh-red); margin-bottom:6px;">Soal Nomor ${this.currentIdx + 1} dari ${this.activeQuestions.length}</div>
      ${imgHtml}
      <h4 style="font-size:16px; font-weight:800; color:var(--rh-ink); margin-bottom:16px; line-height:1.5;">${q.questionText}</h4>
      <div class="options-stack">
        <button type="button" onclick="QuizClient.selectExamAnswer('${q.id}', 'A')" class="opt-row-btn ${currentSelected === 'A' ? 'selected' : ''}" id="optA_${q.id}">A. ${q.optA}</button>
        <button type="button" onclick="QuizClient.selectExamAnswer('${q.id}', 'B')" class="opt-row-btn ${currentSelected === 'B' ? 'selected' : ''}" id="optB_${q.id}">B. ${q.optB}</button>
        ${q.optC ? `<button type="button" onclick="QuizClient.selectExamAnswer('${q.id}', 'C')" class="opt-row-btn ${currentSelected === 'C' ? 'selected' : ''}" id="optC_${q.id}">C. ${q.optC}</button>` : ''}
        ${q.optD ? `<button type="button" onclick="QuizClient.selectExamAnswer('${q.id}', 'D')" class="opt-row-btn ${currentSelected === 'D' ? 'selected' : ''}" id="optD_${q.id}">D. ${q.optD}</button>` : ''}
      </div>
    `;

    this.renderNumberGrid();

    const nextBtn = document.getElementById('btnNextOrSubmit');
    if (nextBtn) {
      nextBtn.innerText = this.currentIdx === this.activeQuestions.length - 1 ? 'Selesai 🏁' : 'Selanjutnya →';
    }
  },

  renderNumberGrid() {
    const gridContainer = document.getElementById('questionNumberGrid');
    if (!gridContainer) return;

    gridContainer.innerHTML = this.activeQuestions.map((q, idx) => {
      let isAnswered = Boolean(this.userAnswers[q.id]);
      let isActive = idx === this.currentIdx;

      let bgColor = '#fff';
      let textColor = '#1a1a1a';

      if (isActive) {
        bgColor = '#5c3d99';
        textColor = '#fff';
      } else if (isAnswered) {
        bgColor = '#bbf7d0';
        textColor = '#166534';
      }

      return `
        <button type="button" onclick="QuizClient.jumpToExamPage(${idx})" style="padding:10px 4px; font-weight:800; background:${bgColor}; color:${textColor}; border:2px solid #1a1a1a; border-radius:6px; cursor:pointer;">
          ${idx + 1}
        </button>
      `;
    }).join('');
  },

  selectExamAnswer(qId, key) {
    this.userAnswers[qId] = key;
    ['A', 'B', 'C', 'D'].forEach(k => {
      const btn = document.getElementById(`opt${k}_${qId}`);
      if (btn) btn.classList.toggle('selected', k === key);
    });
    this.renderNumberGrid();
  },

  jumpToExamPage(index) {
    this.currentIdx = index;
    this.renderExamPage();
  },

  prevExamPage() {
    if (this.currentIdx > 0) {
      this.currentIdx--;
      this.renderExamPage();
    }
  },

  nextExamPage() {
    if (this.currentIdx < this.activeQuestions.length - 1) {
      this.currentIdx++;
      this.renderExamPage();
    } else {
      this.confirmSubmitExam();
    }
  },

  startGlobalExamTimer() {
    if (this.globalTimer) clearInterval(this.globalTimer);
    
    const updateClock = () => {
      let m = Math.floor(this.timeLeft / 60);
      let s = this.timeLeft % 60;
      const display = document.getElementById('timeLeftDisplay');
      if (display) display.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    updateClock();

    this.globalTimer = setInterval(() => {
      this.timeLeft--;
      updateClock();

      if (this.timeLeft <= 0) {
        clearInterval(this.globalTimer);
        alert('Waktu pengerjaan habis! Jawaban kamu otomatis dikirim.');
        this.finishQuiz();
      }
    }, 1000);
  },

  confirmSubmitExam() {
    let answeredCount = Object.keys(this.userAnswers).length;
    let total = this.activeQuestions.length;
    let unans = total - answeredCount;

    let msg = `Kamu telah menjawab ${answeredCount} dari ${total} soal.`;
    if (unans > 0) msg += `\nMasih ada ${unans} soal yang belum diisi.`;
    msg += `\nYakin ingin mengumpulkan sekarang?`;

    if (confirm(msg)) {
      this.finishQuiz();
    }
  },

  async finishQuiz() {
    if (this.questionTimer) clearInterval(this.questionTimer);
    if (this.globalTimer) clearInterval(this.globalTimer);
    document.getElementById('quizPlayArea').classList.add('hidden');

    let correctCount = 0;
    let wrongCount = 0;
    
    this.activeQuestions.forEach(q => {
      if (this.userAnswers[q.id] && String(this.userAnswers[q.id]).trim().toUpperCase() === String(q.correctKey).trim().toUpperCase()) {
        correctCount++;
      } else {
        wrongCount++;
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
          correctCount: correctCount,
          wrongCount: wrongCount,
          category: this.activeCategory
        })
      });
    } catch (e) {}

    const podiumArea = document.getElementById('quizPodiumArea');
    const scoreDisplay = document.getElementById('finalScoreDisplay');
    if (podiumArea) podiumArea.classList.remove('hidden');
    if (scoreDisplay) scoreDisplay.innerText = finalScore;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  QuizClient.init();
});
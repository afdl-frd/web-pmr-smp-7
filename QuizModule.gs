/**
 * SIAMO PMR - QuizModule.gs (Versi Indeks Kolom Absolut - Anti Gagal Baca Sheet)
 */

function getQuizListApi(ss) {
  const sheet = getOrCreateSheet(ss, "Quizzes");
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  let data = [];
  // Kolom Spreadsheet Quizzes:
  // [0] id, [1] title, [2] category, [3] duration, [4] maxScore, [5] shuffle, [6] displayMode, [7] showAnswer, [8] status
  for (let i = 1; i < rows.length; i++) {
    let row = rows[i];
    if (!row[0]) continue; // Lewati jika ID kosong
    
    let quizId = String(row[0]).trim();
    let title = String(row[1] || "Tanpa Judul");
    let category = String(row[2] || "").trim().toLowerCase();
    let duration = Number(row[3] || 30);
    let maxScore = Number(row[4] || 100);
    let status = String(row[8] || "WAITING").trim().toUpperCase();
    
    // Masukkan jika bukan FINISHED
    if (status !== "FINISHED") {
      data.push({
        id: quizId,
        title: title,
        category: category,
        duration: duration,
        maxScore: maxScore,
        status: status
      });
    }
  }
  return data;
}

function getQuizDetailApi(ss, quizId) {
  const quesSheet = getOrCreateSheet(ss, "QuizQuestions");
  const rows = quesSheet.getDataRange().getValues();
  if (rows.length <= 1) return { questions: [] };

  let questions = [];
  // Kolom QuizQuestions:
  // [0] id, [1] quizId, [2] questionText, [3] image, [4] optA, [5] optB, [6] optC, [7] optD, [8] correctKey, [9] type
  for (let i = 1; i < rows.length; i++) {
    let row = rows[i];
    if (String(row[1]).trim() === String(quizId).trim()) {
      questions.push({
        id: String(row[0] || Math.random()),
        questionText: String(row[2] || ""),
        image: String(row[3] || ""),
        optA: String(row[4] || ""),
        optB: String(row[5] || ""),
        optC: String(row[6] || ""),
        optD: String(row[7] || ""),
        correctKey: String(row[8] || "A")
      });
    }
  }
  return { questions };
}

function createQuizApi(ss, data) {
  const qSheet = getOrCreateSheet(ss, "Quizzes");
  if (qSheet.getLastRow() === 0) {
    qSheet.appendRow(["id", "title", "category", "duration", "maxScore", "shuffle", "displayMode", "showAnswer", "status"]);
  }
  
  const quizId = Date.now();
  const category = String(data.category || "sukasuka").trim().toLowerCase();
  const initialStatus = category === "sukasuka" ? "WAITING" : "ACTIVE";
  
  qSheet.appendRow([
    String(quizId), 
    data.title, 
    category, 
    data.duration || 30, 
    data.maxScore || 100, 
    "FALSE", 
    "scroll", 
    "TRUE",
    initialStatus
  ]);

  if (data.questions && data.questions.length > 0) {
    const quesSheet = getOrCreateSheet(ss, "QuizQuestions");
    if (quesSheet.getLastRow() === 0) {
      quesSheet.appendRow(["id", "quizId", "questionText", "image", "optA", "optB", "optC", "optD", "correctKey", "type"]);
    }
    data.questions.forEach(q => {
      quesSheet.appendRow([
        String(Date.now() + Math.random()), 
        String(quizId), 
        q.text || "", 
        q.image || "", 
        q.optA || "", 
        q.optB || "", 
        q.optC || "", 
        q.optD || "", 
        q.correct || "A", 
        "mc"
      ]);
    });
  }
  SpreadsheetApp.flush();
  return { status: "success", message: "Room berhasil dibuat!", quizId: quizId };
}

function joinQuizRoomApi(ss, data) {
  const sheet = getOrCreateSheet(ss, "QuizParticipants");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "quizId", "memberEmail", "memberName", "status"]);
  }
  
  const rows = sheet.getDataRange().getValues();
  // Kolom QuizParticipants: [0] id, [1] quizId, [2] memberEmail, [3] memberName, [4] status
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim() === String(data.quizId).trim() &&
        String(rows[i][2]).trim().toLowerCase() === String(data.email).trim().toLowerCase()) {
      return { status: "success" };
    }
  }

  sheet.appendRow([String(Date.now()), String(data.quizId), data.email, data.name, "JOINED"]);
  SpreadsheetApp.flush();
  return { status: "success" };
}

function getRoomStatusApi(ss, quizId) {
  const qSheet = getOrCreateSheet(ss, "Quizzes");
  const rows = qSheet.getDataRange().getValues();
  let quizStatus = "WAITING";
  
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(quizId).trim()) {
      quizStatus = String(rows[i][8] || "WAITING").trim().toUpperCase();
      break;
    }
  }

  const pSheet = getOrCreateSheet(ss, "QuizParticipants");
  const pRows = pSheet.getDataRange().getValues();
  let participants = [];
  
  for (let i = 1; i < pRows.length; i++) {
    if (String(pRows[i][1]).trim() === String(quizId).trim()) {
      participants.push({
        email: String(pRows[i][2] || ""),
        name: String(pRows[i][3] || "Siswa")
      });
    }
  }

  return { status: quizStatus, participants: participants };
}

function startQuizRoomApi(ss, quizId) {
  const qSheet = getOrCreateSheet(ss, "Quizzes");
  const rows = qSheet.getDataRange().getValues();
  
  for (let i = 2; i <= rows.length; i++) {
    if (String(qSheet.getRange(i, 1).getValue()).trim() === String(quizId).trim()) {
      qSheet.getRange(i, 9).setValue("STARTED"); // Kolom 9 adalah status
      break;
    }
  }
  SpreadsheetApp.flush();
  return { status: "success" };
}

function finishQuizRoomApi(ss, quizId) {
  const qSheet = getOrCreateSheet(ss, "Quizzes");
  const rows = qSheet.getDataRange().getValues();
  
  for (let i = 2; i <= rows.length; i++) {
    if (String(qSheet.getRange(i, 1).getValue()).trim() === String(quizId).trim()) {
      qSheet.getRange(i, 9).setValue("FINISHED"); // Kolom 9 adalah status
      break;
    }
  }
  SpreadsheetApp.flush();
  return { status: "success" };
}

function submitQuizResultApi(ss, data) {
  const sheet = getOrCreateSheet(ss, "QuizSubmissions");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "quizId", "memberEmail", "memberName", "score", "correctCount", "wrongCount", "timestamp", "category"]);
  }
  
  sheet.appendRow([
    String(Date.now()), 
    String(data.quizId), 
    data.email, 
    data.name, 
    Number(data.score || 0), 
    Number(data.correctCount || 0),
    Number(data.wrongCount || 0),
    new Date().toLocaleString(), 
    String(data.category || "sukasuka")
  ]);
  
  SpreadsheetApp.flush();
  return { status: "success", score: data.score };
}

function getQuizSubmissionsApi(ss, quizId) {
  const sheet = getOrCreateSheet(ss, "QuizSubmissions");
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  let list = [];
  // Kolom QuizSubmissions: [0] id, [1] quizId, [2] memberEmail, [3] memberName, [4] score, [5] correctCount, [6] wrongCount, [7] timestamp, [8] category
  for (let i = 1; i < rows.length; i++) {
    let row = rows[i];
    if (String(row[1]).trim() === String(quizId).trim()) {
      list.push({
        memberName: String(row[3] || "Siswa"),
        memberEmail: String(row[2] || ""),
        score: Number(row[4] || 0),
        correctCount: Number(row[5] || 0),
        wrongCount: Number(row[6] || 0),
        timestamp: String(row[7] || "")
      });
    }
  }
  return list;
}
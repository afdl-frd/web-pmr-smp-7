/**
 * SIAMO PMR - QuizModule.gs (Sinkronisasi Room & Selesaikan Room)
 */

function getQuizListApi(ss) {
  const sheet = getOrCreateSheet(ss, "Quizzes");
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  let data = [];
  for (let i = 1; i < rows.length; i++) {
    let obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = rows[i][j];
    // Hanya tampilkan room yang belum berstatus FINISHED
    if (String(obj.status || "").toUpperCase() !== "FINISHED") {
      data.push(obj);
    }
  }
  return data;
}

function getQuizDetailApi(ss, quizId) {
  const quesSheet = getOrCreateSheet(ss, "QuizQuestions");
  const rows = quesSheet.getDataRange().getValues();
  if (rows.length <= 1) return { questions: [] };

  const headers = rows[0];
  let questions = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][headers.indexOf("quizId")]) === String(quizId)) {
      let obj = {};
      for (let j = 0; j < headers.length; j++) obj[headers[j]] = rows[i][j];
      questions.push(obj);
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
  qSheet.appendRow([
    quizId, 
    data.title, 
    data.category, 
    data.duration || 30, 
    data.maxScore || 100, 
    "FALSE", 
    "scroll", 
    "TRUE",
    data.category === "sukasuka" ? "WAITING" : "ACTIVE"
  ]);

  if (data.questions && data.questions.length > 0) {
    const quesSheet = getOrCreateSheet(ss, "QuizQuestions");
    if (quesSheet.getLastRow() === 0) {
      quesSheet.appendRow(["id", "quizId", "questionText", "image", "optA", "optB", "optC", "optD", "correctKey", "type"]);
    }
    data.questions.forEach(q => {
      quesSheet.appendRow([
        Date.now() + Math.random(), 
        quizId, 
        q.text || "", 
        q.image || "", 
        q.optA || "", 
        q.optB || "", 
        q.optC || "", 
        q.optD || "", 
        q.correct || "", 
        "mc"
      ]);
    });
  }
  SpreadsheetApp.flush();
  return { status: "success", message: "Kuis berhasil dibuat!", quizId: quizId };
}

function joinQuizRoomApi(ss, data) {
  const sheet = getOrCreateSheet(ss, "QuizParticipants");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "quizId", "memberEmail", "memberName", "status"]);
  }
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][headers.indexOf("quizId")]) === String(data.quizId) &&
        String(rows[i][headers.indexOf("memberEmail")]).toLowerCase() === String(data.email).toLowerCase()) {
      return { status: "success" };
    }
  }

  sheet.appendRow([Date.now(), data.quizId, data.email, data.name, "JOINED"]);
  SpreadsheetApp.flush();
  return { status: "success" };
}

function getRoomStatusApi(ss, quizId) {
  const qSheet = getOrCreateSheet(ss, "Quizzes");
  const rows = qSheet.getDataRange().getValues();
  const headers = rows[0];
  let quizStatus = "ACTIVE";
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][headers.indexOf("id")]) === String(quizId)) {
      quizStatus = rows[i][headers.indexOf("status")] || "ACTIVE";
      break;
    }
  }

  const pSheet = getOrCreateSheet(ss, "QuizParticipants");
  const pRows = pSheet.getDataRange().getValues();
  if (pRows.length <= 1) return { status: quizStatus, participants: [] };
  
  const pHeaders = pRows[0];
  let participants = [];
  for (let i = 1; i < pRows.length; i++) {
    if (String(pRows[i][pHeaders.indexOf("quizId")]) === String(quizId)) {
      participants.push({
        email: pRows[i][pHeaders.indexOf("memberEmail")],
        name: pRows[i][pHeaders.indexOf("memberName")]
      });
    }
  }

  return { status: quizStatus, participants: participants };
}

function startQuizRoomApi(ss, quizId) {
  const qSheet = getOrCreateSheet(ss, "Quizzes");
  const rows = qSheet.getDataRange().getValues();
  const headers = rows[0];
  for (let i = 2; i <= rows.length; i++) {
    if (String(qSheet.getRange(i, headers.indexOf("id") + 1).getValue()) === String(quizId)) {
      qSheet.getRange(i, headers.indexOf("status") + 1).setValue("STARTED");
      break;
    }
  }
  SpreadsheetApp.flush();
  return { status: "success" };
}

function finishQuizRoomApi(ss, quizId) {
  const qSheet = getOrCreateSheet(ss, "Quizzes");
  const rows = qSheet.getDataRange().getValues();
  const headers = rows[0];
  for (let i = 2; i <= rows.length; i++) {
    if (String(qSheet.getRange(i, headers.indexOf("id") + 1).getValue()) === String(quizId)) {
      qSheet.getRange(i, headers.indexOf("status") + 1).setValue("FINISHED");
      break;
    }
  }
  SpreadsheetApp.flush();
  return { status: "success" };
}

function submitQuizResultApi(ss, data) {
  const sheet = getOrCreateSheet(ss, "QuizSubmissions");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "quizId", "memberEmail", "memberName", "score", "timestamp", "category"]);
  }
  sheet.appendRow([
    Date.now(), 
    data.quizId, 
    data.email, 
    data.name, 
    data.score, 
    new Date().toLocaleString(), 
    data.category
  ]);
  
  if (data.category !== "sukasuka" && data.email) {
    const mSheet = getOrCreateSheet(ss, "Members");
    const mRows = mSheet.getDataRange().getValues();
    const mHeaders = mRows[0];
    const emailIdx = mHeaders.indexOf("email") + 1;
    const skorKuisIdx = mHeaders.indexOf("skorKuis") + 1;

    for (let i = 2; i <= mRows.length; i++) {
      if (String(mSheet.getRange(i, emailIdx).getValue()).trim().toLowerCase() === String(data.email).trim().toLowerCase()) {
        let currentSkor = parseInt(mSheet.getRange(i, skorKuisIdx).getValue()) || 0;
        mSheet.getRange(i, skorKuisIdx).setValue(currentSkor + parseInt(data.score));
        break;
      }
    }
  }

  SpreadsheetApp.flush();
  return { status: "success", score: data.score };
}

function getQuizSubmissionsApi(ss, quizId) {
  const sheet = getOrCreateSheet(ss, "QuizSubmissions");
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  const headers = rows[0];
  let list = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][headers.indexOf("quizId")]) === String(quizId)) {
      let obj = {};
      for (let j = 0; j < headers.length; j++) obj[headers[j]] = rows[i][j];
      list.push(obj);
    }
  }
  return list;
}
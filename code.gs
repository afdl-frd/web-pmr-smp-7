/**
 * SIAMO PMR - BACKEND UTAMA & KUIS TERPADU (Code.gs)
 */

const SPREADSHEET_ID = "1e4zbVkN-sTRS2727p95Lxyt0mSHtD8CCI30eW0LqoTE";

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function doGet(e) {
  const action = e.parameter ? e.parameter.action : "";
  let result = {};

  try {
    const ss = getSpreadsheet();

    if (action === "getPublicData") {
      result = {
        status: "success",
        hero: getConfigData(ss, "Config_Hero"),
        schedule: getConfigData(ss, "Config_Schedule"),
        links: getConfigData(ss, "Config_Links"),
        stats: getConfigData(ss, "Config_Stats"),
        contacts: getTableData(ss, "Contacts"),
        docs: getTableData(ss, "Documentation"),
        activities: getTableData(ss, "Activities"),
        books: getTableData(ss, "Books"),
        members: getApprovedMembers(ss)
      };
    } else if (action === "getAllMembers") {
      result = getTableData(ss, "Members");
    } else if (action === "getActivities") {
      result = getTableData(ss, "Activities");
    } else if (action === "getBooks") {
      result = getTableData(ss, "Books");
    } else if (action === "getQuizList") {
      result = getQuizListApi(ss);
    } else if (action === "getQuizDetail") {
      result = getQuizDetailApi(ss, e.parameter.quizId);
    } else if (action === "getQuizSubmissions") {
      result = getQuizSubmissionsApi(ss, e.parameter.quizId);
    } else if (action === "getRoomStatus") {
      result = getRoomStatusApi(ss, e.parameter.quizId);
    } else {
      result = { status: "success", message: "API SIAMO PMR Running." };
    }
  } catch (error) {
    result = { status: "error", message: error.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result = {};
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss = getSpreadsheet();

    if (action === "register") {
      result = registerMember(ss, data);
    } else if (action === "updateMemberStatus") {
      result = updateMemberStatus(ss, data.id, data.status);
    } else if (action === "updateMemberDetails") {
      result = updateMemberDetails(ss, data);
    } else if (action === "deleteMember") {
      result = deleteTableRow(ss, "Members", data.id);
    } else if (action === "saveHero") {
      result = saveConfigData(ss, "Config_Hero", { title: data.title, desc: data.desc });
    } else if (action === "saveSchedule") {
      result = saveConfigData(ss, "Config_Schedule", { time: data.time, loc: data.loc });
    } else if (action === "saveStats") {
      result = saveConfigData(ss, "Config_Stats", { totalMembers: data.totalMembers, currentBatch: data.currentBatch });
    } else if (action === "addActivity") {
      result = addTableRow(ss, "Activities", [Date.now(), data.title, data.date, data.desc, data.quota, data.type, ""]);
    } else if (action === "deleteActivity") {
      result = deleteTableRow(ss, "Activities", data.id);
    } else if (action === "registerActivity") {
      result = registerActivityParticipant(ss, data.activityId, data.memberName);
    } else if (action === "addBook") {
      result = addTableRow(ss, "Books", [Date.now(), data.title, data.category, data.url]);
    } else if (action === "deleteBook") {
      result = deleteTableRow(ss, "Books", data.id);
    } else if (action === "createQuiz") {
      result = createQuizApi(ss, data);
    } else if (action === "joinQuizRoom") {
      result = joinQuizRoomApi(ss, data);
    } else if (action === "startQuizRoom") {
      result = startQuizRoomApi(ss, data.quizId || data.id);
    } else if (action === "finishQuizRoom") {
      result = finishQuizRoomApi(ss, data.quizId || data.id);
    } else if (action === "deleteQuizRoom") {
      result = deleteQuizRoomApi(ss, data.quizId || data.id);
    } else if (action === "checkStudentExamAccess") {
      result = checkStudentExamAccessApi(ss, data);
    } else if (action === "submitQuizResult") {
      result = submitQuizResultApi(ss, data);
    } else {
      result = { status: "error", message: "Aksi tidak dikenali." };
    }
  } catch (error) {
    result = { status: "error", message: error.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- HELPER FUNCTIONS ---
function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  return sheet;
}

function ensureMemberHeaders(sheet) {
  const requiredHeaders = [
    "id", "nama", "email", "password", "nik", "tempatLahir", "tglLahir",
    "sekolah", "angkatan", "jabatan", "tingkatan", "namaOrtu", "noOrtu",
    "foto", "status", "hadir", "izin", "alpha", "skorKuis", "skorGame", "skorLain"
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(requiredHeaders);
    return requiredHeaders;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  requiredHeaders.forEach(h => {
    if (!currentHeaders.includes(h)) {
      currentHeaders.push(h);
      sheet.getRange(1, currentHeaders.length).setValue(h);
    }
  });
  return currentHeaders;
}

function getConfigData(ss, sheetName) {
  const sheet = getOrCreateSheet(ss, sheetName);
  const rows = sheet.getDataRange().getValues();
  let data = {};
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0]) data[rows[i][0]] = rows[i][1];
  }
  return data;
}

function saveConfigData(ss, sheetName, dataObj) {
  const sheet = getOrCreateSheet(ss, sheetName);
  sheet.clear();
  let rows = [];
  for (let key in dataObj) rows.push([key, dataObj[key]]);
  if (rows.length > 0) sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  SpreadsheetApp.flush();
  return { status: "success" };
}

function getTableData(ss, sheetName) {
  const sheet = getOrCreateSheet(ss, sheetName);
  if (sheetName === "Members") ensureMemberHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  let data = [];
  for (let i = 1; i < rows.length; i++) {
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j];
    }
    data.push(obj);
  }
  return data;
}

function addTableRow(ss, sheetName, values) {
  const sheet = getOrCreateSheet(ss, sheetName);
  sheet.appendRow(values);
  SpreadsheetApp.flush();
  return { status: "success" };
}

function deleteTableRow(ss, sheetName, id) {
  const sheet = getOrCreateSheet(ss, sheetName);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return { status: "success" };
    }
  }
  return { status: "error", message: "Data tidak ditemukan." };
}

function getApprovedMembers(ss) {
  return getTableData(ss, "Members").filter(m => String(m.status).trim().toUpperCase() === "APPROVED");
}

function registerMember(ss, data) {
  const sheet = getOrCreateSheet(ss, "Members");
  const headers = ensureMemberHeaders(sheet);
  const id = Date.now();
  const rowMap = {
    id: id, nama: data.nama || "", email: data.email || "", password: data.password || "",
    nik: data.nik || "", tempatLahir: data.tempatLahir || "", tglLahir: data.tglLahir || "",
    sekolah: data.sekolah || "SMPN 7 Pontianak", angkatan: data.angkatan || "",
    jabatan: "Anggota", tingkatan: data.tingkatan || "Mula", namaOrtu: data.namaOrtu || "",
    noOrtu: data.noOrtu || "", foto: data.foto || "", status: "PENDING",
    hadir: 0, izin: 0, alpha: 0, skorKuis: 0, skorGame: 0, skorLain: 0
  };
  sheet.appendRow(headers.map(h => rowMap[h] !== undefined ? rowMap[h] : ""));
  SpreadsheetApp.flush();
  return { status: "success", message: "Pendaftaran berhasil." };
}

function updateMemberStatus(ss, id, newStatus) {
  const sheet = getOrCreateSheet(ss, "Members");
  const headers = ensureMemberHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  for (let i = 2; i <= rows.length; i++) {
    if (String(sheet.getRange(i, headers.indexOf("id") + 1).getValue()) === String(id)) {
      sheet.getRange(i, headers.indexOf("status") + 1).setValue(newStatus);
      SpreadsheetApp.flush();
      return { status: "success" };
    }
  }
  return { status: "error", message: "Member tidak ditemukan." };
}

function updateMemberDetails(ss, data) {
  const sheet = getOrCreateSheet(ss, "Members");
  const headers = ensureMemberHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  for (let i = 2; i <= rows.length; i++) {
    if (String(sheet.getRange(i, headers.indexOf("id") + 1).getValue()) === String(data.id)) {
      if (data.status !== undefined) sheet.getRange(i, headers.indexOf("status") + 1).setValue(data.status);
      if (data.jabatan !== undefined) sheet.getRange(i, headers.indexOf("jabatan") + 1).setValue(data.jabatan);
      if (data.tingkatan !== undefined) sheet.getRange(i, headers.indexOf("tingkatan") + 1).setValue(data.tingkatan);
      if (data.hadir !== undefined) sheet.getRange(i, headers.indexOf("hadir") + 1).setValue(Number(data.hadir));
      if (data.izin !== undefined) sheet.getRange(i, headers.indexOf("izin") + 1).setValue(Number(data.izin));
      if (data.alpha !== undefined) sheet.getRange(i, headers.indexOf("alpha") + 1).setValue(Number(data.alpha));
      if (data.skorLain !== undefined) sheet.getRange(i, headers.indexOf("skorLain") + 1).setValue(Number(data.skorLain));
      SpreadsheetApp.flush();
      return { status: "success" };
    }
  }
  return { status: "error", message: "Member tidak ditemukan." };
}

function registerActivityParticipant(ss, activityId, memberName) {
  const sheet = getOrCreateSheet(ss, "Activities");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  for (let i = 2; i <= rows.length; i++) {
    if (String(sheet.getRange(i, headers.indexOf("id") + 1).getValue()) === String(activityId)) {
      let partsStr = String(sheet.getRange(i, headers.indexOf("participants") + 1).getValue() || "");
      let parts = partsStr ? partsStr.split(",").filter(Boolean) : [];
      if (parts.includes(memberName)) return { status: "error", message: "Sudah terdaftar." };
      parts.push(memberName);
      sheet.getRange(i, headers.indexOf("participants") + 1).setValue(parts.join(","));
      SpreadsheetApp.flush();
      return { status: "success", message: "Berhasil mendaftar!" };
    }
  }
  return { status: "error", message: "Kegiatan tidak ditemukan." };
}
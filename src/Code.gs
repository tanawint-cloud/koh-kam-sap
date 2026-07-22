/* ================= config ================= */
/* รหัสลับสำหรับดูข้อมูลหลังบ้าน (action=admin) — ใครไม่มีรหัสนี้เปิดดูไม่ได้ */
var ADMIN_KEY = '__ใส่รหัสลับของคุณตรงนี้__';

/* ================= sheets ================= */
var LATEST_HEADERS = ['ชื่อ', 'เล่นล่าสุด', 'ความคืบหน้า', 'ดาวรวม', 'จำนวนวันที่เล่นสำเร็จ', 'คำที่เรียนไปแล้ว', 'คำที่จำได้แม่น', 'สติกเกอร์ที่ได้', 'รหัสลับ', 'ข้อมูลเต็ม (ไว้ให้ระบบกู้ ไม่ต้องอ่าน)'];
var HISTORY_HEADERS = ['วันที่', 'ชื่อ', 'เล่นสำเร็จสะสม (วัน)', 'ดาวรวม ณ วันนั้น', 'คำที่เรียนไปแล้ว', 'คำที่จำได้แม่น'];

function getLatestSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('ล่าสุด');
  if (!sh) {
    // ใช้ sheet แรกที่มีอยู่แล้ว (ของเดิม) แทนที่จะสร้างซ้ำซ้อน
    sh = ss.getSheets()[0];
    sh.setName('ล่าสุด');
  }
  return sh;
}
function getHistorySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('ประวัติ');
  if (!sh) sh = ss.insertSheet('ประวัติ');
  return sh;
}
function ensureLatestHeader_(sh) {
  var n = LATEST_HEADERS.length;
  if (sh.getRange(1, 1).getValue() !== LATEST_HEADERS[0]) {
    // ชีตว่าง/ผิดโครงสร้าง — ตั้งหัวใหม่ทั้งแถว
    sh.clear();
    sh.getRange(1, 1, 1, n).setValues([LATEST_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    return;
  }
  // หัวมีอยู่แล้วและตรงคอลัมน์แรก — รีเฟรชป้ายหัวให้เป็นภาษาไทยล่าสุด "โดยไม่ลบข้อมูล"
  var cur = sh.getRange(1, 1, 1, n).getValues()[0];
  for (var i = 0; i < n; i++) {
    if (cur[i] !== LATEST_HEADERS[i]) {
      sh.getRange(1, 1, 1, n).setValues([LATEST_HEADERS]).setFontWeight('bold');
      break;
    }
  }
}
function ensureHistoryHeader_(sh) {
  var n = HISTORY_HEADERS.length;
  var cur = sh.getRange(1, 1, 1, n).getValues()[0];
  for (var i = 0; i < n; i++) {
    if (cur[i] !== HISTORY_HEADERS[i]) {
      sh.getRange(1, 1, 1, n).setValues([HISTORY_HEADERS]).setFontWeight('bold');
      sh.setFrozenRows(1);
      break;
    }
  }
}
/* หาแถวของผู้เล่นคนนี้ใน "ล่าสุด" ด้วยชื่อ+PIN คู่กัน คืน -1 ถ้ายังไม่เคยมี */
function findLatestRow_(sh, name, pin) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var values = sh.getRange(2, 1, last - 1, 9).getValues(); // A..I
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === name && String(values[i][8]) === String(pin)) return i + 2;
  }
  return -1;
}

function doPost(e) {
  /* กัน race: สองเครื่อง/สองคนเซฟพร้อมกันไม่ให้เกิดแถวซ้ำหรือเขียนทับกัน */
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (lockErr) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'busy' })).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    var data;
    try { data = JSON.parse(e.postData.contents); }
    catch (parseErr) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'bad' })).setMimeType(ContentService.MimeType.JSON);
    }

    var latest = getLatestSheet_(); ensureLatestHeader_(latest);
    var history = getHistorySheet_(); ensureHistoryHeader_(history);

    var rowIdx = findLatestRow_(latest, data.name, data.pin);
    var prevDaysDone = 0;
    if (rowIdx > 0) prevDaysDone = Number(latest.getRange(rowIdx, 5).getValue()) || 0;

    var stickerCount = 0;
    try { stickerCount = (JSON.parse(data.fullState || '{}').stickers || []).length; } catch (err) {}

    var rowValues = [
      data.name || '', new Date(), data.summary || '', data.stars || 0, data.daysDone || 0,
      data.wordsLearned || 0, data.mastered || 0, stickerCount, data.pin || '', data.fullState || ''
    ];
    if (rowIdx > 0) latest.getRange(rowIdx, 1, 1, rowValues.length).setValues([rowValues]);
    else latest.appendRow(rowValues);

    /* บันทึกประวัติแค่วันที่ "เล่นสำเร็จ" เพิ่มขึ้นจริง (ทำภารกิจครบ) ไม่ใช่ทุกครั้งที่ตอบคำถาม กันชีตบวม */
    if ((data.daysDone || 0) > prevDaysDone) {
      history.appendRow([new Date(), data.name || '', data.daysDone || 0, data.stars || 0, data.wordsLearned || 0, data.mastered || 0]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var action = e.parameter.action || '';

  if (action === '') {
    /* เกมย้ายไป GitHub Pages แล้ว — เวอร์ชันเก่าใน Apps Script เลิกใช้ ส่งคนที่เผลอเปิด URL นี้ไปหน้าเกมจริง */
    var GAME_URL = 'https://tanawint-cloud.github.io/koh-kam-sap/';
    return HtmlService.createHtmlOutput(
      '<!doctype html><meta charset="utf-8">' +
      '<meta http-equiv="refresh" content="0; url=' + GAME_URL + '">' +
      '<p>ย้ายไปที่ <a href="' + GAME_URL + '">' + GAME_URL + '</a> แล้วนะ</p>'
    ).setTitle('เกาะคำศัพท์');
  }

  var latest = getLatestSheet_(); ensureLatestHeader_(latest);
  var history = getHistorySheet_(); ensureHistoryHeader_(history);

  if (action === 'admin') {
    /* ต้องมีรหัสลับ ?action=admin&key=... เท่านั้น กันคนอื่นเปิดดูข้อมูล/PIN ของเด็ก */
    if (e.parameter.key !== ADMIN_KEY) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({
        latest: latest.getDataRange().getValues(),
        history: history.getDataRange().getValues()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'restore') {
    var name = e.parameter.name || '';
    var pin = String(e.parameter.pin || '');
    var rowIdx = findLatestRow_(latest, name, pin);
    if (rowIdx > 0) {
      var fullState = latest.getRange(rowIdx, 10).getValue();
      if (fullState) {
        return ContentService
          .createTextOutput(JSON.stringify({ found: true, fullState: fullState }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService
      .createTextOutput(JSON.stringify({ found: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ error: 'unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

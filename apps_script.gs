// ============================================================
// TACTICS CUP — Apps Script backend (v2: optimized)
// ============================================================
//
// PURPOSE
// Acts as a tiny web API for the Tactics Cup teacher dashboard and
// student leaderboard. Reads and writes lesson scores stored in
// the active Google Sheet.
//
// HOW IT WORKS
// - The Sheet has one tab called "Scores" with one row per lesson
//   (54 rows total: 6 classes × 9 lessons), in a deterministic order.
// - GET requests return all data as JSON (leaderboard reads this).
// - POST requests update one OR MANY lesson rows.
//
// PERFORMANCE NOTES (v2 changes)
// - Row index is computed directly from the key (no linear scan).
// - Batch updates supported via action='updateMany'.
// - Sheet handle cached per execution.
//
// ============================================================

const SHEET_NAME = 'Scores';
const NUM_COLS = 16;

const CLASSES = ['8(5A)', '8(5B)', '8(6A)', '8(6B)', '8(56A)', '8(56C)'];
const CLASS_INDEX = {};
CLASSES.forEach((c, i) => { CLASS_INDEX[c] = i; });

function rowIndexForKey(key) {
  const parts = key.split('__');
  const cls = parts[0];
  const lesson = Number(parts[1]);
  const ci = CLASS_INDEX[cls];
  if (ci === undefined) return -1;
  if (!(lesson >= 1 && lesson <= 9)) return -1;
  return 2 + (ci * 9) + (lesson - 1);
}

let _sheetCache = null;
function getSheet() {
  if (_sheetCache) return _sheetCache;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    initializeSheet(sheet);
  }
  _sheetCache = sheet;
  return sheet;
}

function initializeSheet(sheet) {
  const headers = [
    'key','class','lesson',
    'Y_played','Y_won','R_played','R_won','B_played','B_won','G_played','G_won',
    'spirit','tactical','ap1','ap2','updated_at'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1F4E79').setFontColor('#FFFFFF');
  const rows = [];
  CLASSES.forEach(cls => {
    for (let L = 1; L <= 9; L++) {
      rows.push([`${cls}__${L}`, cls, L, 0,0,0,0,0,0,0,0, '','','','','']);
    }
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
}

function buildRow(key, lesson) {
  const parts = key.split('__');
  const cls = parts[0];
  const lessonNum = Number(parts[1]);
  return [
    key, cls, lessonNum,
    lesson.teams.Y.p, lesson.teams.Y.w,
    lesson.teams.R.p, lesson.teams.R.w,
    lesson.teams.B.p, lesson.teams.B.w,
    lesson.teams.G.p, lesson.teams.G.w,
    lesson.spirit || '',
    lesson.tactical || '',
    (lesson.ap && lesson.ap[0]) || '',
    (lesson.ap && lesson.ap[1]) || '',
    new Date().toISOString(),
  ];
}

function buildEmptyRow(key) {
  const parts = key.split('__');
  const cls = parts[0];
  const lessonNum = Number(parts[1]);
  return [key, cls, lessonNum, 0,0,0,0,0,0,0,0, '','','','',''];
}

// ============================================================
// GET — return all scores
// ============================================================
function doGet(e) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse({ data: {} });

    const range = sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
    const data = {};
    range.forEach(row => {
      const key = row[0];
      if (!key) return;
      data[key] = {
        teams: {
          Y: { p: Number(row[3]) || 0, w: Number(row[4]) || 0 },
          R: { p: Number(row[5]) || 0, w: Number(row[6]) || 0 },
          B: { p: Number(row[7]) || 0, w: Number(row[8]) || 0 },
          G: { p: Number(row[9]) || 0, w: Number(row[10]) || 0 },
        },
        spirit: row[11] || null,
        tactical: row[12] || null,
        ap: [row[13], row[14]].filter(x => x),
        updated: row[15] || null,
      };
    });
    return jsonResponse({ data: data });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ============================================================
// POST — supports: update, updateMany, clear, clearAll
// ============================================================
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = getSheet();

    if (payload.action === 'update') {
      return jsonResponse(updateLesson(sheet, payload));
    }
    if (payload.action === 'updateMany') {
      return jsonResponse(updateManyLessons(sheet, payload));
    }
    if (payload.action === 'clear') {
      return jsonResponse(clearLesson(sheet, payload));
    }
    if (payload.action === 'clearAll') {
      return jsonResponse(clearAll(sheet));
    }
    return jsonResponse({ error: 'unknown action: ' + payload.action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function updateLesson(sheet, payload) {
  const rowIdx = rowIndexForKey(payload.key);
  if (rowIdx < 0) return { error: 'invalid key: ' + payload.key };
  sheet.getRange(rowIdx, 1, 1, NUM_COLS).setValues([buildRow(payload.key, payload.lesson)]);
  return { ok: true, key: payload.key };
}

function updateManyLessons(sheet, payload) {
  const items = payload.items || [];
  if (!items.length) return { ok: true, count: 0 };

  const enriched = [];
  for (const item of items) {
    const rowIdx = rowIndexForKey(item.key);
    if (rowIdx < 0) return { error: 'invalid key: ' + item.key };
    enriched.push({ rowIdx: rowIdx, row: buildRow(item.key, item.lesson) });
  }

  enriched.sort((a, b) => a.rowIdx - b.rowIdx);
  let blockStart = 0;
  for (let i = 1; i <= enriched.length; i++) {
    const isLast = i === enriched.length;
    const isContiguous = !isLast && enriched[i].rowIdx === enriched[i-1].rowIdx + 1;
    if (!isContiguous) {
      const blockSize = i - blockStart;
      const startRow = enriched[blockStart].rowIdx;
      const rows = enriched.slice(blockStart, i).map(x => x.row);
      sheet.getRange(startRow, 1, blockSize, NUM_COLS).setValues(rows);
      blockStart = i;
    }
  }
  return { ok: true, count: enriched.length };
}

function clearLesson(sheet, payload) {
  const rowIdx = rowIndexForKey(payload.key);
  if (rowIdx < 0) return { error: 'invalid key' };
  sheet.getRange(rowIdx, 1, 1, NUM_COLS).setValues([buildEmptyRow(payload.key)]);
  return { ok: true, key: payload.key };
}

function clearAll(sheet) {
  const rows = [];
  CLASSES.forEach(cls => {
    for (let L = 1; L <= 9; L++) rows.push(buildEmptyRow(`${cls}__${L}`));
  });
  sheet.getRange(2, 1, rows.length, NUM_COLS).setValues(rows);
  return { ok: true };
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setup() {
  const sheet = getSheet();
  if (sheet.getLastRow() < 2) initializeSheet(sheet);
  Logger.log('Sheet initialized with ' + (sheet.getLastRow() - 1) + ' rows.');
}

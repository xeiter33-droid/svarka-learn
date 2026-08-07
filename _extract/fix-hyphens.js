const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "js", "lms-data.js");
const w = {};
global.window = w;
eval(fs.readFileSync(file, "utf8"));
const D = w.LMS_DATA;

function fixText(s) {
  let t = String(s || "");
  let prev;

  // 1) Textbook hyphenation only: "техноло- гии" -> "технологии"
  do {
    prev = t;
    t = t.replace(/([А-Яа-яЁёA-Za-z])-\s+([а-яёa-z])/g, "$1$2");
  } while (t !== prev);

  // soft hyphen
  t = t.replace(/\u00AD/g, "");

  // 2) Normalize dash punctuation (en/em) to spaced em dash — do NOT glue words
  t = t.replace(/\s*[–—]\s*/g, " — ");

  // 3) Spaced ASCII hyphen used as dash between clauses: "дуговой - в" -> "дуговой — в"
  // Keep real compounds without spaces: "Санкт-Петербург", "какой-либо"
  t = t.replace(/([А-Яа-яЁёA-Za-z)».])\s+-\s+([А-Яа-яЁёA-Za-z«"(])/g, "$1 — $2");

  t = t.replace(/\s+([.,;:!?])/g, "$1");
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/ — — /g, " — ");
  return t;
}

let fixedLessons = 0;
for (const c of D.courses) {
  for (const l of c.lessons) {
    const before = l.html || "";
    const after = fixText(before);
    if (after !== before) {
      l.html = after;
      fixedLessons++;
    }
    if (l.title) l.title = fixText(l.title);
    if (l.quiz) {
      if (l.quiz.title) l.quiz.title = fixText(l.quiz.title);
      for (const q of l.quiz.questions) {
        q.q = fixText(q.q);
        q.options = q.options.map(fixText);
      }
    }
  }
  if (c.title) c.title = fixText(c.title);
  if (c.short) c.short = fixText(c.short);
  if (c.quiz) {
    c.quiz.title = fixText(c.quiz.title);
    for (const q of c.quiz.questions) {
      q.q = fixText(q.q);
      q.options = q.options.map(fixText);
    }
  }
}

let left = 0;
let gluedSuspects = [];
for (const c of D.courses) {
  for (const l of c.lessons) {
    const html = l.html || "";
    const m = html.match(/[А-Яа-яЁёA-Za-z]-\s+[а-яёa-z]/g);
    if (m) left += m.length;
    // detect accidental gluing: lowercase letter followed immediately by lowercase after long stem... hard
    // Check for missing space after common verb endings before next word start - sample check
    const bad = html.match(/[а-яё]{4,}(основа|в различных|ми сварки|ния металлов)/gi);
    if (bad) gluedSuspects.push({ id: l.id, bad: bad.slice(0, 3) });
  }
}

const out =
  "/* Expanded course content from Vasilyev (2011) and Maletkina (2015). */\n" +
  "window.LMS_DATA = " +
  JSON.stringify(D, null, 2) +
  ";\n";
fs.writeFileSync(file, out, "utf8");

console.log("lessons fixed:", fixedLessons);
console.log("remaining hyphen-breaks:", left);
console.log("glued suspects:", gluedSuspects.length, gluedSuspects.slice(0, 5));
console.log("--- sample ---");
console.log(D.courses[0].lessons[0].html.slice(0, 500));

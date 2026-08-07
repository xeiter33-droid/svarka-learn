const fs = require("fs");
const w = {};
global.window = w;
eval(fs.readFileSync("js/lms-data.js", "utf8"));
const D = w.LMS_DATA;

function fix(s) {
  return String(s || "")
    .replace(/(\d)\s+—\s+(\d)/g, "$1–$2")
    .replace(/(\d)\s+-\s+(\d)/g, "$1–$2");
}

for (const c of D.courses) {
  for (const l of c.lessons) {
    if (l.html) l.html = fix(l.html);
    if (l.title) l.title = fix(l.title);
    if (l.quiz) {
      if (l.quiz.title) l.quiz.title = fix(l.quiz.title);
      for (const q of l.quiz.questions) {
        q.q = fix(q.q);
        q.options = q.options.map(fix);
      }
    }
  }
  if (c.quiz) {
    c.quiz.title = fix(c.quiz.title);
    for (const q of c.quiz.questions) {
      q.q = fix(q.q);
      q.options = q.options.map(fix);
    }
  }
}

fs.writeFileSync(
  "js/lms-data.js",
  "/* Expanded course content from Vasilyev (2011) and Maletkina (2015). */\nwindow.LMS_DATA = " +
    JSON.stringify(D, null, 2) +
    ";\n"
);
const h = D.courses[2].lessons[0].html;
const i = h.indexOf("1950");
console.log(i >= 0 ? h.slice(i, i + 40) : "no 1950");

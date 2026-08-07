const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");

const root = __dirname;

// DOCX -> text
const xml = fs.readFileSync(path.join(root, "vasilyev_unzip", "word", "document.xml"), "utf8");
let text = xml
  .replace(/<w:tab\/>/g, "\t")
  .replace(/<\/w:p>/g, "\n")
  .replace(/<w:br[^/]*\/>/g, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
fs.writeFileSync(path.join(root, "vasilyev.txt"), text, "utf8");

const marker = "Знание закономерностей процессов, протекающих при сварке плавлением";
const bodyStart = text.indexOf(marker);
const body = bodyStart >= 0 ? text.slice(bodyStart) : text;
fs.writeFileSync(path.join(root, "vasilyev-body.txt"), body, "utf8");
console.log("vasilyev body", body.length);

function clean(raw) {
  return String(raw || "")
    .replace(/\r/g, "")
    .replace(/\d{10,}/g, "")
    .replace(/([А-Яа-яA-Za-z])-\n([а-яa-z])/g, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}

function take(re, maxLen = 9000) {
  const m = body.match(re);
  if (!m) return "";
  return clean(body.slice(m.index, m.index + maxLen));
}

function paras(chunk, n = 6) {
  return clean(chunk)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 45 && !/^Рис\./i.test(p) && !/^\d+$/.test(p))
    .slice(0, n);
}

function htmlFrom(chunk, n = 6) {
  return paras(chunk, n)
    .map((p) => `<p>${p}</p>`)
    .join("\n");
}

const slices = {
  intro: take(/Знание закономерностей процессов/, 8000),
  joints: take(/Сварные соединения и швы/, 9000),
  arc: take(/Природа сварочной дуги|сварочн\w* дуг/i, 7000),
  electrodes: take(/Электроды для дуговой сварки|покрытыми электродами/, 8000),
  gases: take(/Защитные газы/, 7000),
  rds: take(/ручной дуговой сварки покрытыми/, 9000),
  rds_tech: take(/Технология выполнения ручной дуговой сварки/, 9000),
  modes: take(/Параметры режима дуговой сварки|режима дуговой сварки/, 7000),
  tig: take(/неплавящимся электродом/, 8000),
  argon: take(/Аргонодуговая сварка|аргонодугов/i, 7000),
  mig: take(/механизированн\w* дугов|полуавтомат/i, 8000),
  steels: take(/низкоуглеродист|классификация стал/i, 8000),
  defects: take(/Дефекты сварных соединений/, 9000),
  stresses: take(/напряжен\w* и деформац/i, 7000),
  safety: take(/Охрана труда|противопожар/i, 6000),
};

fs.mkdirSync(path.join(root, "sections"), { recursive: true });
for (const [k, v] of Object.entries(slices)) {
  fs.writeFileSync(path.join(root, "sections", `${k}.txt`), v || "", "utf8");
  console.log(k, (v || "").length);
}

(async () => {
  const buf = fs.readFileSync(path.join(root, "steel-marking.pdf"));
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  const steel = String(result.text || "");
  fs.writeFileSync(path.join(root, "steel-marking.txt"), steel, "utf8");
  fs.writeFileSync(path.join(root, "sections", "steel.txt"), clean(steel).slice(0, 30000), "utf8");
  console.log("steel", steel.length);
  if (parser.destroy) await parser.destroy();
})();

#!/usr/bin/env node
/**
 * THE WATCH LIST — build.js
 *
 * data/ 폴더의 브랜드별 컬렉션 JSON을 합쳐 watches.json을 생성합니다.
 *
 * 사용법:
 *   node build.js          → watches.json 생성
 *   node build.js --check  → 유효성 검사만 실행 (파일 미생성)
 *   node build.js --stats  → 브랜드/컬렉션별 통계 출력
 */

const fs   = require("fs");
const path = require("path");

const DATA_DIR     = path.join(__dirname, "data");
const OUTPUT_FILE  = path.join(__dirname, "watches.json");
const META_FILE    = path.join(__dirname, "meta.json");
const CHECK_ONLY   = process.argv.includes("--check");
const STATS_ONLY   = process.argv.includes("--stats");

// ─── 새 컬렉션용 자동 색상 팔레트 ─────────────────────────────────────────────
const AUTO_PALETTE = [
  { bg: "#eee8f5", text: "#4a2a6b" },
  { bg: "#f5ece8", text: "#6b3a1a" },
  { bg: "#e8f5f0", text: "#1a5a40" },
  { bg: "#f5e8ee", text: "#6b1a3a" },
  { bg: "#e8eef5", text: "#1a3a6b" },
  { bg: "#f0f5e8", text: "#3a5a1a" },
  { bg: "#f5f0e8", text: "#5a4a28" },
  { bg: "#e8f0f5", text: "#1a4a5a" },
  { bg: "#f5e8f0", text: "#5a1a4a" },
  { bg: "#eef5e8", text: "#2a5a1a" },
  { bg: "#f0e8f5", text: "#3a1a6b" },
  { bg: "#e8f5e8", text: "#1a5a1a" },
];

// ─── 필수 필드 정의 ────────────────────────────────────────────────────────────
// specs_complete:false 모델은 기본 필드만 검사
const REQUIRED_FIELDS_BASIC = [
  "brand", "collection", "collection_kr", "reference", "name", "name_kr",
  "gender", "price_krw", "price_confirmed", "source"
];
const REQUIRED_FIELDS_FULL = [
  ...REQUIRED_FIELDS_BASIC,
  "case", "movement", "dial", "strap",
  "availability", "certification", "limited",
  "year_introduced", "resale_krw_est"
];
const REQUIRED_CASE   = ["material", "diameter_mm", "thickness_mm", "water_resistance_m", "glass", "caseback"];
const REQUIRED_MOV    = ["type", "caliber", "power_reserve_hours", "frequency_vph", "jewels", "functions"];
const REQUIRED_DIAL   = ["color", "indexes"];
const REQUIRED_STRAP  = ["type", "material", "clasp"];

const VALID_AVAILABILITY = ["easy", "medium", "hard"];
const VALID_VERDICT_OVERALL = [
  "Definitive", "Iconic", "Versatile", "Collector's Pick",
  "Classic", "Challenger", "Specialist", "Emerging"
];
const VALID_GENDER = ["Men", "Women", "Men/Women", "Unisex"];

// ─── 유효성 검사 ───────────────────────────────────────────────────────────────
function validate(model, file, index) {
  const errors = [];
  const loc = `[${file} #${index + 1} "${model.name || "?"}"]`;

  // specs_complete:false 이면 기본 필드만, 기본값은 full 검사
  const specsComplete = model.specs_complete !== false;
  const requiredFields = specsComplete ? REQUIRED_FIELDS_FULL : REQUIRED_FIELDS_BASIC;

  // 필수 필드
  for (const f of requiredFields) {
    // price_krw는 null 허용 (가격 문의/POA)
    if (f === "price_krw") {
      if (model[f] === undefined || model[f] === "") {
        errors.push(`${loc} 필수 필드 누락: "${f}"`);
      }
    } else if (model[f] === undefined || model[f] === null || model[f] === "") {
      errors.push(`${loc} 필수 필드 누락: "${f}"`);
    }
  }

  // 중첩 필드 (specs_complete:false 이면 건너뜀)
  if (specsComplete) {
    for (const f of REQUIRED_CASE)  if (!model.case?.[f]     && model.case?.[f]  !== 0) errors.push(`${loc} case.${f} 누락`);
    for (const f of REQUIRED_MOV)   if (!model.movement?.[f] && model.movement?.[f] !== 0) errors.push(`${loc} movement.${f} 누락`);
    for (const f of REQUIRED_DIAL)  if (!model.dial?.[f])    errors.push(`${loc} dial.${f} 누락`);
    for (const f of REQUIRED_STRAP) if (!model.strap?.[f])   errors.push(`${loc} strap.${f} 누락`);
  }

  // 값 범위 검사
  if (model.availability && !VALID_AVAILABILITY.includes(model.availability)) {
    errors.push(`${loc} availability 값 오류: "${model.availability}" (허용: easy/medium/hard)`);
  }
  if (model.gender && !VALID_GENDER.includes(model.gender)) {
    errors.push(`${loc} gender 값 오류: "${model.gender}"`);
  }
  if (model.verdict?.overall && !VALID_VERDICT_OVERALL.includes(model.verdict.overall)) {
    errors.push(`${loc} verdict.overall 값 오류: "${model.verdict.overall}"`);
  }
  if (model.price_krw && (typeof model.price_krw !== "number" || model.price_krw <= 0)) {
    errors.push(`${loc} price_krw는 양수 숫자여야 합니다`);
  }
  // price_confirmed:true 이면 price_confirmed_date 필수 (형식: "YYYY.MM.DD")
  if (model.price_confirmed === true) {
    if (!model.price_confirmed_date) {
      errors.push(`${loc} price_confirmed_date 누락 (price_confirmed:true 모델은 필수)`);
    } else if (!/^\d{4}\.\d{2}\.\d{2}$/.test(model.price_confirmed_date)) {
      errors.push(`${loc} price_confirmed_date 형식 오류: "${model.price_confirmed_date}" (형식: YYYY.MM.DD)`);
    }
  }
  if (model.case?.diameter_mm && (model.case.diameter_mm < 20 || model.case.diameter_mm > 60)) {
    errors.push(`${loc} case.diameter_mm 범위 이상: ${model.case.diameter_mm}`);
  }

  return errors;
}

// ─── 메인 빌드 ─────────────────────────────────────────────────────────────────
function build() {
  const all        = [];
  const statRows   = [];
  const meta       = { brands: [], collections: {} };
  let   totalErrors = 0;
  let   paletteIdx  = 0;

  // data/ 아래 브랜드 폴더 순회 (알파벳 순)
  const brandDirs = fs.readdirSync(DATA_DIR)
    .filter(d => fs.statSync(path.join(DATA_DIR, d)).isDirectory())
    .sort();

  for (const brandDir of brandDirs) {
    const brandPath = path.join(DATA_DIR, brandDir);
    const brandMetaPath = path.join(brandPath, "_brand.json");

    // _brand.json 읽기
    let brandMeta = {};
    if (fs.existsSync(brandMetaPath)) {
      brandMeta = JSON.parse(fs.readFileSync(brandMetaPath, "utf8"));
    } else {
      console.warn(`⚠  _brand.json 없음: ${brandDir}/`);
    }

    // meta.brands에 추가
    meta.brands.push({
      key: brandMeta.brand || brandDir,
      full: brandMeta.brand_full || brandMeta.brand || brandDir,
      founded: brandMeta.founded || null,
      url: brandMeta.official_url || null
    });

    // 컬렉션 색상 메타 수집
    if (brandMeta.collections) {
      for (const [colKey, colInfo] of Object.entries(brandMeta.collections)) {
        const hasColor = colInfo.bg && colInfo.text;
        const fallback = AUTO_PALETTE[paletteIdx % AUTO_PALETTE.length];
        meta.collections[colKey] = {
          kr:   colInfo.collection_kr || colKey,
          bg:   hasColor ? colInfo.bg   : fallback.bg,
          text: hasColor ? colInfo.text : fallback.text
        };
        if (!hasColor) paletteIdx++;
      }
    }

    // 컬렉션 파일 순회 (_brand.json 제외, 알파벳 순)
    const collectionFiles = fs.readdirSync(brandPath)
      .filter(f => f.endsWith(".json") && f !== "_brand.json")
      .sort();

    for (const colFile of collectionFiles) {
      const colPath = path.join(brandPath, colFile);
      const colName = colFile.replace(".json", "");
      let models;

      try {
        models = JSON.parse(fs.readFileSync(colPath, "utf8"));
      } catch (e) {
        console.error(`✗  JSON 파싱 실패: ${brandDir}/${colFile} — ${e.message}`);
        totalErrors++;
        continue;
      }

      if (!Array.isArray(models)) {
        console.error(`✗  배열이 아님: ${brandDir}/${colFile}`);
        totalErrors++;
        continue;
      }

      // 각 모델 검증 + id 부여
      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        const errs  = validate(model, `${brandDir}/${colFile}`, i);

        if (errs.length > 0) {
          errs.forEach(e => console.error("✗  " + e));
          totalErrors += errs.length;
        }

        // id 자동 부여 (1-based, 전체 순서)
        all.push({ id: all.length + 1, ...model });
      }

      statRows.push({ brand: brandMeta.brand || brandDir, collection: colName, count: models.length });
    }
  }

  // 글로벌 중복 reference 검사 (어느 파일인지 함께 출력)
  const refMap = {};
  for (const w of all) {
    if (!refMap[w.reference]) refMap[w.reference] = [];
    refMap[w.reference].push(`${w.brand}/${w.collection}`);
  }
  for (const [ref, locations] of Object.entries(refMap)) {
    if (locations.length > 1) {
      console.error(`✗  중복 reference: ${ref} → ${locations.join(", ")}`);
      totalErrors++;
    }
  }

  // ─── 통계 출력 ──────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  THE WATCH LIST — 빌드 결과");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let lastBrand = "";
  let brandTotal = 0;
  for (const row of statRows) {
    if (row.brand !== lastBrand) {
      if (lastBrand) console.log(`  ${"─".repeat(36)}  합계: ${brandTotal}개`);
      console.log(`\n  📦 ${row.brand}`);
      lastBrand = row.brand;
      brandTotal = 0;
    }
    console.log(`     └ ${row.collection.padEnd(22)} ${String(row.count).padStart(3)}개`);
    brandTotal += row.count;
  }
  if (lastBrand) console.log(`  ${"─".repeat(36)}  합계: ${brandTotal}개`);

  console.log(`\n  전체 모델 수: ${all.length}개`);

  if (totalErrors > 0) {
    console.log(`\n  ✗  유효성 오류 ${totalErrors}건 — watches.json 미생성\n`);
    process.exit(1);
  }

  if (CHECK_ONLY || STATS_ONLY) {
    console.log("\n  ✓  유효성 검사 통과\n");
    return;
  }

  // ─── watches.json + meta.json 출력 ────────────────────────────────────────
  // meta.json에 last_confirmed_date 추가 (가장 최근 price_confirmed_date)
  const confirmedDates = all
    .filter(w => w.price_confirmed_date)
    .map(w => w.price_confirmed_date)
    .sort();
  meta.last_confirmed_date = confirmedDates.length ? confirmedDates[confirmedDates.length - 1] : null;

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(all, null, 2));
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
  console.log(`\n  ✓  watches.json 생성 완료 (${all.length}개 모델, id 1–${all.length})`);
  console.log(`  ✓  meta.json 생성 완료 (${meta.brands.length}개 브랜드, ${Object.keys(meta.collections).length}개 컬렉션)\n`);
}

build();

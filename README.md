# THE WATCH LIST — 파일 구조 & 브랜드 추가 가이드

## 파일 구조

```
thewatchlist/
├── data/                        ← ✏️  여기만 편집하면 됨
│   ├── iwc/
│   │   ├── _brand.json          ← 브랜드 메타 (이름, URL, 컬렉션 목록)
│   │   ├── portugieser.json     ← 컬렉션별 모델 배열
│   │   ├── pilot.json
│   │   ├── portofino.json
│   │   ├── ingenieur.json
│   │   └── aquatimer.json
│   ├── blancpain/
│   │   ├── _brand.json
│   │   ├── fifty-fathoms.json
│   │   ├── villeret.json
│   │   ├── l-evolution.json
│   │   └── woman.json
│   └── jaeger-lecoultre/
│       ├── _brand.json
│       ├── reverso.json
│       ├── master.json
│       ├── polaris.json
│       └── rendezvous.json
├── build.js                     ← 빌드 스크립트 (건드리지 않아도 됨)
├── watches.json                 ← ⚙️  build.js가 자동 생성 (직접 편집 금지)
├── index.html                   ← UI
└── README.md
```

> **중요**: `watches.json`은 `build.js`의 출력물입니다. 직접 편집하지 마세요.
> 모든 데이터 편집은 `data/` 폴더 안에서 합니다.


## 로컬에서 열기

`index.html`을 브라우저에서 직접 열면 fetch()가 막혀 데이터가 로드되지 않습니다.
**반드시 로컬 서버를 통해 열어야 합니다.**

```bash
# 방법 1: Python (추천)
cd thewatchlist && python3 -m http.server 8080
# → http://localhost:8080

# 방법 2: Node.js
npx serve .
```


## 워크플로우

### 새 모델 추가

1. 해당 브랜드/컬렉션 JSON 파일에 항목 추가 (id 없이)
2. `node build.js` 실행 → 검증 + watches.json 자동 생성
3. 브라우저 새로고침

```bash
# 검증만 하고 싶을 때 (watches.json 미생성)
node build.js --check

# 통계만 볼 때
node build.js --stats
```

### 새 브랜드 추가

1. `data/브랜드폴더/` 생성
2. `_brand.json` 작성 (아래 예시 참고)
3. 컬렉션별 JSON 파일 생성
4. `index.html`의 `collectionTag()` 함수와 CSS에 컬렉션 태그 추가
5. `index.html`의 브랜드 필터 버튼 추가
6. `node build.js` 실행

### _brand.json 예시 (새 브랜드 추가 시)

```json
{
  "brand": "Rolex",
  "brand_full": "Rolex SA",
  "country": "Switzerland",
  "founded": 1905,
  "official_url": "https://www.rolex.com/ko",
  "collections": {
    "Submariner": { "collection_kr": "서브마리너", "tag_css": "tag-submariner" },
    "Datejust":   { "collection_kr": "데이트저스트","tag_css": "tag-datejust" }
  }
}
```


## 모델 스키마

`data/` 안의 컬렉션 JSON 파일은 모델 객체의 배열입니다.
`id`는 build.js가 자동 부여하므로 작성하지 않습니다.

```json
[
  {
    "brand": "Rolex",
    "collection": "Submariner",
    "collection_kr": "서브마리너",
    "reference": "126610LN",
    "name": "Submariner Date 41",
    "name_kr": "서브마리너 데이트 41",
    "gender": "Men",
    "price_krw": 15550000,
    "price_confirmed": true,
    "case": {
      "material": "Stainless Steel (Oystersteel)",
      "diameter_mm": 41,
      "thickness_mm": 12.9,
      "water_resistance_m": 300,
      "glass": "Sapphire Crystal",
      "caseback": "Solid"
    },
    "movement": {
      "type": "Automatic",
      "caliber": "3235",
      "power_reserve_hours": 70,
      "frequency_vph": 28800,
      "jewels": 31,
      "functions": ["Hours", "Minutes", "Seconds", "Date"]
    },
    "dial": {
      "color": "Black",
      "indexes": "Applied Indices (Luminous)"
    },
    "strap": {
      "type": "Bracelet",
      "material": "Oystersteel",
      "clasp": "Oysterlock"
    },
    "bracelet_option": false,
    "color_variants": ["Black"],
    "availability": "hard",
    "certification": false,
    "limited": false,
    "year_introduced": 2020,
    "resale_krw_est": 19000000,
    "source": "롤렉스 공식 한국 홈페이지 (직접 확인 · 2026.03)",
    "notes": "세라크롬 베젤 · 글라이드록 클라습",
    "verdict": {
      "overall": "Definitive",
      "spec": {
        "label": "Tool-grade",
        "comment": "..."
      },
      "heritage": {
        "label": "Iconic",
        "comment": "..."
      },
      "timelessness": {
        "label": "Enduring",
        "comment": "..."
      }
    }
  }
]
```


## 필드 허용값

| 필드 | 허용값 |
|------|--------|
| `gender` | Men / Women / Men/Women / Unisex |
| `availability` | easy / medium / hard |
| `verdict.overall` | Definitive / Iconic / Versatile / Collector's Pick / Classic / Challenger / Specialist / Emerging |
| `strap.type` | Bracelet / Leather / Rubber |


## 컬렉션 태그 색상

새 브랜드의 컬렉션 태그를 추가하려면 `index.html`의 `collectionTag()` 함수와 CSS에 추가 필요.

현재 등록된 태그:
`portugieser` / `pilot` / `portofino` / `ingenieur` / `aquatimer` /
`fiftyfathoms` / `villeret` / `levo` / `woman` /
`reverso` / `master` / `polaris` / `rendezvous`


## 현재 브랜드 & 모델 수

| 브랜드 | 컬렉션 | 모델 수 |
|--------|--------|---------|
| IWC | Portugieser, Pilot, Portofino, Ingenieur, Aquatimer | 20 |
| Blancpain | Fifty Fathoms, Villeret, L-Evolution, Woman | 10 |
| JLC | Reverso, Master, Polaris, RendezVous | 10 |
| **합계** | | **40** |

`id`는 build.js가 브랜드 폴더명 알파벳 순 → 컬렉션 파일명 알파벳 순 → 파일 내 순서로 자동 부여합니다.

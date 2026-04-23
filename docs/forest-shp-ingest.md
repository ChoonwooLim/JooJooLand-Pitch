# 산림청 SHP 자체 적재 — 멀티 프로젝트 운영 가이드

## 아키텍처 한 장 요약

```
Orbitron 호스트 (192.168.219.101)
├── /data/forest/nationwide/        ← 전국 SHP 원본 (수 GB). 여러 프로젝트 공유
│     imsang.shp/.shx/.dbf/.prj
│     sanji.shp/.shx/.dbf/.prj
│     landslide.shp/.shx/.dbf/.prj
│
└── 컨테이너들
      ├── joojooland  (DB 에 양평 BBOX 범위만 주입, 수 MB)
      ├── pyeongchang (DB 에 평창 BBOX 범위만 주입)
      └── ...
```

- **SHP 원본 = 파일시스템** (호스트 디렉토리 한 곳)
- **프로젝트 DB = 해당 BBOX 만큼만 WKB 로** 주입 (DB 에 원본 파일 저장 안 함)
- 각 컨테이너는 `/data/forest:ro` 바인드 마운트로 같은 원본을 공유
- 갱신 시 원본 1 곳만 교체 → 프로젝트별 재적재 명령 1 회씩

## 1 회 세팅 (최초 1 번)

### 1-1. FGIS 가입 + 전국 자료 신청
- https://map.forest.go.kr/ 회원가입 후 로그인
- **자료 다운로드** 메뉴 → 다음 3~4 종 "전국" 으로 신청:
  1. **임상도** (FRTP)
  2. **산지구분도** (MT_CBND 또는 산지구분)
  3. **산사태위험등급도**
  4. *(선택)* **산림입지토양도**
- 신청 사유: "투자유치용 시각화, 비영리". 승인 **1~3 영업일**
- 이메일로 온 링크에서 ZIP 다운로드 — 파일이 크니(최대 수 GB) 넉넉한 디스크/네트워크에서

### 1-2. Orbitron 호스트에 원본 배치
```bash
# 로컬 PC → Orbitron 호스트로 업로드
scp imsang_kr.zip sanji_kr.zip landslide_kr.zip stevenlim@192.168.219.101:~/shp_upload/

# Orbitron 호스트 접속
ssh stevenlim@192.168.219.101

# 디렉토리 생성 + 압축 해제
sudo mkdir -p /data/forest/nationwide
sudo chown -R $USER /data/forest
cd /data/forest/nationwide
unzip ~/shp_upload/imsang_kr.zip
unzip ~/shp_upload/sanji_kr.zip
unzip ~/shp_upload/landslide_kr.zip

# 확인
ls -la
# imsang.shp  imsang.shx  imsang.dbf  imsang.prj
# sanji.shp   sanji.shx   sanji.dbf   sanji.prj
# landslide.shp ...
```

> **파일명이 다를 때**: FGIS 가 내려주는 실제 파일명이 `FRTP_S.shp`, `MT_CBND.shp`
> 등일 수 있음. `ingest_forest_all.py` 의 `LAYER_FILENAME_CANDIDATES` 에 그대로
> 열거돼 있어 자동 매칭. 매칭 안 되면 심볼릭 링크로 연결하거나 후보에 추가.

### 1-3. 컨테이너에 원본 바인드 마운트 (프로젝트별 1 회)
Orbitron 관리 UI 에서 해당 프로젝트 컨테이너 설정에 볼륨 추가:
- Source: `/data/forest/nationwide`
- Target: `/data/forest`
- Mode: `read-only`

또는 Orbitron.yaml 에 선언 (플랫폼이 지원하는 경우):
```yaml
volumes:
  - /data/forest/nationwide:/data/forest:ro
```

### 1-4. 속성 컬럼 확인 (레이어 매핑 튜닝)
```bash
# 호스트에서
python3 -c "import pyogrio; print(pyogrio.read_info('/data/forest/nationwide/imsang.shp')['fields'])"
```
실제 컬럼명이 `backend/app/services/forest_gis.py` 의 `classify_sanji / imsang / landslide` 의
`_pick(...)` 후보와 다르면 매핑 수정 후 재배포.

## 프로젝트 생성/갱신 때마다

### .env 설정
`backend/.env` 또는 Orbitron 프로젝트 환경변수:
```env
FOREST_SHP_DIR=/data/forest           # 컨테이너 내부 마운트 경로
PROJECT_BBOX=127.50,37.30,127.85,37.60  # 프로젝트 영역 (lngMin,latMin,lngMax,latMax)
PROJECT_NAME=JooJooLand
```

### 적재 (한 명령)
```bash
# Orbitron 컨테이너 안
docker exec orbitron-joojooland-XXXX python -m backend.scripts.ingest_forest_all --truncate

# 출력 예
# [config] project=JooJooLand bbox=(127.5, 37.3, 127.85, 37.6) shp_dir=/data/forest
# [config] layers=['imsang', 'sanji', 'landslide'] truncate=True
# === imsang ← imsang.shp ===
# [read] 2341 features in bbox
# [ingest] +500 (total 500)
# ...
# === 적재 요약 ===
#   imsang     ok          inserted=2341 message=from imsang.shp
#   sanji      ok          inserted=587  message=from sanji.shp
#   landslide  ok          inserted=1120 message=from landslide.shp
```

### 확인
```bash
curl https://joojooland.twinverse.org/api/forest/status
# { "loaded_layers": { "imsang": 2341, "sanji": 587, "landslide": 1120 }, "ready": true }
```

프론트에서 `📊 토지정보` → **📐 산림 분석 (SHP 자체 계산)** 섹션에 실측 표 표시.

## 다른 프로젝트 추가할 때

다른 프로젝트(예: 가평) 생성되면:
1. 원본 SHP 는 이미 `/data/forest/nationwide/` 에 있으므로 **재다운로드 불필요**
2. 새 프로젝트 컨테이너에 `/data/forest:ro` 바인드 마운트
3. 해당 프로젝트 `.env` 의 `PROJECT_BBOX` 를 가평 좌표로 설정
4. `ingest_forest_all --truncate` 한 번 실행 → 끝

원본 갱신 주기 (FGIS 임상도 5 년 / 산지구분도 연 1 회) 도래 시:
- 원본 ZIP 새로 받아 `/data/forest/nationwide/` 갱신
- 각 프로젝트 컨테이너에서 `ingest_forest_all --truncate` 순차 실행

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `FOREST_SHP_DIR 설정되지 않음` | 환경변수 누락 | `.env` 에 `FOREST_SHP_DIR=/data/forest` 추가 |
| `후보 파일 없음` | 파일명 다름 | `LAYER_FILENAME_CANDIDATES` 에 실제 이름 추가 or 심볼릭 링크 |
| `SHP CRS 미상` | .prj 결손 | `--srid-override 5179` 추가 (한국 SHP 표준) |
| 매칭 0 건 | BBOX 범위 밖 | `PROJECT_BBOX` 재확인. 양평 예시: `127.50,37.30,127.85,37.60` |
| pyogrio import error | 의존성 미설치 | 컨테이너 재빌드 (requirements.txt 업데이트됨) |
| 메모리 부족 | SHP 한 번에 메모리 로드 | `pyogrio.read_dataframe` 에 `bbox` 가 전달돼 이미 필터됨. 여전히 크면 BBOX 좁히기 |

## 관련 파일

- `backend/scripts/ingest_forest_shp.py` — 단일 레이어 적재 (함수 + CLI)
- `backend/scripts/ingest_forest_all.py` — 프로젝트 BBOX 로 전체 레이어 일괄
- `backend/app/services/forest_gis.py` — 속성 매핑 + shapely 교집합 분석
- `backend/app/routers/forest.py` — `/api/forest/*` 엔드포인트
- `backend/app/models/forest.py` — DB 스키마
- `frontend/public/legacy-map/landinfo.js` — 토지정보 모달 프론트

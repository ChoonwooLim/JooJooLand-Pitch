# 산림청 SHP 자체 적재 — 운영 가이드

## 목적
다드림이 OpenAPI 로 제공하지 않는 **필지별 보전산지/준보전산지 면적, 임상 분포, 산사태 위험**
을 프로젝트 자체 DB 로 계산하기 위한 절차. 산림청 FGIS 에서 SHP 를 내려받아
Orbitron Postgres 에 적재 → 백엔드 `/api/forest/*` 엔드포인트로 노출.

## 한 번만 하는 준비

### 1. 산림청 FGIS 계정 + 자료 신청
- https://map.forest.go.kr/ 접속 → 우측 상단 **회원가입**
- 로그인 후 상단 **자료 다운로드** 메뉴
- 신청 대상 4 종 (프로젝트에서 쓰는 것):
  1. **임상도** — 수종·임종·경급·영급·수관밀도
  2. **산지구분도** — 보전/준보전/임업용/공익용
  3. **산사태위험등급도** — 1~5 등급
  4. *(선택)* **산림입지토양도** — 토양종류·심도
- 범위: **경기도 양평군** (지역 단위로 신청 가능)
- 신청 사유: "투자유치용 비영리 시각화" 명시
- **승인 1~3 영업일** 소요. 다운로드 링크가 이메일로 와요.
- 받은 ZIP 풀면 `.shp / .shx / .dbf / .prj` 4 개 세트 (한 레이어당).

### 2. 속성 컬럼 확인
SHP 는 레이어마다 컬럼명이 다릅니다. 받은 파일을 한 번 열어서
`classify_sanji` / `classify_imsang` 매핑을 실제 컬럼에 맞춰 수정해야 합니다.

```bash
# 파이썬 한 줄로 컬럼 확인
python -c "import pyogrio; print(pyogrio.read_info('imsang.shp')['fields'])"
```

컬럼이 예상과 다르면 `backend/app/services/forest_gis.py` 의
`classify_*` 함수의 `_pick(...)` 후보 키를 수정하세요.

## 적재 (매번)

SHP 파일을 **Orbitron 서버**에 올려서 컨테이너 안에서 실행하는 게 가장 안전.
로컬 dev 에서 돌려도 같은 스크립트가 동작하지만 속도·용량 때문에 권장 X.

### 로컬 dev (테스트 목적)
```bash
cd C:\WORK\JooJooLand
# 의존성
pip install -r backend/requirements.txt

# 임상도 적재 (양평군 BBOX)
python -m backend.scripts.ingest_forest_shp \
    --layer imsang \
    --file D:\temp\forest\imsang_yangpyeong.shp \
    --bbox 127.50,37.30,127.85,37.60 \
    --truncate

# 산지구분도
python -m backend.scripts.ingest_forest_shp \
    --layer sanji \
    --file D:\temp\forest\sanji_yangpyeong.shp \
    --bbox 127.50,37.30,127.85,37.60 \
    --truncate

# 산사태위험
python -m backend.scripts.ingest_forest_shp \
    --layer landslide \
    --file D:\temp\forest\landslide.shp \
    --bbox 127.50,37.30,127.85,37.60 \
    --truncate
```

### Orbitron 프로덕션 적재
```bash
# 1. 서버로 SHP 업로드 (scp)
scp imsang_yangpyeong.* stevenlim@192.168.219.101:~/shp_in/

# 2. 컨테이너에 바인드 마운트 or 직접 스트리밍
ssh stevenlim@192.168.219.101
docker cp ~/shp_in/imsang_yangpyeong.shp orbitron-joojooland-moXXXXXX:/tmp/
# ... .shx .dbf .prj 도 동일하게

# 3. 컨테이너 안에서 스크립트 실행
docker exec -it orbitron-joojooland-moXXXXXX python -m backend.scripts.ingest_forest_shp \
    --layer imsang --file /tmp/imsang_yangpyeong.shp \
    --bbox 127.50,37.30,127.85,37.60 --truncate
```

옵션:
- `--truncate`: 해당 layer_type 기존 데이터 삭제 후 다시 넣기 (갱신 시 사용)
- `--srid-override 5179`: `.prj` 가 깨졌을 때 수동 지정. 한국 SHP 는 대개 EPSG:5179
- `--chunk 500`: INSERT 배치 크기

## 동작 확인
```bash
# 적재 건수 확인
curl https://joojooland.twinverse.org/api/forest/status

# 응답 예:
# { "loaded_layers": { "imsang": 2341, "sanji": 587 }, "ready": true }
```

프론트 → `📊 토지정보` 버튼 열면 **📐 산림 분석 (SHP 자체 계산)** 섹션에
임상 분포 / 산지 구분 / 산사태 위험 실측 표가 뜹니다.

## 갱신 주기
FGIS 임상도는 **5년 단위 전국 갱신**, 산지구분도는 **연 1회** 업데이트.
프로젝트 성격상 **6 개월 ~ 1 년에 한 번** 재신청 → 적재만 다시 돌리면 충분.

## 트러블슈팅
| 증상 | 원인 | 해결 |
|------|------|------|
| `pyogrio.errors.DataSourceError` | .shx/.dbf 동반 파일 누락 | SHP 는 4 개 세트 전부 필요 |
| `CRS 를 파악할 수 없음` | .prj 없거나 깨짐 | `--srid-override 5179` 추가 |
| 매칭 0 건 | BBOX 잘못 | 양평군은 대략 `127.50,37.30,127.85,37.60` |
| 속성 key 다름 | SHP 버전 차이 | `forest_gis.py` 의 `_pick(...)` 후보 추가 |

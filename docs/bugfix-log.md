# 버그 수정 로그

| 날짜 | 버그 | 원인 | 수정 내용 | 관련 파일 |
|------|------|------|-----------|-----------|
| 2026-04-22 | @react-three/fiber React 19 peer 경고 | fiber v8 이 React 19 미지원 | fiber v9 + drei v10 업그레이드 | frontend/package.json |
| 2026-04-22 | Orbitron yaml JSON 파싱 에러 | 복잡한 스키마 사용 | gaongn.net 방식으로 단순화 | orbitron.yaml |
| 2026-04-22 | Orbitron 이 Orbitron.yaml 미인식 | 대문자 파일명 | orbitron.yaml 로 리네임 | orbitron.yaml |
| 2026-04-22 | Vite 8 manualChunks 형식 에러 | object 형 deprecated | function 형식으로 변경 | frontend/vite.config.js |
| 2026-04-22 | Orbitron auto-detector 가 main.py 미발견 | backend/main.py shim 부재 | backend/ 루트에 main.py shim 추가 | backend/main.py |
| 2026-04-22 | Vite 8 asset 해시가 base62 | 기존 regex 가 hex 전제 | Cache-Control 정규식을 base62 로 확장 | backend/app/main.py |
| 2026-04-22 | legacy-map 체크박스 미동작 | addEventListener 지연 부착 | 초기 로드 시 즉시 바인딩 + 0건 피드백 UI | frontend/public/legacy-map/index.html |
| 2026-04-22 | Header 가독성 저하 (투명 배경) | 스크롤 시 반투명 blur 필요 | 다크 translucent bar + 그린 accent | frontend/src/components/layout/Header.module.css |
| 2026-04-22 | Orbitron 502 Bad Gateway | PostgreSQL 기존 user 테이블에 신규 컬럼 phone/company/is_active/last_login_at 없음 | ALTER TABLE 8건 수동 적용 + `_auto_migrate()` 헬퍼 코드 추가로 재발 방지 | backend/app/main.py + Orbitron DB |

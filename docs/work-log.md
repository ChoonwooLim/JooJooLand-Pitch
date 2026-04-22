# 작업일지

이 프로젝트의 모든 세션별 작업 내역을 날짜순으로 기록합니다.
`/end` 스킬이 세션 종료 시 자동으로 append 합니다.

---

## 2026-04-22

### 작업 요약

| 카테고리 | 작업 내용 | 상태 |
|----------|----------|------|
| feat | 초기 피치 사이트 스캐폴드 (React 19 + FastAPI) | 완료 |
| feat | 지도 — VWorld/Cesium 토큰 서빙 + 인접부지 오버레이 + 5탭 GIS | 완료 |
| feat | 히어로 — three.js 우주 VFX + 다크모드 전환 (프론트 전 페이지 미러) | 완료 |
| feat | 인증 + 어드민 대시보드 설계서 + 구현 플랜 | 완료 |
| feat | 백엔드 인증 (httpOnly 쿠키 + refresh) + 14 어드민 라우터 + 신규 모델 6종 | 완료 |
| feat | Mantine v7 기반 프론트 어드민 (Login/Register/Upgrade + 14페이지) | 완료 |
| feat | 공개 DataRoom/Contact API 연동 + .env.example 정비 | 완료 |
| fix | Orbitron 빌드·캐시·쉘·yaml 다수 안정화 (22개 커밋 중 9건) | 완료 |
| fix | Postgres 기존 테이블 스키마 보정 마이그레이션 추가 + Orbitron 502 복구 | 완료 |

### 세부 내용

- 투자 피치 사이트 초기 구축: 9개 페이지 + 지도 iframe + 히어로 VFX + ko/en i18n
- 인증 스택 전면 확장: register/login/logout/refresh/forgot/reset/change-password, 4역할 권한
- 어드민 대시보드: 사용자·등업·리드·DataRoom·콘텐츠CMS·부지·AI로그·이메일·클론·스킬·플러그인·문서·운영 (14 메뉴)
- DB 변경: User/DataRoomDoc 필드 확장 + 6개 신규 테이블, `_auto_migrate()` 로 Postgres ADD COLUMN IF NOT EXISTS 자동 보정
- 이메일: Resend API 연동 + log-only fallback, Jinja2 템플릿 8종
- 배포: Orbitron 컨테이너 재기동, 스키마 수동 ALTER 8건으로 502 복구

---

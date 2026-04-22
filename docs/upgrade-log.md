# 업그레이드 로그

| 날짜 | 변경 내용 | 카테고리 | 관련 파일 |
|------|----------|---------|----------|
| 2026-04-22 | 초기 JooJooLand 투자 피치 사이트 스캐폴드 (React 19 + FastAPI + PostgreSQL) | 초기화 | frontend/ backend/ orbitron.yaml |
| 2026-04-22 | VWorld API 키를 백엔드 /api/vworld/config.js 로 서빙 | 보안/프론트 | backend/app/routers/vworld.py |
| 2026-04-22 | Cesium Ion Token 추가 + 3D 지도 대응 | 지도 | backend/app/routers/vworld.py |
| 2026-04-22 | 지도 NAV 라벨 "지도" → "사업예정부지" | UI/카피 | frontend/src/components/layout/Header.jsx, i18n/*.json |
| 2026-04-22 | 인접부지 오버레이 5종 토글 (도로/구거/하천/공공/군사) + NED getLandCharacteristics 재구성 + 전면 캐시 | 지도/성능 | frontend/public/legacy-map/ backend/app/routers/vworld.py |
| 2026-04-22 | 히어로 three.js "살아있는 우주" VFX (별 3500개 + 네뷸라 + 유성) | 시네마틱/3D | frontend/src/components/hero/CosmicVFX.jsx |
| 2026-04-22 | 프론트 전 페이지 다크모드 전환 + legacy-map GIS 5탭/다크모드 미러 | 테마/디자인 | frontend/src/styles/ + legacy-map |
| 2026-04-22 | 인증 + 어드민 대시보드 설계서 작성 (v1, 577줄) | 문서/설계 | docs/superpowers/specs/ |
| 2026-04-22 | 인증 + 어드민 구현 플랜 P1~P10 | 문서/설계 | docs/superpowers/plans/ |
| 2026-04-22 | 백엔드 인증 확장: httpOnly 쿠키 + refresh token (15m/30d) + 4역할 권한 + register/logout/refresh/forgot/reset/change | 인증/백엔드 | backend/app/core/security.py deps.py routers/auth.py |
| 2026-04-22 | 신규 DB 모델 6종 (UpgradeRequest/ContactLead/ContentBlock/AIChatLog/EmailLog/DownloadLog) + User·DataRoomDoc 필드 확장 | DB/모델 | backend/app/models/ |
| 2026-04-22 | 어드민 라우터 허브 + 11개 feature 서브 (dashboard/users/content/parcels/ai-logs/emails/clones/skills/plugins/docs/ops) | 어드민/백엔드 | backend/app/routers/admin/ |
| 2026-04-22 | upgrade/leads/dataroom 라우터 신설 — 등업 요청·리드 파이프라인 7단계·파일 업로드/인증 게이트 다운로드+로그 | 업무 로직 | backend/app/routers/ |
| 2026-04-22 | Resend 기반 이메일 서비스 + log-only fallback (Jinja2 템플릿 8종) | 이메일 | backend/app/services/email.py templates/ |
| 2026-04-22 | 초기 superadmin 시드 + ContentBlock 28개 시드 (home/investment slots) | 부트스트랩 | backend/app/main.py |
| 2026-04-22 | Mantine v7 도입 (core/hooks/form/notifications/modals/dropzone/charts) + @tabler/icons + react-markdown | 프론트 스택 | frontend/package.json frontend/src/main.jsx |
| 2026-04-22 | AuthContext + ProtectedRoute + axios 401 자동 refresh 인터셉터 | 인증/프론트 | frontend/src/features/auth/ lib/api.js |
| 2026-04-22 | 인증 페이지 5종 (Login/Register/ForgotPassword/ResetPassword/Upgrade) | 인증/UI | frontend/src/pages/ |
| 2026-04-22 | AdminLayout (AppShell 14메뉴 사이드바 + 등업 대기 배지 폴링) | 어드민/UI | frontend/src/features/admin/ |
| 2026-04-22 | 어드민 페이지 14종 (Dashboard/Users/Upgrades/Leads/DataRoom/Content/Parcels/AILogs/Emails/Clones/Skills/Plugins/Docs/Ops) | 어드민/UI | frontend/src/pages/admin/ |
| 2026-04-22 | Header 로그인 상태 드롭다운 (어드민/등업/DataRoom 바로가기) + 로그인 CTA | UI/네비 | frontend/src/components/layout/Header.jsx .module.css |
| 2026-04-22 | 공개 DataRoom 페이지 API 연동 (투자자 게이트 + 다운로드) + Contact 폼 리드 제출 | 공개 페이지 | frontend/src/pages/DataRoom.jsx Contact.jsx |
| 2026-04-22 | Postgres 자동 컬럼 보정 `_auto_migrate()` — ADD COLUMN IF NOT EXISTS 8건 자동화 | 인프라/DB | backend/app/main.py |

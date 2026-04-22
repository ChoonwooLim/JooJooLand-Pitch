# JooJooLand — Claude 작업 가이드

이 파일은 `C:\WORK\JooJooLand\` 프로젝트의 Claude Code 세션용 컨벤션을 정의한다.
전역 규칙은 `~/.claude/CLAUDE.md` + `C:\WORK\infra-docs\ai-shared-registry.md` 를 그대로 따른다.

---

## 1. 프로젝트 맥락

- **목적**: 반려동물 디지털 영혼(Pet Twinverse) 테마파크 시드 투자 유치 프리젠테이션 사이트
- **스택**: React 19 + Vite 8 / FastAPI + SQLModel / PostgreSQL (Orbitron) / OpenClaw LAN
- **설계서 (SSOT)**: `docs/superpowers/specs/2026-04-22-joojooland-pitch-site-design.md`
- **구조 템플릿**: `C:\WORK\gaongn.net` (React19+FastAPI 패턴 복제)
- **지도 원본**: `C:\WORK\JooJooPatLand` (포팅 대상)
- **AI 자산**: `C:\WORK\TwinverseAI` (npc.py / npc_agent.py / ps2_spawner.py 흡수)

## 2. 절대 원칙

### 2.1 AI는 OpenClaw LAN 경로만 (API 키 금지)
- 모든 LLM 호출 → `ws://192.168.219.117:18789` OpenClaw 게이트웨이
- `.env` 에 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` 절대 등록 금지
- 이유: ChatGPT Plus + Claude Code CLI 플랜 토큰으로 과금 0원 운영
- 상세: 설계서 §3.2 AI 레이어

### 2.2 캐시 헤더 (전역 CLAUDE.md 규칙)
- HTML / `/api/*` 이외 → `public, max-age=0, must-revalidate`
- `/assets/*-{hash}.*` → `public, max-age=31536000, immutable`
- `/api/*` → `no-store`
- 구현: `backend/app/main.py` 미들웨어 + `frontend/vite.config.js`

### 2.3 비밀값
- 모든 시크릿은 Orbitron secrets 에만 저장
- `.env.example` 에는 키 이름만, 값은 빈 문자열
- Git 에 `.env` 커밋 금지 (`.gitignore` 적용됨)

## 3. 코딩 컨벤션

### 3.1 Frontend
- React 19 함수형 컴포넌트 + 훅
- CSS Modules (글로벌 토큰은 `src/styles/tokens.css`)
- 번역은 `react-i18next` — 하드코딩 문자열 금지, `t('key')` 사용
- 3D/스트리밍 컴포넌트는 `lazy` + `Suspense` 로 코드 스플릿

### 3.2 Backend
- 라우터는 `app/routers/*.py`, prefix 는 `main.py` 에서 일괄 등록
- 모델은 `app/models/*.py` SQLModel, Pydantic 은 별도 schemas 에
- JWT 는 `app/core/security.py`, OpenClaw 클라이언트는 `app/services/openclaw_ws.py`
- 모든 엔드포인트는 `/api/*` prefix

### 3.3 테스트
- 프론트: Vitest + RTL + Playwright
- 백엔드: pytest + httpx + testcontainers-postgres
- OpenClaw 은 WS mock fixture — CI 가 LAN 접근 없이 통과해야 함

## 4. i18n

- 기본 언어: 한국어 (ko)
- 지원: ko, en
- 파일: `frontend/src/i18n/ko.json`, `en.json`
- 네임스페이스: 페이지별 (`home`, `vision`, `themepark`, ...)

## 5. AI 기능 추가 절차

1. `backend/app/services/openclaw_ws.py` 의 클라이언트 재사용
2. 새 라우터 `backend/app/routers/ai_*.py` 생성
3. OpenClaw agent 등록 (필요시):
   ```
   agents.create {
     id: "joojoo-<purpose>",
     model: "anthropic/claude-opus-4-7" | "openai-codex/gpt-5.4" | "anthropic/claude-sonnet-4-6"
   }
   ```
4. 프론트에서 `hooks/useAiXxx.js` 훅으로 래핑
5. 테스트: WS mock fixture 추가

## 6. Wiki / 지식 참조

- LLM/AI 관련 질문 → `C:\WORK\llm-wiki\` 먼저 참조
- 없으면 Wiki 페이지 생성 제안 (세션 종료 `/end` 시 처리)
- 값(env/키/포트)은 `C:\WORK\infra-docs\ai-shared-registry.md` SSOT

## 7. 배포

- Frontend: Vercel / Cloudflare Pages (정적)
- Backend: Orbitron (`192.168.219.101`) + Cloudflare Tunnel
- 공개 URL: `joojooland.twinverse.org` (예정)
- Orbitron 명세: `Orbitron.yaml`

## 8. 폴더 구조 (요약)

```
JooJooLand/
├── frontend/        React 19 + Vite
├── backend/         FastAPI + SQLModel
├── docs/
│   └── superpowers/specs/  설계서
├── .claude/         스킬·설정 (gaongn.net 복제)
├── Orbitron.yaml    배포 명세
└── CLAUDE.md        (이 파일)
```

상세: 설계서 §4 컴포넌트 구조

## 9. 변경시 주의

- 설계서 (`docs/superpowers/specs/*-design.md`) 에 없는 새 기능을 추가할 땐 먼저 설계서에 반영
- 아키텍처 크게 바꿀 땐 `brainstorming` → `writing-plans` 스킬 절차 재실행
- 커밋 메시지는 한국어 OK, 이모지 자제 (`.claude/settings.json` 의 `commitMessageStyle` 참조)

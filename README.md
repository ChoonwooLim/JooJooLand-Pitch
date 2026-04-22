# JooJooLand — Pet Twinverse 투자유치 사이트

> **"당신의 반려동물은 영원히 살아있습니다."**

세계 최초 반려동물 디지털 영혼(Pet Twinverse) 테마파크의 시드 투자 유치 프리젠테이션 사이트.

## 스택

- **Frontend**: React 19 + Vite 8 + react-three-fiber + react-leaflet + resium + react-i18next + framer-motion
- **Backend**: FastAPI + SQLModel + PostgreSQL (Orbitron) + JWT
- **AI**: OpenClaw LAN Gateway (CLI plan-token 전용, API 키 無)
- **3D Streaming**: UE5.7 Pixel Streaming 2 + Wilbur signaling

## 시작

```bash
# Backend
cd backend
python -m venv .venv && source .venv/Scripts/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env   # 값 채우기
python -m uvicorn app.main:app --reload --port 8000

# Frontend (다른 터미널)
cd frontend
npm install
npm run dev   # 5173
```

통합 dev (concurrently): `cd frontend && npm run dev:all`

## 설계서

- 전체 설계: [docs/superpowers/specs/2026-04-22-joojooland-pitch-site-design.md](docs/superpowers/specs/2026-04-22-joojooland-pitch-site-design.md)
- AI 레지스트리 (SSOT): `C:\WORK\infra-docs\ai-shared-registry.md`
- 프로젝트 가이드: [CLAUDE.md](CLAUDE.md)

## 라이선스

All Rights Reserved — Pet Twinverse / JooJooLand (2026)

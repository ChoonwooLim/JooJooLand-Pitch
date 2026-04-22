from contextlib import asynccontextmanager
import re
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlmodel import Session, select

from .core.config import get_settings
from .core.db import engine, init_db
from .core.security import hash_password
from .models.content_block import ContentBlock
from .models.user import User
from .routers import auth, content, pets, parcels, ai, vworld, upgrade, leads, dataroom
from .routers.admin import admin_router

settings = get_settings()

HASHED_ASSET_RE = re.compile(r"/assets/.*-[A-Za-z0-9_-]{6,}\.[a-z0-9]+$")


SEED_BLOCKS: list[tuple[str, str, str, str, str, int]] = [
    # (page, slot, key, value_ko, value_en, order_idx)
    ("home", "hero_stats", "stat1_value", "100+", "100+", 0),
    ("home", "hero_stats", "stat1_label", "파일럿 참여 반려인", "Pilot Participants", 1),
    ("home", "hero_stats", "stat2_value", "24h", "24h", 2),
    ("home", "hero_stats", "stat2_label", "홀로그램 재회 응답", "Hologram Response", 3),
    ("home", "hero_stats", "stat3_value", "∞", "∞", 4),
    ("home", "hero_stats", "stat3_label", "영혼의 지속", "Soul Persistence", 5),

    ("investment", "roadmap", "phase1_title", "Phase 1 — 시드", "Phase 1 — Seed", 0),
    ("investment", "roadmap", "phase1_body", "핵심 AI 엔진 + 프로토 홀로그램 1종", "Core AI + first holo prototype", 1),
    ("investment", "roadmap", "phase2_title", "Phase 2 — 시리즈 A", "Phase 2 — Series A", 2),
    ("investment", "roadmap", "phase2_body", "주주 파일럿 · 부지 인수", "Shareholder pilot · Land acquisition", 3),
    ("investment", "roadmap", "phase3_title", "Phase 3 — 시리즈 B", "Phase 3 — Series B", 4),
    ("investment", "roadmap", "phase3_body", "테마파크 착공 · 브랜드 확장", "Theme park construction · Brand expansion", 5),
    ("investment", "roadmap", "phase4_title", "Phase 4 — IPO", "Phase 4 — IPO", 6),
    ("investment", "roadmap", "phase4_body", "글로벌 개장 · 라이선스 사업", "Global opening · Licensing", 7),

    ("investment", "team", "member1_name", "임춘우 (Steven Lim)", "Steven Lim", 0),
    ("investment", "team", "member1_role", "창시자 · CEO", "Founder · CEO", 1),
    ("investment", "team", "member1_bio", "Pet Twinverse 원 설계자", "Original architect of Pet Twinverse", 2),
    ("investment", "team", "member2_name", "(채용 중)", "(Open)", 3),
    ("investment", "team", "member2_role", "CTO", "CTO", 4),
    ("investment", "team", "member2_bio", "AI / 3D 파이프라인 리드", "AI / 3D pipeline lead", 5),
    ("investment", "team", "member3_name", "(채용 중)", "(Open)", 6),
    ("investment", "team", "member3_role", "COO", "COO", 7),
    ("investment", "team", "member3_bio", "테마파크 운영 총괄", "Theme park ops lead", 8),

    ("investment", "financials", "total_raised", "0원", "KRW 0", 0),
    ("investment", "financials", "target_seed", "3~15억원", "KRW 300M~1.5B", 1),
    ("investment", "financials", "monthly_burn", "미정", "TBD", 2),
    ("investment", "financials", "runway", "미정", "TBD", 3),
]


def _seed_superadmin(db: Session) -> None:
    existing = db.exec(select(User).where(User.email == settings.admin_email)).first()
    if existing:
        if existing.role != "superadmin":
            existing.role = "superadmin"
            db.add(existing); db.commit()
        return
    db.add(User(
        email=settings.admin_email,
        password_hash=hash_password(settings.admin_password),
        role="superadmin",
        display_name="Steven Lim",
        is_active=True,
    ))
    db.commit()


def _seed_content_blocks(db: Session) -> None:
    existing = db.exec(select(ContentBlock)).first()
    if existing:
        return
    for page, slot, key, ko, en, order in SEED_BLOCKS:
        db.add(ContentBlock(page=page, slot=slot, key=key, value_ko=ko, value_en=en, order_idx=order))
    db.commit()


def _ensure_upload_dir() -> None:
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    (Path(settings.upload_dir) / "dataroom").mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    _ensure_upload_dir()
    with Session(engine) as db:
        _seed_superadmin(db)
        _seed_content_blocks(db)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
)


@app.middleware("http")
async def cache_control(request: Request, call_next):
    response: Response = await call_next(request)
    path = request.url.path
    if path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    elif HASHED_ASSET_RE.search(path):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    else:
        response.headers["Cache-Control"] = "private, max-age=0, must-revalidate"
    return response


app.include_router(content.router)
app.include_router(auth.router)
app.include_router(pets.router)
app.include_router(parcels.router)
app.include_router(ai.router)
app.include_router(vworld.router)
app.include_router(upgrade.router)
app.include_router(leads.router)
app.include_router(dataroom.router)
app.include_router(admin_router)


@app.get("/health")
def root_health():
    return {"status": "ok"}

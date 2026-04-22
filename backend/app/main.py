from contextlib import asynccontextmanager
import re
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlmodel import Session, select

from .core.config import get_settings
from .core.db import engine, init_db
from .core.security import hash_password
from .models.user import User
from .routers import auth, content, pets, parcels, ai, vworld

settings = get_settings()

HASHED_ASSET_RE = re.compile(r"/assets/.*-[0-9a-f]{8,}\.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with Session(engine) as db:
        existing = db.exec(select(User).where(User.email == settings.admin_email)).first()
        if not existing:
            db.add(User(
                email=settings.admin_email,
                password_hash=hash_password(settings.admin_password),
                role="admin",
                display_name="Steven Lim",
            ))
            db.commit()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
    return response


app.include_router(content.router)
app.include_router(auth.router)
app.include_router(pets.router)
app.include_router(parcels.router)
app.include_router(ai.router)
app.include_router(vworld.router)


@app.get("/health")
def root_health():
    return {"status": "ok"}

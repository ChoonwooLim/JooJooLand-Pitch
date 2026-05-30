# 풀스택 단일 이미지: 프런트(Vite) 빌드 → 백엔드(FastAPI) 이미지에 /app/static 으로 구움.
# orbitron.yaml 이 이 Dockerfile + context:. 를 가리키므로, frontend/ 만 바뀐 푸시도
# 자동배포 시 프런트가 다시 빌드된다. (backend-only 빌드로 인한 프런트 미반영 함정 해소)

# ---- Stage 1: 프런트 빌드 ----
FROM node:20-slim AS frontend-build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# api.js 의 baseURL 이 '' (상대경로/동일 출처)이므로 별도 API URL 주입 불필요.
RUN npm run build

# ---- Stage 2: 백엔드 + 프런트 정적자산 ----
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    # rasterio / pyogrio / shapely 런타임 의존 (GDAL/GEOS/PROJ)
    libexpat1 libgdal-dev libgeos-dev libproj-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/scripts ./scripts
COPY --from=frontend-build /build/dist ./static

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]

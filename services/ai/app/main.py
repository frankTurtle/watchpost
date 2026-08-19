from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import claude

app = FastAPI(title="Watchpost AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "ai_enabled": claude.ai_enabled()}

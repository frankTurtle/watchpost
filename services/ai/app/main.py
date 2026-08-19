import json
import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app import claude
from app.schemas import SummarizeRequest, SummarizeResponse

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


@app.post("/summarize", response_model=SummarizeResponse)
def summarize(request: SummarizeRequest):
    if not claude.ai_enabled():
        raise HTTPException(
            status_code=503,
            detail="AI summaries are disabled: set ANTHROPIC_API_KEY",
        )

    monitors_json = json.dumps([m.model_dump() for m in request.monitors])

    try:
        summary_text, model_used = claude.summarize(monitors_json)
    except claude.ClaudeRefusalError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except anthropic.APIStatusError:
        raise HTTPException(status_code=502, detail="Upstream AI error")

    return SummarizeResponse(summary=summary_text, model=model_used)

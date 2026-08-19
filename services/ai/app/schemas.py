from typing import Literal
from pydantic import BaseModel, Field


class MonitorReport(BaseModel):
    name: str
    url: str
    status: Literal["up", "down", "degraded"]
    uptime_24h: float = Field(ge=0, le=100)
    avg_latency_ms: int | None = None
    last_error: str | None = None


class SummarizeRequest(BaseModel):
    monitors: list[MonitorReport] = Field(min_length=1)


class SummarizeResponse(BaseModel):
    summary: str
    model: str

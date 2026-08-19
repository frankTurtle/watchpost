import os
import anthropic

MODEL = "claude-opus-5"

SYSTEM_PROMPT = (
    "You are the status-page writer for a self-hosted uptime monitor. "
    "Given structured monitor data, write a short plain-English status summary "
    "for a public status page: lead with the overall state, name anything down "
    "or degraded with its likely user impact, and keep it under 120 words. "
    "No markdown headers, no bullet lists, no speculation beyond the data."
)


class ClaudeRefusalError(Exception):
    pass


def ai_enabled() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def summarize(monitors_payload: str, client=None) -> tuple[str, str]:
    """Returns (summary_text, model_used). Raises ClaudeRefusalError on refusal."""
    if client is None:
        client = anthropic.Anthropic()

    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=4096,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": monitors_payload}],
    )

    if response.stop_reason == "refusal":
        raise ClaudeRefusalError("The model declined to summarize this input.")

    text = "".join(block.text for block in response.content if block.type == "text")
    return text.strip(), response.model

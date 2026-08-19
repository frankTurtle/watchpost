import os


class ClaudeRefusalError(Exception):
    pass


def ai_enabled() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))

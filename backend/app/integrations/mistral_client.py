from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings


class MistralClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = "https://api.mistral.ai/v1"

    async def parse_planner_text(self, prompt: str) -> dict[str, Any]:
        if not self.settings.mistral_api_key:
            raise RuntimeError("Mistral API key is not configured")

        payload = {
            "model": self.settings.mistral_model,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Extract one planner item and return valid JSON only. "
                        "Respect the date, timezone, and default-time rules provided by the user message. "
                        "Use keys: item_type,title,description,start_at,end_at,due_at,all_day,status,source,color,reminders,recurrence,warnings."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.settings.mistral_api_key}"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
        content = data["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "".join(part.get("text", "") for part in content)
        return httpx.Response(200, content=content).json()

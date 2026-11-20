from __future__ import annotations

import json
import logging
import os
import random
import re
import time
import uuid
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Callable
from urllib import request as urlrequest


def normalize_lookup(value: str) -> str:
    return re.sub(r"[\s，。！？；、,.!?;:：\"'“”‘’()（）【】\[\]]+", "", str(value or "").lower())


class KnowledgeService:
    """Local knowledge base, unanswered queue, DeepSeek fallback and session log."""

    def __init__(
        self,
        base_dir: Path,
        sanitize_blocked: Callable[[str], str],
        fill_template: Callable[[str, str, str], str],
        logger: logging.Logger,
    ) -> None:
        self.base_dir = Path(base_dir)
        self.data_dir = self.base_dir / "data"
        self.knowledge_file = self.data_dir / "knowledge.json"
        self.pending_file = self.data_dir / "chat_pending.json"
        self.deepseek_file = self.data_dir / "deepseek.json"
        self.sessions_dir = self.data_dir / "chat-sessions"
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self.session_id = time.strftime("%Y%m%d-%H%M%S")
        self.session_file = self.sessions_dir / (self.session_id + ".jsonl")
        self.sanitize = sanitize_blocked
        self.fill_template = fill_template
        self.logger = logger
        self.knowledge_lock = __import__("threading").Lock()
        self.pending_lock = __import__("threading").Lock()
        self.deepseek_lock = __import__("threading").Lock()
        self.session_lock = __import__("threading").Lock()

    # ---------- files ----------
    def _read(self, path: Path, default: Any) -> Any:
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return default

    def _write(self, path: Path, payload: Any) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_suffix(".tmp")
        temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(temp, path)

    # ---------- knowledge ----------
    def _normalize_entry(self, item: Any) -> dict[str, Any] | None:
        if not isinstance(item, dict):
            return None
        question = str(item.get("question") or item.get("q") or "").strip()[:300]
        answer = str(item.get("answer") or item.get("a") or "").strip()[:1200]
        if not question or not answer:
            return None
        raw_keywords = item.get("keywords") or []
        if isinstance(raw_keywords, str):
            raw_keywords = re.split(r"[、，,;；\s]+", raw_keywords)
        keywords: list[str] = []
        if isinstance(raw_keywords, list):
            for keyword in raw_keywords:
                keyword = str(keyword or "").strip()[:40]
                if keyword and keyword not in keywords:
                    keywords.append(keyword)
        now = int(time.time() * 1000)
        return {
            "id": str(item.get("id") or ("kb-" + uuid.uuid4().hex[:10]))[:60],
            "question": question,
            "keywords": keywords[:20],
            "answer": answer,
            "category": str(item.get("category") or "公屏问答").strip()[:40],
            "source": str(item.get("source") or "manual").strip()[:30],
            "createdAt": int(item.get("createdAt") or now),
            "updatedAt": int(item.get("updatedAt") or now),
            "hits": int(item.get("hits") or 0),
            "lastUsedAt": int(item.get("lastUsedAt") or 0),
        }

    def load_entries(self) -> list[dict[str, Any]]:
        raw = self._read(self.knowledge_file, {"entries": []})
        if isinstance(raw, dict):
            raw = raw.get("entries")
        if not isinstance(raw, list):
            return []
        entries = [entry for entry in (self._normalize_entry(item) for item in raw) if entry]
        return entries[:1000]

    def save_entries(self, entries: list[dict[str, Any]]) -> None:
        self._write(self.knowledge_file, {
            "version": 1,
            "entries": entries[:1000],
            "updatedAt": int(time.time() * 1000),
        })

    def add_entry(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        entry = self._normalize_entry(payload)
        if not entry:
            return None
        with self.knowledge_lock:
            entries = self.load_entries()
            existing = next((item for item in entries if item.get("id") == entry["id"]), None)
            if existing:
                entry["createdAt"] = existing.get("createdAt") or entry["createdAt"]
                entry["hits"] = existing.get("hits") or 0
                entries = [entry if item.get("id") == entry["id"] else item for item in entries]
            else:
                entries.insert(0, entry)
            self.save_entries(entries)
        return entry

    def delete_entry(self, entry_id: str) -> int:
        with self.knowledge_lock:
            entries = [entry for entry in self.load_entries() if entry.get("id") != entry_id]
            self.save_entries(entries)
            return len(entries)

    def best_match(self, text: str) -> dict[str, Any] | None:
        query = normalize_lookup(text)
        if not query:
            return None
        with self.knowledge_lock:
            entries = self.load_entries()
        best = None
        best_score = 0.0
        best_level = ""
        for entry in entries:
            question = normalize_lookup(entry["question"])
            score = 0.0
            level = ""
            if question and query == question:
                score = 100.0
                level = "exact"
            elif question and len(question) >= 2 and (question in query or query in question):
                score = 78.0 + min(15.0, len(question) / max(len(query), 1) * 10)
                level = "contains"
            for keyword in entry.get("keywords", []):
                word = normalize_lookup(keyword)
                if len(word) >= 2 and word in query:
                    keyword_score = 58.0 + min(16.0, len(word) * 2)
                    if keyword_score > score:
                        score = keyword_score
                        level = "keyword"
            if question and not level:
                ratio = SequenceMatcher(None, query, question).ratio()
                if ratio >= 0.58:
                    score = 38.0 + ratio * 35.0
                    level = "fuzzy"
            if score > best_score:
                best_score = score
                best = entry
                best_level = level
        if not best or best_score < 55:
            return None
        with self.knowledge_lock:
            entries = self.load_entries()
            for entry in entries:
                if entry["id"] == best["id"]:
                    entry["hits"] = int(entry.get("hits") or 0) + 1
                    entry["lastUsedAt"] = int(time.time() * 1000)
                    entry["updatedAt"] = entry["lastUsedAt"]
                    break
            self.save_entries(entries)
        return {"entry": best, "score": best_score, "level": best_level}

    # ---------- pending unanswered ----------
    def load_pending(self) -> list[dict[str, Any]]:
        raw = self._read(self.pending_file, {"items": []})
        if isinstance(raw, dict):
            raw = raw.get("items")
        if not isinstance(raw, list):
            return []
        items = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            question = str(item.get("question") or "").strip()
            if not question:
                continue
            items.append({
                "id": str(item.get("id") or ("q-" + uuid.uuid4().hex[:10]))[:60],
                "question": question[:500],
                "nickname": str(item.get("nickname") or "观众")[:60],
                "eventId": int(item.get("eventId") or 0),
                "time": int(item.get("time") or 0),
                "status": str(item.get("status") or "open")[:20],
                "count": int(item.get("count") or 1),
            })
        return items[-500:]

    def save_pending(self, items: list[dict[str, Any]]) -> None:
        self._write(self.pending_file, {"items": items[-500:], "updatedAt": int(time.time() * 1000)})

    def add_pending(self, question: str, nickname: str, event_id: int = 0) -> dict[str, Any] | None:
        clean = str(question or "").strip()[:500]
        if not clean:
            return None
        with self.pending_lock:
            items = self.load_pending()
            key = normalize_lookup(clean)
            for item in items:
                if item.get("status") == "open" and normalize_lookup(item.get("question", "")) == key:
                    item["count"] = int(item.get("count") or 1) + 1
                    item["time"] = int(time.time() * 1000)
                    item["nickname"] = str(nickname or item.get("nickname") or "观众")[:60]
                    self.save_pending(items)
                    return item
            item = {
                "id": "q-" + uuid.uuid4().hex[:10],
                "question": clean,
                "nickname": str(nickname or "观众")[:60],
                "eventId": int(event_id or 0),
                "time": int(time.time() * 1000),
                "status": "open",
                "count": 1,
            }
            items.append(item)
            self.save_pending(items)
            return item

    # ---------- DeepSeek ----------
    def default_deepseek(self) -> dict[str, Any]:
        return {
            "enabled": False,
            "apiKey": "",
            "model": "deepseek-chat",
            "baseUrl": "https://api.deepseek.com",
            "timeoutSec": 8,
        }

    def sanitize_deepseek(self, raw: Any) -> dict[str, Any]:
        cfg = self.default_deepseek()
        if not isinstance(raw, dict):
            return cfg
        cfg["enabled"] = bool(raw.get("enabled", False))
        cfg["apiKey"] = str(raw.get("apiKey") or "").strip()[:300]
        cfg["model"] = (str(raw.get("model") or "deepseek-chat").strip() or "deepseek-chat")[:80]
        base_url = str(raw.get("baseUrl") or "https://api.deepseek.com").strip().rstrip("/")
        cfg["baseUrl"] = (base_url or "https://api.deepseek.com")[:300]
        try:
            cfg["timeoutSec"] = max(3, min(20, int(raw.get("timeoutSec", 8))))
        except Exception:
            cfg["timeoutSec"] = 8
        return cfg

    def load_deepseek(self) -> dict[str, Any]:
        with self.deepseek_lock:
            return self.sanitize_deepseek(self._read(self.deepseek_file, {}))

    def save_deepseek(self, raw: Any) -> dict[str, Any]:
        cfg = self.sanitize_deepseek(raw)
        with self.deepseek_lock:
            self._write(self.deepseek_file, cfg)
        return cfg

    def deepseek_answer(self, question: str, matches: list[dict[str, Any]]) -> str:
        cfg = self.load_deepseek()
        if not cfg.get("enabled") or not cfg.get("apiKey"):
            return ""
        context_parts = []
        for item in matches[:5]:
            context_parts.append("问：" + str(item.get("question") or "") + "\n答：" + str(item.get("answer") or ""))
        context = "\n\n".join(context_parts) or "暂无匹配资料。"
        system = (
            "你是汽车4S店直播间助理，回答要口语化、简短，不超过100字。"
            "只能依据给出的知识库资料回答；资料不足、需要具体报价或承诺时，只回答 NO_ANSWER。"
            "不要编造优惠、库存、金融政策或配置数据。"
        )
        user = "知识库资料：\n" + context + "\n\n观众问题：" + question + "\n请直接给出回答，资料不足就回复 NO_ANSWER。"
        base_url = str(cfg.get("baseUrl") or "").rstrip("/")
        url = base_url + "/chat/completions" if not base_url.endswith("/chat/completions") else base_url
        payload = {
            "model": cfg.get("model") or "deepseek-chat",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
            "max_tokens": 220,
            "stream": False,
        }
        try:
            req = urlrequest.Request(
                url,
                data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                headers={
                    "Authorization": "Bearer " + cfg["apiKey"],
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urlrequest.urlopen(req, timeout=cfg.get("timeoutSec", 8)) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            answer = str(((data.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()
            answer = re.sub(r"^```(?:text)?|```$", "", answer).strip()
            if not answer or re.search(r"NO[_ ]?ANSWER|无法回答|资料不足|不知道", answer, re.IGNORECASE):
                return ""
            return self.sanitize(answer)[:300]
        except Exception as exc:
            self.logger.warning("DeepSeek 查询失败：%s", exc)
            return ""

    def fallback_reply(self) -> str:
        return random.choice([
            "您的问题我记下了，稍后请专业客服给您核实回复。您可以点下方小风车留个联系方式，或者点我头像发私信，我把详细情况发给您。",
            "这个问题我先帮您记下来，稍后让专业客服核实后回复您。麻烦点一下下方小风车，或者点我头像发私信，我第一时间联系您。",
            "您问的这个问题我需要再确认一下，已经帮您登记。您可以点小风车留个电话，或者私信我，稍后把准确答复发给您。",
            "这个问题暂时没有现成答案，我先记下，稍后请专业顾问核实。您点下方小风车或头像私信，我核实好就回您。",
        ])

    def resolve(self, text: str, config: dict[str, Any], nickname: str = "", is_test: bool = False) -> dict[str, Any]:
        # Level 1: keyword rules.
        lower = str(text or "").lower()
        for rule in config.get("rules", []):
            if not rule.get("enabled", True):
                continue
            for keyword in rule.get("keywords", []):
                if keyword and keyword.lower() in lower:
                    clean = self.sanitize(self.fill_template(rule.get("reply", ""), nickname, config.get("currentModel", "")))
                    if clean:
                        return {"reply": clean, "source": "rule", "level": 1, "ref": rule.get("id", "")}

        # Level 2-4: local knowledge base exact/keyword/fuzzy.
        match = self.best_match(text)
        if match:
            clean = self.sanitize(self.fill_template(match["entry"].get("answer", ""), nickname, config.get("currentModel", "")))
            if clean:
                return {
                    "reply": clean,
                    "source": "kb",
                    "level": {"exact": 2, "contains": 3, "keyword": 3, "fuzzy": 4}.get(match["level"], 3),
                    "ref": match["entry"].get("id", ""),
                    "kbLevel": match["level"],
                }

        # Level 5: DeepSeek with a small knowledge context.
        cfg = self.load_deepseek()
        if cfg.get("enabled") and cfg.get("apiKey") and not is_test:
            with self.knowledge_lock:
                entries = self.load_entries()
            answer = self.deepseek_answer(text, entries[:3])
            if answer:
                return {"reply": answer, "source": "deepseek", "level": 5, "ref": "deepseek"}

        # Level 6: safe fallback; caller records the question as unanswered.
        return {"reply": self.fallback_reply(), "source": "fallback", "level": 6, "ref": ""}

    # ---------- sessions ----------
    def append_session(self, record: dict[str, Any]) -> None:
        with self.session_lock:
            self.sessions_dir.mkdir(parents=True, exist_ok=True)
            payload = dict(record)
            payload.setdefault("sessionId", self.session_id)
            payload.setdefault("time", int(time.time() * 1000))
            with self.session_file.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(payload, ensure_ascii=False) + "\n")

    def summaries(self) -> list[dict[str, Any]]:
        result = []
        if not self.sessions_dir.exists():
            return result
        for path in sorted(self.sessions_dir.glob("*.jsonl"), reverse=True)[:40]:
            try:
                stat = path.stat()
                lines = 0
                with path.open("r", encoding="utf-8") as handle:
                    for _ in handle:
                        lines += 1
                result.append({
                    "id": path.stem,
                    "name": path.name,
                    "size": stat.st_size,
                    "lines": lines,
                    "updatedAt": int(stat.st_mtime * 1000),
                    "current": path.name == self.session_file.name,
                })
            except Exception:
                continue
        return result

    def current_records(self, limit: int = 80) -> list[dict[str, Any]]:
        if not self.session_file.exists():
            return []
        records = []
        try:
            with self.session_file.open("r", encoding="utf-8") as handle:
                for line in handle:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        records.append(json.loads(line))
                    except Exception:
                        continue
        except Exception:
            return []
        return records[-max(1, min(limit, 500)):]

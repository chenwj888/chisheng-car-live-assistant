#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
驰声 · 汽车直播口播助手
本地静态服务 + 可选的 Edge 自然语音合成接口。

默认不需要任何第三方依赖：浏览器直接使用系统语音朗读。
如果在本目录执行过“安装自然语音.cmd”，则会优先加载 vendor/ 下的
edge-tts，从而获得更自然的在线音色。
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import hashlib
import json
import logging
import mimetypes
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Optional
from urllib.parse import parse_qs, unquote, urlparse
from xml.sax.saxutils import escape as xml_escape

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
CACHE_DIR = BASE_DIR / "cache"
LOG_DIR = BASE_DIR / "logs"
DATA_DIR = BASE_DIR / "data"
MUSIC_DIR = BASE_DIR / "music"
MUSIC_INDEX = MUSIC_DIR / "index.json"
MUSIC_LOCK = threading.Lock()
MUSIC_MAX_BYTES = 80 * 1024 * 1024
VENDOR_DIR = BASE_DIR / "vendor"
RUNTIME_FILE = BASE_DIR / "runtime.json"
STATE_FILE = DATA_DIR / "state.json"
CHAT_FILE = DATA_DIR / "chat.json"
BLOCKLIST_FILE = DATA_DIR / "blocklist.json"
BLOCKLIST_BACKUP_FILE = DATA_DIR / "blocklist.backup.json"
APP_VERSION = "2.16.0"

for folder in (CACHE_DIR, LOG_DIR, DATA_DIR, MUSIC_DIR):
    folder.mkdir(parents=True, exist_ok=True)

try:
    if sys.stdout is not None:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if sys.stderr is not None:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# 新版语音组件安装到带时间戳的 vendor-* 目录，安装时不会覆盖正在运行的旧组件。
# 路径顺序：最新的 vendor-* 优先，其次兼容旧的 vendor/。
vendor_paths = []
for candidate in sorted(BASE_DIR.glob("vendor-*"), reverse=True):
    if candidate.is_dir() and re.match(r"^vendor-\d{8}-\d{6}-\d+$", candidate.name):
        vendor_paths.append(candidate)
if VENDOR_DIR.exists():
    vendor_paths.append(VENDOR_DIR)
for folder in reversed(vendor_paths):
    sys.path.insert(0, str(folder))

logger = logging.getLogger("chisheng")
logger.setLevel(logging.INFO)

_console_handler: Optional[logging.Handler] = None
if sys.stdout is not None:
    try:
        _console_handler = logging.StreamHandler(sys.stdout)
        _console_handler.setFormatter(logging.Formatter("%(asctime)s  %(message)s", "%H:%M:%S"))
        logger.addHandler(_console_handler)
    except Exception:
        _console_handler = None

_file_handler = logging.FileHandler(LOG_DIR / "app.log", encoding="utf-8")
_file_handler.setFormatter(logging.Formatter("%(asctime)s  %(levelname)s  %(message)s"))
logger.addHandler(_file_handler)


def edge_tts_module() -> Any:
    """延迟加载，未安装时不影响本地语音功能。"""
    try:
        import edge_tts  # type: ignore

        return edge_tts
    except Exception:
        return None


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.end_headers()
    try:
        handler.wfile.write(body)
    except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
        pass


def build_azure_ssml(text: str, voice: str, rate: str, pitch: str, volume: str, style: str) -> str:
    body = xml_escape(str(text or ""))
    prosody = (
        f'<prosody rate="{rate}" pitch="{pitch}" volume="{volume}">'
        f"{body}"
        "</prosody>"
    )
    if style:
        prosody = f'<mstts:express-as style="{style}">{prosody}</mstts:express-as>'
    return (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
        'xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">'
        f'<voice name="{voice}">{prosody}</voice>'
        "</speak>"
    )


def synthesize_azure(
    text: str,
    voice: str,
    key: str,
    region: str,
    rate: str,
    pitch: str,
    volume: str,
    style: str,
) -> bytes:
    endpoint = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"

    def request_audio(style_value: str) -> bytes:
        ssml = build_azure_ssml(text, voice, rate, pitch, volume, style_value)
        request = urllib.request.Request(
            endpoint,
            data=ssml.encode("utf-8"),
            headers={
                "Ocp-Apim-Subscription-Key": key,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
                "User-Agent": "chisheng-car-live",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=45) as response:
            audio = response.read()
        if len(audio) < 400:
            raise RuntimeError("Azure 返回了空音频")
        return audio

    try:
        return request_audio(style)
    except urllib.error.HTTPError as exc:
        if exc.code == 400 and style:
            return request_audio("")
        raise


def synthesize_volcengine(
    text: str,
    appid: str,
    token: str,
    cluster: str,
    voice: str,
    rate: float,
    pitch: float,
    volume: float,
) -> bytes:
    body = {
        "app": {
            "appid": appid,
            "token": token,
            "cluster": cluster or "volcano_tts",
        },
        "user": {"uid": "chisheng-car-live"},
        "audio": {
            "voice_type": voice,
            "encoding": "mp3",
            "speed_ratio": round(min(2.0, max(0.5, rate)), 2),
            "pitch_ratio": round(min(2.0, max(0.5, 1 + pitch / 100.0)), 2),
            "volume_ratio": round(min(2.0, max(0.1, volume)), 2),
        },
        "request": {
            "reqid": str(uuid.uuid4()),
            "text": text,
            "text_type": "plain",
            "operation": "query",
        },
    }
    request = urllib.request.Request(
        VOLC_TTS_ENDPOINT,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer;{token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if payload.get("code") != 3000:
        raise RuntimeError(str(payload.get("message") or "Volcengine TTS error"))
    raw = str(payload.get("data") or "")
    if not raw:
        raise RuntimeError("Volcengine 返回了空音频")
    audio = base64.b64decode(raw)
    if len(audio) < 400:
        raise RuntimeError("Volcengine 返回了无效音频")
    return audio


def synthesize_cosyvoice(
    text: str,
    key: str,
    workspace: str,
    region: str,
    model: str,
    voice: str,
    rate: float,
    pitch: float,
    volume: float,
) -> bytes:
    workspace = workspace.strip()
    region = region.strip().lower() or "cn-beijing"
    if workspace:
        endpoint = (
            f"https://{workspace}.{region}.maas.aliyuncs.com"
            "/api/v1/services/audio/tts/SpeechSynthesizer"
        )
    else:
        endpoint = COSY_TTS_ENDPOINT
    body = {
        "model": model,
        "input": {
            "text": text,
            "voice": voice,
            "format": "mp3",
            "sample_rate": 22050,
            "volume": int(round(min(1.0, max(0.0, volume)) * 100)),
            "rate": round(min(2.0, max(0.5, rate)), 2),
            "pitch": round(min(2.0, max(0.5, 1 + pitch / 100.0)), 2),
        },
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        payload = json.loads(response.read().decode("utf-8"))
    output = payload.get("output") or {}
    audio_info = output.get("audio") or {}
    audio = b""
    raw = str(audio_info.get("data") or "")
    if raw:
        audio = base64.b64decode(raw)
    elif audio_info.get("url"):
        audio_request = urllib.request.Request(str(audio_info["url"]), method="GET")
        try:
            with urllib.request.urlopen(audio_request, timeout=45) as response:
                audio = response.read()
        except urllib.error.HTTPError:
            audio_request.add_header("Authorization", f"Bearer {key}")
            with urllib.request.urlopen(audio_request, timeout=45) as response:
                audio = response.read()
    if len(audio) < 400:
        raise RuntimeError(str(payload.get("message") or "CosyVoice 返回了空音频"))
    return audio


def find_edge() -> Optional[str]:
    candidates = [
        shutil.which("msedge"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate
    return None


def open_window(url: str) -> None:
    edge = find_edge()
    if edge:
        try:
            subprocess.Popen(
                [
                    edge,
                    f"--app={url}",
                    "--window-size=1500,980",
                    "--no-first-run",
                    "--disable-features=Translate",
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return
        except Exception as exc:
            logger.warning("打开 Edge 应用窗口失败：%s", exc)
    webbrowser.open(url)


def existing_app_info(port: int) -> Optional[dict[str, Any]]:
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}/api/health", timeout=0.6
        ) as response:
            data = json.loads(response.read().decode("utf-8"))
            if data.get("app") == "chisheng-car-live":
                return data
            return None
    except Exception:
        return None


def choose_port(preferred: int) -> int:
    for port in range(preferred, preferred + 40):
        existing = existing_app_info(port)
        if existing:
            if existing.get("version") == APP_VERSION:
                return -port
            # 旧版本正在运行：不要打开旧界面，占用下一个端口启动新版本。
            continue
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("没有找到可用端口，请关闭占用 8765-8804 的程序后重试。")


RATE_RE = re.compile(r"^[+-]\d{1,3}%$")
PITCH_RE = re.compile(r"^[+-]\d{1,3}Hz$")
VOICE_RE = re.compile(r"^[A-Za-z]{2,3}(?:-[A-Za-z0-9]+)+Neural$")
KOKORO_VOICE_RE = re.compile(r"^[a-z]{2}_[0-9]{3}$")
AZURE_REGION_RE = re.compile(r"^[a-z0-9-]{2,40}$")
AZURE_STYLE_RE = re.compile(r"^[A-Za-z0-9_-]{0,40}$")
AZURE_SPEECH_KEY = os.environ.get("AZURE_SPEECH_KEY", "")
AZURE_SPEECH_REGION = os.environ.get("AZURE_SPEECH_REGION", "eastasia")
VOLC_TTS_ENDPOINT = "https://openspeech.bytedance.com/api/v1/tts"
VOLC_TTS_APPID = os.environ.get("VOLC_TTS_APPID", "")
VOLC_TTS_TOKEN = os.environ.get("VOLC_TTS_TOKEN", "")
VOLC_TTS_CLUSTER = os.environ.get("VOLC_TTS_CLUSTER", "volcano_tts")
VOLC_VOICE_RE = re.compile(r"^[A-Za-z0-9_-]{1,120}$")
COSY_TTS_ENDPOINT = "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer"
COSY_TTS_KEY = os.environ.get("DASHSCOPE_API_KEY", "")
COSY_WORKSPACE_RE = re.compile(r"^[A-Za-z0-9_-]{0,80}$")
COSY_REGION_RE = re.compile(r"^[a-z0-9-]{2,40}$")
COSY_VOICE_RE = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
COSY_MODEL_RE = re.compile(r"^[A-Za-z0-9._-]{1,60}$")
KOKORO_URL = os.environ.get("KOKORO_URL", "http://127.0.0.1:8210").rstrip("/")
KOKORO_PROCESS: Optional[subprocess.Popen] = None
KOKORO_OWNED = False
KOKORO_LOG_HANDLE: Any = None
SYNTH_LOCK = threading.Lock()
STATE_LOCK = threading.Lock()
CHAT_LOCK = threading.Lock()
VOICE_LOCK = threading.Lock()
BLOCKLIST_LOCK = threading.Lock()
BLOCKLIST_WORDS: list[str] = []
BLOCKLIST_REPLACEMENTS: list[dict[str, str]] = []
BLOCKLIST_PATTERN: Optional[re.Pattern[str]] = None
BLOCKLIST_REPLACEMENT_PATTERN: Optional[re.Pattern[str]] = None
BLOCKLIST_REPLACEMENT_MAP: dict[str, str] = {}
BLOCKLIST_UPDATED_AT = 0.0
VOICE_LIST_CACHE: list[dict[str, Any]] = []
VOICE_LIST_TIME = 0.0

VOICE_FALLBACK = [
    {"id": "zh-CN-XiaoxiaoNeural", "name": "晓晓 · 女声", "locale": "zh-CN", "gender": "Female", "style": "温暖自然"},
    {"id": "zh-CN-XiaoyiNeural", "name": "晓伊 · 女声", "locale": "zh-CN", "gender": "Female", "style": "年轻明亮"},
    {"id": "zh-CN-YunxiNeural", "name": "云希 · 男声", "locale": "zh-CN", "gender": "Male", "style": "年轻清爽"},
    {"id": "zh-CN-YunjianNeural", "name": "云健 · 男声", "locale": "zh-CN", "gender": "Male", "style": "浑厚有力"},
    {"id": "zh-CN-YunyangNeural", "name": "云扬 · 男声", "locale": "zh-CN", "gender": "Male", "style": "新闻质感"},
    {"id": "zh-CN-YunxiaNeural", "name": "云夏 · 男声", "locale": "zh-CN", "gender": "Male", "style": "少年感"},
    {"id": "zh-CN-liaoning-XiaobeiNeural", "name": "晓北 · 东北女声", "locale": "zh-CN", "gender": "Female", "style": "东北口音"},
    {"id": "zh-CN-shaanxi-XiaoniNeural", "name": "晓妮 · 陕西女声", "locale": "zh-CN", "gender": "Female", "style": "陕西口音"},
    {"id": "zh-HK-HiuGaaiNeural", "name": "曉佳 · 粤语女声", "locale": "zh-HK", "gender": "Female", "style": "粤语"},
    {"id": "zh-HK-HiuMaanNeural", "name": "曉曼 · 粤语女声", "locale": "zh-HK", "gender": "Female", "style": "粤语"},
    {"id": "zh-HK-WanLungNeural", "name": "雲龍 · 粤语男声", "locale": "zh-HK", "gender": "Male", "style": "粤语"},
    {"id": "zh-TW-HsiaoChenNeural", "name": "曉臻 · 台湾女声", "locale": "zh-TW", "gender": "Female", "style": "台湾腔"},
    {"id": "zh-TW-HsiaoYuNeural", "name": "曉雨 · 台湾女声", "locale": "zh-TW", "gender": "Female", "style": "台湾腔"},
    {"id": "zh-TW-YunJheNeural", "name": "雲哲 · 台湾男声", "locale": "zh-TW", "gender": "Male", "style": "台湾腔"},
]


MUSIC_MIME = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".opus": "audio/ogg",
    ".flac": "audio/flac",
    ".webm": "audio/webm",
}
MUSIC_ID_RE = re.compile(r"^[a-f0-9]{16}\.[a-z0-9]{2,5}$")


def load_music_tracks() -> list[dict[str, Any]]:
    try:
        raw = json.loads(MUSIC_INDEX.read_text(encoding="utf-8"))
    except Exception:
        return []
    tracks: list[dict[str, Any]] = []
    if isinstance(raw, dict):
        raw = raw.get("tracks")
    if not isinstance(raw, list):
        return []
    for item in raw:
        if not isinstance(item, dict):
            continue
        track_id = str(item.get("id") or "")
        if not MUSIC_ID_RE.match(track_id):
            continue
        path = MUSIC_DIR / track_id
        if not path.exists():
            continue
        tracks.append({
            "id": track_id,
            "name": str(item.get("name") or track_id)[:160],
            "size": path.stat().st_size,
            "addedAt": int(item.get("addedAt") or 0),
        })
    tracks.sort(key=lambda track: (track.get("addedAt") or 0, track.get("name") or ""))
    return tracks


def save_music_tracks(tracks: list[dict[str, Any]]) -> None:
    temp = MUSIC_INDEX.with_suffix(".tmp")
    temp.write_text(json.dumps({"tracks": tracks}, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temp, MUSIC_INDEX)


def get_edge_voice_list(force: bool = False) -> tuple[list[dict[str, Any]], str]:
    global VOICE_LIST_CACHE, VOICE_LIST_TIME
    now = time.time()
    with VOICE_LOCK:
        if not force and VOICE_LIST_CACHE and now - VOICE_LIST_TIME < 3600:
            return VOICE_LIST_CACHE, "cache"

    module = edge_tts_module()
    voices: list[dict[str, Any]] = []
    source = "fallback"
    if module is not None:
        try:
            async def load_voices() -> list[dict[str, Any]]:
                result = await module.list_voices()
                return list(result or [])

            raw = asyncio.run(asyncio.wait_for(load_voices(), timeout=18))
            for item in raw:
                short = str(item.get("ShortName") or "")
                if not short.lower().startswith("zh-"):
                    continue
                friendly = str(item.get("FriendlyName") or short)
                friendly = re.sub(r"^Microsoft\s+", "", friendly, flags=re.I)
                friendly = re.sub(r"\s+Online\s*\(Natural\).*$", "", friendly, flags=re.I)
                friendly = re.sub(r"\s+-\s+Chinese.*$", "", friendly, flags=re.I)
                tag = item.get("VoiceTag") or {}
                personalities = tag.get("VoicePersonalities") or []
                voices.append({
                    "id": short,
                    "name": friendly.strip() or short,
                    "locale": str(item.get("Locale") or ""),
                    "gender": str(item.get("Gender") or ""),
                    "style": "、".join([str(x) for x in personalities[:3]]),
                })
            if voices:
                source = "edge"
        except Exception as exc:
            logger.info("读取 Edge 音色列表失败，使用内置列表：%s", exc)

    if not voices:
        voices = [dict(item) for item in VOICE_FALLBACK]

    def sort_key(item: dict[str, Any]) -> tuple[str, str, str]:
        return (str(item.get("locale") or ""), str(item.get("gender") or ""), str(item.get("id") or ""))

    voices.sort(key=sort_key)
    with VOICE_LOCK:
        VOICE_LIST_CACHE = voices
        VOICE_LIST_TIME = now if source == 'edge' else now - 3300
    return voices, source

CHAT_EVENTS: list[dict[str, Any]] = []
CHAT_EVENT_SEQ = 0
CHAT_SEEN: dict[str, float] = {}
CHAT_SENT_TIMES: list[float] = []
CHAT_USER_LAST: dict[str, float] = {}
CHAT_LAST_SENT = 0.0
CHAT_HEARTBEAT: dict[str, Any] = {}
CHAT_CONFIG: dict[str, Any] = {}


def normalize_blocklist(raw: Any) -> list[str]:
    if isinstance(raw, str):
        parts = re.split(r"[\n\r,，;；、]+", raw)
    elif isinstance(raw, list):
        parts = raw
    else:
        parts = []
    words: list[str] = []
    seen: set[str] = set()
    for item in parts:
        word = str(item or "").strip()
        if not word:
            continue
        word = word[:50]
        key = word.casefold()
        if key in seen:
            continue
        seen.add(key)
        words.append(word)
        if len(words) >= 2000:
            break
    return words


def normalize_replacements(raw: Any) -> list[dict[str, str]]:
    items: list[Any]
    if isinstance(raw, str):
        items = re.split(r"[\n\r]+", raw)
    elif isinstance(raw, list):
        items = raw
    else:
        items = []
    replacements: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in items:
        source = ""
        target = ""
        if isinstance(item, dict):
            source = str(item.get("from") or item.get("word") or "").strip()
            target = str(item.get("to") or item.get("replacement") or "").strip()
        elif isinstance(item, (list, tuple)) and len(item) >= 2:
            source = str(item[0] or "").strip()
            target = str(item[1] or "").strip()
        elif isinstance(item, str):
            line = item.strip()
            match = re.match(r"^(.+?)\s*(?:=>|->|=|\t)\s*(.*)$", line)
            if match:
                source = match.group(1).strip()
                target = match.group(2).strip()
        source = source[:50]
        target = target[:100]
        if not source:
            continue
        key = source.casefold()
        if key in seen:
            continue
        seen.add(key)
        replacements.append({"from": source, "to": target})
        if len(replacements) >= 2000:
            break
    return replacements


def rebuild_blocklist_pattern() -> None:
    global BLOCKLIST_PATTERN, BLOCKLIST_REPLACEMENT_PATTERN, BLOCKLIST_REPLACEMENT_MAP
    words = sorted(BLOCKLIST_WORDS, key=len, reverse=True)
    BLOCKLIST_PATTERN = re.compile("|".join(re.escape(word) for word in words), re.IGNORECASE) if words else None

    replacements = sorted(BLOCKLIST_REPLACEMENTS, key=lambda item: len(item["from"]), reverse=True)
    BLOCKLIST_REPLACEMENT_PATTERN = (
        re.compile("|".join(re.escape(item["from"]) for item in replacements), re.IGNORECASE)
        if replacements else None
    )
    BLOCKLIST_REPLACEMENT_MAP = {item["from"].casefold(): item["to"] for item in replacements}


def load_blocklist_data() -> tuple[list[str], list[dict[str, str]], float]:
    for path in (BLOCKLIST_FILE, BLOCKLIST_BACKUP_FILE):
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if isinstance(raw, dict):
            updated = float(raw.get("updatedAt") or 0)
            if not updated:
                try:
                    updated = path.stat().st_mtime * 1000
                except Exception:
                    updated = 0
            return (
                normalize_blocklist(raw.get("words")),
                normalize_replacements(raw.get("replacements")),
                updated,
            )
        if isinstance(raw, list):
            try:
                updated = path.stat().st_mtime * 1000
            except Exception:
                updated = 0
            return normalize_blocklist(raw), [], updated
    return [], [], 0


def save_blocklist_data(words: list[str], replacements: list[dict[str, str]], updated_at: float | None = None) -> float:
    stamp = float(updated_at if updated_at is not None else int(time.time() * 1000))
    payload = json.dumps(
        {"words": words, "replacements": replacements, "updatedAt": int(stamp)},
        ensure_ascii=False,
        indent=2,
    )
    for path in (BLOCKLIST_FILE, BLOCKLIST_BACKUP_FILE):
        temp = path.with_suffix(".tmp")
        temp.write_text(payload, encoding="utf-8")
        os.replace(temp, path)
    return stamp


def sanitize_blocked(text: str) -> str:
    value = str(text or "")
    if not value:
        return value
    if BLOCKLIST_REPLACEMENT_PATTERN is not None:
        value = BLOCKLIST_REPLACEMENT_PATTERN.sub(
            lambda match: BLOCKLIST_REPLACEMENT_MAP.get(match.group(0).casefold(), ""),
            value,
        )
    if BLOCKLIST_PATTERN is not None:
        value = BLOCKLIST_PATTERN.sub("", value)
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\s+([，。！？；、,.!?;:])", r"\1", value)
    value = re.sub(r"([，。！？；、])\1+", r"\1", value)
    value = re.sub(r"^[\s，。！？；、,.!?;:]+", "", value)
    value = re.sub(r"[\s，。！？；、,.!?;:]+$", "", value)
    return value.strip()


BLOCKLIST_WORDS, BLOCKLIST_REPLACEMENTS, BLOCKLIST_UPDATED_AT = load_blocklist_data()
rebuild_blocklist_pattern()


def default_chat_config() -> dict[str, Any]:
    return {
        "enabled": True,
        "autoSend": False,
        "voiceReply": True,
        "welcomeEnabled": True,
        "welcomeTemplate": "欢迎 {昵称} 来到直播间！想看哪款车，直接把车型打在公屏上～",
        "minIntervalSec": 8,
        "maxPerMinute": 6,
        "userCooldownSec": 45,
        "roomId": "",
        "currentModel": "通用",
        "rules": [
            {
                "id": "price",
                "keywords": ["价格", "多少钱", "优惠", "落地", "报价", "裸车", "便宜"],
                "reply": "宝子，具体落地价要结合配置和当地政策，点下方小风车留个电话，我把详细报价发你～",
                "enabled": True,
            },
            {
                "id": "test_drive",
                "keywords": ["试驾", "试乘", "体验", "开一圈"],
                "reply": "可以试驾的，点下方小风车留个联系方式，我帮你约最近的门店和时间～",
                "enabled": True,
            },
            {
                "id": "trade_in",
                "keywords": ["置换", "旧车", "二手车", "回收"],
                "reply": "支持旧车置换，把旧车品牌和年份打在公屏上，我帮你估个大概～",
                "enabled": True,
            },
            {
                "id": "finance",
                "keywords": ["分期", "首付", "月供", "贷款", "利息", "金融"],
                "reply": "分期方案要看车型和首付比例，点下方小风车留资，我让金融专员给你算清楚～",
                "enabled": True,
            },
            {
                "id": "config",
                "keywords": ["配置", "参数", "区别", "哪个好", "怎么选", "版本"],
                "reply": "配置差异我可以在直播间给你细讲，也可以点小风车留个电话，我发你配置表～",
                "enabled": True,
            },
            {
                "id": "stock",
                "keywords": ["现车", "提车", "等车", "库存", "多久"],
                "reply": "现车和提车周期每天有变化，点下方小风车留资，我帮你查当前最新库存～",
                "enabled": True,
            },
            {
                "id": "address",
                "keywords": ["地址", "门店", "哪里", "位置", "怎么走", "到店"],
                "reply": "门店位置和到店路线我发你，点小风车留个电话，或者直接私信我～",
                "enabled": True,
            },
            {
                "id": "contact",
                "keywords": ["联系", "微信", "电话", "私信", "留资", "怎么买"],
                "reply": "点下方小风车留个电话就行，我会尽快联系你，也可以直接私信我～",
                "enabled": True,
            },
        ],
    }


def sanitize_chat_config(raw: Any) -> dict[str, Any]:
    cfg = default_chat_config()
    if not isinstance(raw, dict):
        return cfg

    for key in ("enabled", "autoSend", "voiceReply", "welcomeEnabled"):
        if key in raw:
            cfg[key] = bool(raw[key])
    if "welcomeTemplate" in raw:
        cfg["welcomeTemplate"] = str(raw["welcomeTemplate"] or "")[:300]
    if "roomId" in raw:
        cfg["roomId"] = str(raw["roomId"] or "")[:80]
    if "currentModel" in raw:
        cfg["currentModel"] = str(raw["currentModel"] or "通用")[:40]

    if "minIntervalSec" in raw:
        try:
            cfg["minIntervalSec"] = max(3, min(60, int(raw["minIntervalSec"])))
        except Exception:
            pass
    if "maxPerMinute" in raw:
        try:
            cfg["maxPerMinute"] = max(1, min(20, int(raw["maxPerMinute"])))
        except Exception:
            pass
    if "userCooldownSec" in raw:
        try:
            cfg["userCooldownSec"] = max(0, min(600, int(raw["userCooldownSec"])))
        except Exception:
            pass

    if "rules" in raw and isinstance(raw["rules"], list):
        rules = []
        for item in raw["rules"][:60]:
            if not isinstance(item, dict):
                continue
            keywords = item.get("keywords")
            if not isinstance(keywords, list):
                keywords = []
            clean_keywords = []
            for keyword in keywords[:20]:
                keyword = str(keyword or "").strip()
                if keyword and keyword not in clean_keywords:
                    clean_keywords.append(keyword[:30])
            reply = str(item.get("reply") or "").strip()
            if not clean_keywords or not reply:
                continue
            rules.append({
                "id": str(item.get("id") or ("rule-" + str(len(rules) + 1)))[:40],
                "keywords": clean_keywords,
                "reply": reply[:500],
                "enabled": bool(item.get("enabled", True)),
            })
        cfg["rules"] = rules

    return cfg


def load_chat_config() -> dict[str, Any]:
    global CHAT_CONFIG
    with CHAT_LOCK:
        if CHAT_CONFIG:
            return CHAT_CONFIG
        raw = None
        if CHAT_FILE.exists():
            try:
                raw = json.loads(CHAT_FILE.read_text(encoding="utf-8"))
            except Exception as exc:
                logger.warning("读取直播互动配置失败：%s", exc)
        CHAT_CONFIG = sanitize_chat_config(raw)
        return CHAT_CONFIG


def save_chat_config(config: dict[str, Any]) -> None:
    global CHAT_CONFIG
    with CHAT_LOCK:
        CHAT_CONFIG = sanitize_chat_config(config)
        temp = CHAT_FILE.with_suffix(".tmp")
        temp.write_text(json.dumps(CHAT_CONFIG, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(temp, CHAT_FILE)


def chat_now_ms() -> int:
    return int(time.time() * 1000)


def add_chat_event(event: dict[str, Any]) -> dict[str, Any]:
    global CHAT_EVENT_SEQ
    CHAT_EVENT_SEQ += 1
    event["id"] = CHAT_EVENT_SEQ
    event["time"] = chat_now_ms()
    CHAT_EVENTS.append(event)
    if len(CHAT_EVENTS) > 160:
        del CHAT_EVENTS[:-160]
    return event


def clear_chat_events() -> None:
    global CHAT_EVENT_SEQ
    with CHAT_LOCK:
        CHAT_EVENTS.clear()
        CHAT_EVENT_SEQ = 0


def fill_chat_template(template: str, nickname: str, model: str) -> str:
    return (
        str(template)
        .replace("{昵称}", nickname or "宝子")
        .replace("{车型}", model or "这款车")
    )


def find_chat_reply(config: dict[str, Any], text: str, message_type: str) -> tuple[str, str]:
    lower = text.lower()
    for rule in config.get("rules", []):
        if not rule.get("enabled", True):
            continue
        for keyword in rule.get("keywords", []):
            if keyword and keyword.lower() in lower:
                return rule.get("reply", ""), rule.get("id", "")
    return "", ""


def process_chat_message(payload: dict[str, Any]) -> dict[str, Any]:
    global CHAT_LAST_SENT
    config = load_chat_config()
    nickname = str(payload.get("nickname") or "观众")[:40]
    text = str(payload.get("text") or "").strip()[:300]
    message_type = "welcome" if payload.get("type") == "welcome" else "chat"
    message_id = str(payload.get("messageId") or "")[:120]
    is_test = bool(payload.get("test"))
    if not text:
        return {"ok": False, "error": "empty_text", "message": "消息为空"}

    now = time.time()
    key = message_id or (message_type + "|" + nickname + "|" + text)

    with CHAT_LOCK:
        if not is_test:
            last_seen = CHAT_SEEN.get(key)
            if last_seen and now - last_seen < 180:
                return {"ok": True, "action": "ignore", "reason": "duplicate", "duplicate": True}
            CHAT_SEEN[key] = now
            if len(CHAT_SEEN) > 500:
                cutoff = now - 900
                for old_key in [item for item, seen_at in CHAT_SEEN.items() if seen_at < cutoff]:
                    CHAT_SEEN.pop(old_key, None)

    reply = ""
    rule_id = "welcome" if message_type == "welcome" else ""
    if message_type == "welcome" and config.get("welcomeEnabled"):
        reply = fill_chat_template(
            config.get("welcomeTemplate", ""), nickname, config.get("currentModel", "")
        )
    elif message_type == "chat":
        reply, rule_id = find_chat_reply(config, text, message_type)
        if reply:
            reply = fill_chat_template(reply, nickname, config.get("currentModel", ""))

    had_reply = bool(reply)
    reply = sanitize_blocked(reply)
    safe_nickname = sanitize_blocked(nickname) or "观众"
    safe_text = sanitize_blocked(text)

    action = "ignore"
    reason = "no_match"
    if not config.get("enabled", True):
        reason = "engine_off"
    elif not reply:
        reason = "blocked_words" if had_reply else "no_match"
    elif is_test:
        action = "suggest"
        reason = "test"
    elif not config.get("autoSend", False):
        action = "suggest"
        reason = "suggest_only"
    else:
        min_interval = int(config.get("minIntervalSec", 8))
        max_per_minute = int(config.get("maxPerMinute", 6))
        user_cooldown = int(config.get("userCooldownSec", 45))
        with CHAT_LOCK:
            if CHAT_LAST_SENT and now - CHAT_LAST_SENT < min_interval:
                action = "blocked"
                reason = "too_fast"
            else:
                recent = [stamp for stamp in CHAT_SENT_TIMES if now - stamp < 60]
                CHAT_SENT_TIMES[:] = recent
                user_last = CHAT_USER_LAST.get(nickname, 0)
                if len(recent) >= max_per_minute:
                    action = "blocked"
                    reason = "minute_limit"
                elif user_cooldown and user_last and now - user_last < user_cooldown:
                    action = "blocked"
                    reason = "user_cooldown"
                else:
                    action = "send"
                    reason = "matched"
                    CHAT_SENT_TIMES.append(now)
                    CHAT_USER_LAST[nickname] = now
                    CHAT_LAST_SENT = now

    with CHAT_LOCK:
        event = add_chat_event({
            "type": message_type,
            "nickname": safe_nickname,
            "text": safe_text,
            "reply": reply,
            "action": action,
            "reason": reason,
            "ruleId": rule_id,
            "source": "test" if is_test else str(payload.get("source") or "extension")[:30],
        })
        event_id = event["id"]

    return {
        "ok": True,
        "eventId": event_id,
        "action": action,
        "reply": reply,
        "reason": reason,
        "autoSend": bool(config.get("autoSend", False)),
    }



class AppHandler(BaseHTTPRequestHandler):
    server_version = "ChishengCarLive/1.0"
    protocol_version = "HTTP/1.1"

    # 由 main() 注入
    server_port = 8765
    httpd: ThreadingHTTPServer

    def log_message(self, fmt: str, *args: Any) -> None:
        logger.info("%s - %s", self.address_string(), fmt % args)

    def _security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; "
            "font-src 'self' data:; object-src 'none'; base-uri 'none'",
        )

    def do_OPTIONS(self) -> None:  # noqa: N802
        if not self.path.startswith("/api/"):
            self.send_error(404, "Not Found")
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/api/health":
            module = edge_tts_module()
            json_response(
                self,
                200,
                {
                    "ok": True,
                    "app": "chisheng-car-live",
                    "version": APP_VERSION,
                    "edgeTts": module is not None,
                    "edgeTtsVersion": getattr(module, "__version__", None) if module else None,
                    "python": sys.version.split()[0],
                    "port": self.server_port,
                    "baseDir": str(BASE_DIR),
                },
            )
            return

        if path == "/api/tts/voices":
            voices, source = get_edge_voice_list()
            json_response(self, 200, {
                "ok": True,
                "source": source,
                "edgeTts": edge_tts_module() is not None,
                "voices": voices,
            })
            return

        if path == "/api/kokoro/status":
            try:
                with urllib.request.urlopen(KOKORO_URL + "/health", timeout=2) as response:
                    data = json.loads(response.read().decode("utf-8"))
                json_response(self, 200, {
                    "ok": True,
                    "ready": bool(data.get("ready")),
                    "voices": data.get("voices") or [],
                    "url": KOKORO_URL,
                })
            except Exception as exc:
                json_response(self, 200, {
                    "ok": True,
                    "ready": False,
                    "voices": [],
                    "url": KOKORO_URL,
                    "message": "Kokoro 本地服务未启动",
                    "detail": str(exc)[:200],
                })
            return

        if path == "/api/blocklist":
            with BLOCKLIST_LOCK:
                words = list(BLOCKLIST_WORDS)
                replacements = [dict(item) for item in BLOCKLIST_REPLACEMENTS]
                updated_at = BLOCKLIST_UPDATED_AT
            json_response(self, 200, {
                "ok": True,
                "words": words,
                "replacements": replacements,
                "updatedAt": int(updated_at),
            })
            return

        if path == "/api/music/list":
            with MUSIC_LOCK:
                tracks = load_music_tracks()
            json_response(self, 200, {
                "ok": True,
                "tracks": tracks,
                "maxUploadMB": 80,
            })
            return

        if path.startswith("/api/music/file/"):
            track_id = unquote(path.rsplit("/", 1)[-1])
            if not MUSIC_ID_RE.match(track_id):
                json_response(self, 404, {"error": "not_found", "message": "音乐文件不存在"})
                return
            file_path = MUSIC_DIR / track_id
            if not file_path.exists():
                json_response(self, 404, {"error": "not_found", "message": "音乐文件不存在"})
                return
            data = file_path.read_bytes()
            mime = MUSIC_MIME.get(file_path.suffix.lower(), "application/octet-stream")
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Accept-Ranges", "none")
            self.end_headers()
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
                pass
            return

        if path == "/api/state":
            state: Any = None
            try:
                with STATE_LOCK:
                    if STATE_FILE.exists():
                        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            except Exception as exc:
                logger.warning("读取车型讲稿状态失败：%s", exc)
                state = None
            json_response(self, 200, {"ok": True, "state": state})
            return

        if path == "/api/chat/status":
            config = load_chat_config()
            with CHAT_LOCK:
                heartbeat = dict(CHAT_HEARTBEAT)
                events_count = len(CHAT_EVENTS)
            connected = bool(heartbeat.get("time") and chat_now_ms() - heartbeat["time"] < 25000)
            json_response(self, 200, {
                "ok": True,
                "app": "chisheng-car-live",
                "version": APP_VERSION,
                "connected": connected,
                "heartbeat": heartbeat,
                "config": config,
                "stats": {"events": events_count},
            })
            return

        if path == "/api/chat/config":
            json_response(self, 200, {"ok": True, "config": load_chat_config()})
            return

        if path == "/api/chat/events":
            with CHAT_LOCK:
                events = [dict(item) for item in CHAT_EVENTS[-100:]]
                last_id = CHAT_EVENT_SEQ
            json_response(self, 200, {"ok": True, "events": events, "lastId": last_id})
            return

        if path == "/favicon.ico":
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        if path == "/":
            path = "/index.html"

        relative = path.lstrip("/")
        target = (STATIC_DIR / relative).resolve()
        try:
            target.relative_to(STATIC_DIR)
        except ValueError:
            self.send_error(403, "Forbidden")
            return

        if target.is_dir():
            target = target / "index.html"

        if not target.is_file():
            self.send_error(404, "Not Found")
            return

        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if target.suffix.lower() in {".js", ".mjs"}:
            content_type = "text/javascript; charset=utf-8"
        elif target.suffix.lower() == ".css":
            content_type = "text/css; charset=utf-8"
        elif target.suffix.lower() == ".html":
            content_type = "text/html; charset=utf-8"
        elif target.suffix.lower() == ".json":
            content_type = "application/json; charset=utf-8"

        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache" if target.suffix.lower() in {".html", ".js", ".css"} else "public, max-age=86400")
        self._security_headers()
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/shutdown":
            json_response(self, 200, {"ok": True})
            threading.Timer(0.35, self.httpd.shutdown).start()
            return

        if parsed.path.startswith("/api/chat/"):
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > 500_000:
                json_response(self, 400, {"error": "bad_request", "message": "互动数据为空或过大"})
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
            except Exception:
                json_response(self, 400, {"error": "bad_json", "message": "互动数据格式不正确"})
                return
            if not isinstance(payload, dict):
                json_response(self, 400, {"error": "bad_state", "message": "互动数据结构不正确"})
                return

            if parsed.path == "/api/chat/config":
                try:
                    save_chat_config(payload)
                except Exception as exc:
                    logger.warning("保存直播互动配置失败：%s", exc)
                    json_response(self, 500, {"error": "config_write_failed", "message": "互动设置保存失败"})
                    return
                json_response(self, 200, {"ok": True, "config": load_chat_config()})
                return

            if parsed.path == "/api/chat/message":
                json_response(self, 200, process_chat_message(payload))
                return

            if parsed.path == "/api/chat/sent":
                event_id = int(payload.get("eventId") or 0)
                ok = bool(payload.get("ok", True))
                error = str(payload.get("error") or "")[:200]
                with CHAT_LOCK:
                    for event in reversed(CHAT_EVENTS):
                        if event.get("id") == event_id:
                            event["action"] = "sent" if ok else "send_failed"
                            event["sendError"] = error
                            break
                json_response(self, 200, {"ok": True})
                return

            if parsed.path == "/api/chat/heartbeat":
                config = load_chat_config()
                with CHAT_LOCK:
                    CHAT_HEARTBEAT.clear()
                    CHAT_HEARTBEAT.update({
                        "time": chat_now_ms(),
                        "url": str(payload.get("url") or "")[:300],
                        "title": str(payload.get("title") or "")[:120],
                        "roomId": str(payload.get("roomId") or "")[:80],
                        "version": str(payload.get("version") or "")[:30],
                    })
                json_response(self, 200, {
                    "ok": True,
                    "config": config,
                })
                return

            if parsed.path == "/api/chat/clear":
                clear_chat_events()
                json_response(self, 200, {"ok": True})
                return

            json_response(self, 404, {"error": "not_found", "message": "互动接口不存在"})
            return

        if parsed.path == "/api/state":
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > 2_000_000:
                json_response(self, 400, {"error": "bad_request", "message": "讲稿数据为空或过大"})
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
            except Exception:
                json_response(self, 400, {"error": "bad_json", "message": "讲稿数据格式不正确"})
                return
            if not isinstance(payload, dict) or not isinstance(payload.get("scripts"), dict):
                json_response(self, 400, {"error": "bad_state", "message": "讲稿数据结构不正确"})
                return
            scripts = {}
            for key, value in payload.get("scripts", {}).items():
                if isinstance(key, str) and isinstance(value, str):
                    scripts[key[:64]] = value[:800_000]
            state = {
                "version": 2,
                "scripts": scripts,
                "activeModel": str(payload.get("activeModel") or "common")[:64],
                "settings": payload.get("settings") if isinstance(payload.get("settings"), dict) else {},
                "updatedAt": int(payload.get("updatedAt") or 0),
            }
            try:
                with STATE_LOCK:
                    temp = STATE_FILE.with_suffix(".tmp")
                    temp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
                    os.replace(temp, STATE_FILE)
            except Exception as exc:
                logger.warning("保存车型讲稿状态失败：%s", exc)
                json_response(self, 500, {"error": "state_write_failed", "message": "讲稿保存失败"})
                return
            json_response(self, 200, {"ok": True, "updatedAt": state["updatedAt"]})
            return

        if parsed.path == "/api/blocklist":
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > 200_000:
                json_response(self, 400, {"error": "bad_request", "message": "禁用词内容为空或过大"})
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
            except Exception:
                json_response(self, 400, {"error": "bad_json", "message": "请求格式不正确"})
                return
            if isinstance(payload, dict):
                raw_words = payload.get("words")
                if raw_words is None and isinstance(payload.get("text"), str):
                    raw_words = payload.get("text")
                raw_replacements = payload.get("replacements")
            else:
                raw_words = payload
                raw_replacements = []
            words = normalize_blocklist(raw_words)
            replacements = normalize_replacements(raw_replacements)
            with BLOCKLIST_LOCK:
                global BLOCKLIST_WORDS, BLOCKLIST_REPLACEMENTS, BLOCKLIST_UPDATED_AT
                BLOCKLIST_WORDS = words
                BLOCKLIST_REPLACEMENTS = replacements
                BLOCKLIST_UPDATED_AT = save_blocklist_data(words, replacements)
                rebuild_blocklist_pattern()
            json_response(self, 200, {
                "ok": True,
                "words": words,
                "replacements": replacements,
                "updatedAt": int(BLOCKLIST_UPDATED_AT),
            })
            return

        if parsed.path == "/api/music/upload":
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0:
                json_response(self, 400, {"error": "empty_file", "message": "音乐文件为空"})
                return
            if length > MUSIC_MAX_BYTES:
                self.close_connection = True
                json_response(self, 413, {"error": "file_too_large", "message": "单个音乐文件不能超过 80MB"})
                return
            query = parse_qs(parsed.query)
            raw_name = str((query.get("name") or [""])[0] or "")
            safe_name = re.sub(r'[\x00-\x1f<>:"/\\|?*]', "_", Path(unquote(raw_name)).name).strip()[:120]
            ext = Path(safe_name).suffix.lower()
            if ext not in MUSIC_MIME:
                json_response(self, 400, {
                    "error": "bad_audio_type",
                    "message": "只支持 MP3 / M4A / AAC / WAV / OGG / FLAC / WEBM 音频",
                })
                return
            data = self.rfile.read(length)
            if not data:
                json_response(self, 400, {"error": "empty_file", "message": "音乐文件为空"})
                return
            if not safe_name:
                safe_name = "背景音乐" + ext
            track_id = hashlib.sha1(data).hexdigest()[:16] + ext
            file_path = MUSIC_DIR / track_id
            with MUSIC_LOCK:
                tracks = load_music_tracks()
                existing = next((track for track in tracks if track.get("id") == track_id), None)
                if existing is None:
                    temp = MUSIC_DIR / (track_id + ".part")
                    temp.write_bytes(data)
                    os.replace(temp, file_path)
                    existing = {
                        "id": track_id,
                        "name": safe_name,
                        "size": len(data),
                        "addedAt": int(time.time()),
                    }
                    tracks.append(existing)
                    save_music_tracks(tracks)
            json_response(self, 200, {"ok": True, "track": existing})
            return

        if parsed.path == "/api/music/delete":
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > 20_000:
                json_response(self, 400, {"error": "bad_request", "message": "请求内容为空或过大"})
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
            except Exception:
                json_response(self, 400, {"error": "bad_json", "message": "请求格式不正确"})
                return
            track_id = str((payload or {}).get("id") or "")
            if not MUSIC_ID_RE.match(track_id):
                json_response(self, 400, {"error": "bad_track", "message": "音乐文件标识不正确"})
                return
            with MUSIC_LOCK:
                tracks = [track for track in load_music_tracks() if track.get("id") != track_id]
                (MUSIC_DIR / track_id).unlink(missing_ok=True)
                save_music_tracks(tracks)
            json_response(self, 200, {"ok": True, "tracks": tracks})
            return

        if parsed.path == "/api/music/clear":
            with MUSIC_LOCK:
                for track in load_music_tracks():
                    (MUSIC_DIR / str(track.get("id"))).unlink(missing_ok=True)
                save_music_tracks([])
            json_response(self, 200, {"ok": True, "tracks": []})
            return

        if parsed.path != "/api/tts":
            json_response(self, 404, {"error": "not_found", "message": "接口不存在"})
            return

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 200_000:
            json_response(self, 400, {"error": "bad_request", "message": "请求内容为空或过大"})
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            json_response(self, 400, {"error": "bad_json", "message": "请求格式不正确"})
            return

        text = str(payload.get("text") or "").strip()
        if not text:
            json_response(self, 400, {"error": "empty_text", "message": "没有可朗读的文本"})
            return
        text = sanitize_blocked(text)
        if not text:
            json_response(self, 400, {"error": "blocked_text", "message": "这句话只包含禁用词，已跳过朗读"})
            return
        if len(text) > 1000:
            json_response(self, 400, {"error": "text_too_long", "message": "单句文本过长，请先分段"})
            return

        engine = str(payload.get("engine") or "edge").strip().lower()
        if engine == "kokoro":
            kokoro_voice = str(payload.get("voice") or "zf_001")
            if not KOKORO_VOICE_RE.match(kokoro_voice):
                json_response(self, 400, {"error": "bad_voice", "message": "Kokoro 音色参数不正确"})
                return
            try:
                kokoro_speed = round(float(payload.get("speed") or 1.0), 1)
            except Exception:
                kokoro_speed = 1.0
            kokoro_speed = min(2.0, max(0.5, kokoro_speed))
            cache_key = hashlib.sha1(
                json.dumps(["kokoro", text, kokoro_voice, kokoro_speed], ensure_ascii=False).encode("utf-8")
            ).hexdigest()
            output = CACHE_DIR / f"kokoro-{cache_key}.wav"
            if not output.exists() or output.stat().st_size < 400:
                try:
                    with SYNTH_LOCK:
                        if not output.exists() or output.stat().st_size < 400:
                            body = json.dumps({
                                "text": text,
                                "voice": kokoro_voice,
                                "filename": f"kokoro-{cache_key}",
                                "speed": kokoro_speed,
                            }, ensure_ascii=False).encode("utf-8")
                            request = urllib.request.Request(
                                KOKORO_URL + "/generate-speech/",
                                data=body,
                                headers={"Content-Type": "application/json"},
                                method="POST",
                            )
                            with urllib.request.urlopen(request, timeout=180) as response:
                                audio = response.read()
                            if len(audio) < 400 or not audio.startswith(b"RIFF"):
                                raise RuntimeError("Kokoro 返回了无效音频")
                            temp = CACHE_DIR / f"kokoro-{cache_key}.part"
                            temp.write_bytes(audio)
                            os.replace(temp, output)
                except urllib.error.HTTPError as exc:
                    detail = ""
                    try:
                        detail = exc.read().decode("utf-8", "replace")[:240]
                    except Exception:
                        pass
                    logger.warning("Kokoro TTS 失败：%s %s", exc, detail)
                    json_response(self, 503, {
                        "error": "kokoro_failed",
                        "message": "Kokoro 本地语音服务暂时不可用，请检查 8210 端口和模型是否加载完成。",
                    })
                    return
                except Exception as exc:
                    logger.warning("Kokoro TTS 失败：%s", exc)
                    json_response(self, 503, {
                        "error": "kokoro_unavailable",
                        "message": "Kokoro 本地服务未启动，请先运行“启动Kokoro语音.cmd”。",
                    })
                    return
            data = output.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
            self.end_headers()
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
                pass
            return

        if engine == "azure":
            key = str(payload.get("key") or AZURE_SPEECH_KEY).strip()
            region = str(payload.get("region") or AZURE_SPEECH_REGION).strip().lower()
            azure_voice = str(payload.get("voice") or "zh-CN-XiaoxiaoNeural").strip()
            style = str(payload.get("style") or "").strip()
            if not key:
                json_response(self, 400, {
                    "error": "azure_not_configured",
                    "message": "还没有填写 Azure Speech Key，请先在声音设置里填写。",
                })
                return
            if not AZURE_REGION_RE.match(region):
                json_response(self, 400, {
                    "error": "azure_bad_region",
                    "message": "Azure 区域格式不正确，例如 eastasia、eastus。",
                })
                return
            if not VOICE_RE.match(azure_voice):
                json_response(self, 400, {"error": "bad_voice", "message": "Azure 音色参数不正确"})
                return
            if not AZURE_STYLE_RE.match(style):
                json_response(self, 400, {"error": "azure_bad_style", "message": "Azure 风格参数不正确"})
                return

            azure_rate = str(payload.get("rate") or "+0%")
            azure_pitch = str(payload.get("pitch") or "+0Hz")
            azure_volume = str(payload.get("volume") or "+0%")
            if (
                not RATE_RE.match(azure_rate)
                or not PITCH_RE.match(azure_pitch)
                or not RATE_RE.match(azure_volume)
            ):
                json_response(self, 400, {
                    "error": "bad_audio_options",
                    "message": "语速 / 音调参数不正确",
                })
                return

            cache_key = hashlib.sha1(
                json.dumps(
                    ["azure", text, azure_voice, region, azure_rate, azure_pitch, azure_volume, style],
                    ensure_ascii=False,
                ).encode("utf-8")
            ).hexdigest()
            output = CACHE_DIR / f"azure-{cache_key}.mp3"
            if not output.exists() or output.stat().st_size < 400:
                try:
                    with SYNTH_LOCK:
                        if not output.exists() or output.stat().st_size < 400:
                            audio = synthesize_azure(
                                text,
                                azure_voice,
                                key,
                                region,
                                azure_rate,
                                azure_pitch,
                                azure_volume,
                                style,
                            )
                            temp = CACHE_DIR / f"azure-{cache_key}.part"
                            temp.write_bytes(audio)
                            os.replace(temp, output)
                except urllib.error.HTTPError as exc:
                    logger.warning("Azure TTS HTTP 失败：%s", exc.code)
                    if exc.code in (401, 403):
                        message = "Azure Key 或区域不正确，请检查后重试。"
                    elif exc.code == 429:
                        message = "Azure 请求过于频繁或额度不足，请稍后重试。"
                    else:
                        message = "Azure 语音请求被拒绝，请检查区域、音色和风格。"
                    json_response(self, 502, {"error": "azure_failed", "message": message})
                    return
                except urllib.error.URLError as exc:
                    logger.warning("Azure TTS 网络失败：%s", exc)
                    json_response(self, 502, {
                        "error": "azure_network",
                        "message": "无法连接 Azure 语音服务，请检查网络和区域。",
                    })
                    return
                except Exception as exc:
                    logger.warning("Azure TTS 失败：%s", exc)
                    json_response(self, 502, {
                        "error": "azure_failed",
                        "message": "Azure 语音合成失败，请稍后重试。",
                    })
                    return

            data = output.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
            self.end_headers()
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
                pass
            return

        if engine in ("volcengine", "cosyvoice"):
            try:
                rate_value = min(2.0, max(0.5, float(payload.get("rateValue") or 1.0)))
                pitch_value = min(30.0, max(-30.0, float(payload.get("pitchValue") or 0.0)))
                volume_value = min(1.0, max(0.0, float(payload.get("volumeValue") or 1.0)))
            except Exception:
                json_response(self, 400, {"error": "bad_audio_options", "message": "语速 / 音调参数不正确"})
                return
            cloud_voice = str(payload.get("voice") or "").strip()
            if not cloud_voice:
                json_response(self, 400, {"error": "bad_voice", "message": "没有选择音色"})
                return
            cloud_output = CACHE_DIR / ""
            if engine == "volcengine":
                appid = str(payload.get("appId") or VOLC_TTS_APPID).strip()
                token = str(payload.get("token") or VOLC_TTS_TOKEN).strip()
                cluster = str(payload.get("cluster") or VOLC_TTS_CLUSTER).strip() or "volcano_tts"
                if not appid or not token:
                    json_response(self, 400, {
                        "error": "volc_not_configured",
                        "message": "请先填写火山引擎 AppID 和 Access Token。",
                    })
                    return
                if not VOLC_VOICE_RE.match(cloud_voice):
                    json_response(self, 400, {"error": "bad_voice", "message": "火山引擎音色 ID 格式不正确"})
                    return
                cache_key = hashlib.sha1(json.dumps(
                    ["volcengine", text, cloud_voice, cluster, rate_value, pitch_value, volume_value],
                    ensure_ascii=False,
                ).encode("utf-8")).hexdigest()
                cloud_output = CACHE_DIR / f"volc-{cache_key}.mp3"

                def cloud_call() -> bytes:
                    return synthesize_volcengine(
                        text, appid, token, cluster, cloud_voice, rate_value, pitch_value, volume_value
                    )

                provider_label = "火山引擎"
            else:
                key = str(payload.get("key") or COSY_TTS_KEY).strip()
                workspace = str(payload.get("workspace") or "").strip()
                region = str(payload.get("region") or "cn-beijing").strip().lower()
                model = str(payload.get("model") or "cosyvoice-v3-flash").strip()
                if not key:
                    json_response(self, 400, {
                        "error": "cosy_not_configured",
                        "message": "请先填写阿里云百炼 API Key。",
                    })
                    return
                if not COSY_WORKSPACE_RE.match(workspace):
                    json_response(self, 400, {"error": "cosy_bad_workspace", "message": "业务空间 ID 格式不正确"})
                    return
                if not COSY_REGION_RE.match(region):
                    json_response(self, 400, {"error": "cosy_bad_region", "message": "CosyVoice 地域格式不正确"})
                    return
                if not COSY_MODEL_RE.match(model):
                    json_response(self, 400, {"error": "cosy_bad_model", "message": "CosyVoice 模型格式不正确"})
                    return
                if not COSY_VOICE_RE.match(cloud_voice):
                    json_response(self, 400, {"error": "bad_voice", "message": "CosyVoice 音色 ID 格式不正确"})
                    return
                cache_key = hashlib.sha1(json.dumps(
                    ["cosyvoice", text, cloud_voice, model, workspace, region, rate_value, pitch_value, volume_value],
                    ensure_ascii=False,
                ).encode("utf-8")).hexdigest()
                cloud_output = CACHE_DIR / f"cosy-{cache_key}.mp3"

                def cloud_call() -> bytes:
                    return synthesize_cosyvoice(
                        text, key, workspace, region, model, cloud_voice,
                        rate_value, pitch_value, volume_value,
                    )

                provider_label = "CosyVoice"

            if not cloud_output.exists() or cloud_output.stat().st_size < 400:
                try:
                    with SYNTH_LOCK:
                        if not cloud_output.exists() or cloud_output.stat().st_size < 400:
                            audio = cloud_call()
                            temp = cloud_output.with_suffix(".part")
                            temp.write_bytes(audio)
                            os.replace(temp, cloud_output)
                except urllib.error.HTTPError as exc:
                    logger.warning("%s TTS HTTP 失败：%s", provider_label, exc.code)
                    if exc.code in (401, 403):
                        message = provider_label + " 的密钥或权限不正确，请检查后重试。"
                    elif exc.code == 429:
                        message = provider_label + " 请求过于频繁或额度不足，请稍后重试。"
                    else:
                        message = provider_label + " 语音请求被拒绝，请检查音色、参数和账号权限。"
                    json_response(self, 502, {"error": "cloud_tts_failed", "message": message})
                    return
                except urllib.error.URLError as exc:
                    logger.warning("%s TTS 网络失败：%s", provider_label, exc)
                    json_response(self, 502, {
                        "error": "cloud_tts_network",
                        "message": "无法连接 " + provider_label + "，请检查网络和服务地址。",
                    })
                    return
                except Exception as exc:
                    logger.warning("%s TTS 失败：%s", provider_label, exc)
                    json_response(self, 502, {
                        "error": "cloud_tts_failed",
                        "message": provider_label + " 语音合成失败，请检查密钥、音色和账号额度。",
                    })
                    return

            data = cloud_output.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
            self.end_headers()
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
                pass
            return

        voice = str(payload.get("voice") or "zh-CN-XiaoxiaoNeural")
        if not VOICE_RE.match(voice):
            json_response(self, 400, {"error": "bad_voice", "message": "音色参数不正确"})
            return

        rate = str(payload.get("rate") or "+0%")
        pitch = str(payload.get("pitch") or "+0Hz")
        volume = str(payload.get("volume") or "+0%")
        if not RATE_RE.match(rate) or not PITCH_RE.match(pitch) or not RATE_RE.match(volume):
            json_response(self, 400, {"error": "bad_audio_options", "message": "语速 / 音调参数不正确"})
            return

        module = edge_tts_module()
        if module is None:
            json_response(
                self,
                503,
                {
                    "error": "edge_tts_missing",
                    "message": "尚未安装 Edge 自然语音组件，请先运行“安装自然语音.cmd”。",
                },
            )
            return

        cache_key = hashlib.sha1(
            json.dumps([text, voice, rate, pitch, volume], ensure_ascii=False).encode("utf-8")
        ).hexdigest()
        output = CACHE_DIR / f"{cache_key}.mp3"

        if not output.exists() or output.stat().st_size < 400:
            try:
                with SYNTH_LOCK:
                    if not output.exists() or output.stat().st_size < 400:
                        temp = CACHE_DIR / f"{cache_key}.part"
                        last_error: Exception | None = None
                        for attempt in range(3):
                            try:
                                communicate = module.Communicate(
                                    text, voice, rate=rate, pitch=pitch, volume=volume
                                )
                                asyncio.run(asyncio.wait_for(communicate.save(str(temp)), timeout=50))
                                if not temp.exists() or temp.stat().st_size < 400:
                                    raise RuntimeError("语音服务返回了空音频")
                                os.replace(temp, output)
                                last_error = None
                                break
                            except Exception as exc:
                                last_error = exc
                                try:
                                    temp.unlink(missing_ok=True)
                                except Exception:
                                    pass
                                if attempt < 2:
                                    time.sleep(0.8)
                        if last_error is not None:
                            raise last_error
            except asyncio.TimeoutError:
                try:
                    if "temp" in locals():
                        temp.unlink(missing_ok=True)
                except Exception:
                    pass
                logger.warning("Edge TTS 超时：%s", text[:40])
                json_response(
                    self,
                    504,
                    {"error": "tts_timeout", "message": "在线语音合成超时，请检查网络后重试。"},
                )
                return
            except Exception as exc:
                try:
                    if "temp" in locals():
                        temp.unlink(missing_ok=True)
                except Exception:
                    pass
                logger.warning("Edge TTS 失败：%s", exc)
                json_response(
                    self,
                    502,
                    {
                        "error": "tts_failed",
                        "message": "在线语音暂不可用。可切换到“本地语音”继续朗读，或检查网络后重试。",
                    },
                )
                return

        data = output.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            pass


def kokoro_is_ready(timeout: float = 1.0) -> bool:
    try:
        with urllib.request.urlopen(KOKORO_URL + "/health", timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
        return bool(data.get("ready"))
    except Exception:
        return False


def kokoro_port_open(timeout: float = 0.8) -> bool:
    parsed = urlparse(KOKORO_URL)
    port = parsed.port or 8210
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout):
            return True
    except Exception:
        return False


def start_kokoro_service() -> None:
    global KOKORO_PROCESS, KOKORO_OWNED, KOKORO_LOG_HANDLE
    if kokoro_is_ready(0.8):
        logger.info("Kokoro 本地语音服务已在运行，直接复用。")
        return
    if KOKORO_PROCESS is not None and KOKORO_PROCESS.poll() is None:
        return
    service_dir = BASE_DIR / "kokoro-service"
    python_exe = service_dir / ".venv" / "Scripts" / "python.exe"
    main_py = service_dir / "main.py"
    if not python_exe.exists() or not main_py.exists():
        logger.info("未安装 Kokoro 本地语音环境，跳过自动启动。")
        return
    if kokoro_port_open():
        logger.info("Kokoro 端口已被其他进程占用，等待其加载完成。")
        return
    try:
        KOKORO_LOG_HANDLE = open(service_dir / "kokoro.log", "ab", buffering=0)
        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        KOKORO_PROCESS = subprocess.Popen(
            [str(python_exe), str(main_py)],
            cwd=str(service_dir),
            stdin=subprocess.DEVNULL,
            stdout=KOKORO_LOG_HANDLE,
            stderr=subprocess.STDOUT,
            creationflags=flags,
        )
        KOKORO_OWNED = True
        logger.info("已自动启动 Kokoro 本地语音服务：%s", KOKORO_URL)
    except Exception as exc:
        logger.warning("自动启动 Kokoro 失败：%s", exc)
        KOKORO_PROCESS = None
        KOKORO_OWNED = False
        if KOKORO_LOG_HANDLE is not None:
            try:
                KOKORO_LOG_HANDLE.close()
            except Exception:
                pass
            KOKORO_LOG_HANDLE = None


def stop_kokoro_service() -> None:
    global KOKORO_PROCESS, KOKORO_OWNED, KOKORO_LOG_HANDLE
    process = KOKORO_PROCESS
    KOKORO_PROCESS = None
    if KOKORO_OWNED and process is not None and process.poll() is None:
        try:
            process.terminate()
            process.wait(timeout=5)
        except Exception:
            try:
                process.kill()
            except Exception:
                pass
    KOKORO_OWNED = False
    if KOKORO_LOG_HANDLE is not None:
        try:
            KOKORO_LOG_HANDLE.close()
        except Exception:
            pass
        KOKORO_LOG_HANDLE = None


def print_ready(port: int) -> None:
    url = f"http://127.0.0.1:{port}"
    logger.info("服务已启动：%s", url)
    logger.info("关闭软件：点击界面左下角“退出软件”，或关闭启动窗口。")
    if sys.stdout is not None:
        try:
            print(f"\n  驰声 · 汽车直播口播助手已启动\n  {url}\n", flush=True)
        except Exception:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description="驰声 · 汽车直播口播助手")
    parser.add_argument("--port", type=int, default=8765, help="本地服务起始端口")
    parser.add_argument("--no-browser", action="store_true", help="不自动打开窗口")
    args = parser.parse_args()

    if not STATIC_DIR.exists():
        print("缺少 static 目录，无法启动。", file=sys.stderr)
        return 1

    port = choose_port(args.port)
    if port < 0:
        existing = -port
        logger.info("检测到软件已经在运行：http://127.0.0.1:%s", existing)
        if not args.no_browser:
            open_window(f"http://127.0.0.1:{existing}")
        return 0

    AppHandler.server_port = port
    server = ThreadingHTTPServer(("127.0.0.1", port), AppHandler)
    AppHandler.httpd = server
    server.daemon_threads = True

    RUNTIME_FILE.write_text(
        json.dumps(
            {"pid": os.getpid(), "port": port, "url": f"http://127.0.0.1:{port}"},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print_ready(port)
    threading.Thread(target=start_kokoro_service, daemon=True).start()
    if not args.no_browser:
        threading.Timer(0.55, lambda: open_window(f"http://127.0.0.1:{port}")).start()

    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        logger.info("收到 Ctrl+C，正在退出。")
    finally:
        stop_kokoro_service()
        server.server_close()
        try:
            RUNTIME_FILE.unlink(missing_ok=True)
        except Exception:
            pass
        logger.info("服务已关闭。")
    return 0


if __name__ == "__main__":
    sys.exit(main())

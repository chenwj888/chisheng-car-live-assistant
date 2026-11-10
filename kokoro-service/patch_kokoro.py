# -*- coding: utf-8 -*-
"""Kokoro v1.1 ONNX 的 speed 输入需要 float32，kokoro-onnx 0.4.8 写成了 int32。
安装完依赖后运行一次本脚本；服务启动时也会在导入前执行。"""
from pathlib import Path
import importlib.util
import sys


def patch() -> bool:
    spec = importlib.util.find_spec("kokoro_onnx")
    if spec is None or not spec.origin:
        print("无法找到 kokoro_onnx，请先安装依赖。")
        return False
    path = Path(spec.origin)
    text = path.read_text(encoding="utf-8")
    old = '"speed": np.array([speed], dtype=np.int32),'
    new = '"speed": np.array([speed], dtype=np.float32),'
    if old in text:
        path.write_text(text.replace(old, new), encoding="utf-8")
        print("已修正 kokoro_onnx speed 输入类型：", path)
        return True
    if new in text:
        print("kokoro_onnx 已经修正：", path)
        return True
    print("未找到需要修正的代码，请检查 kokoro-onnx 版本：", path)
    return False


if __name__ == "__main__":
    sys.exit(0 if patch() else 1)

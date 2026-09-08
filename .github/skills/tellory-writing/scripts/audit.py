#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tellory 故事结构化审计：段落唯一性 / 死链接 / 孤立段 / 变量先置后读。"""
import re
import sys

path = sys.argv[1]
text = open(path, encoding="utf-8").read()

# 1) 段落头
headers = re.findall(r"(?m)^::\s*([^\n\[]+?)\s*(?:\[[^\]]*\])?\s*$", text)
header_positions = [
    (m.group(1).strip(), text.count("\n", 0, m.start()) + 1)
    for m in re.finditer(r"(?m)^::\s*([^\n\[]+?)\s*(?:\[[^\]]*\])?\s*$", text)
]
print("== 段落清单 ==")
for name, line in header_positions:
    print(f"  L{line}: {name}")
dup = [n for n in set(headers) if headers.count(n) > 1]
print("重复段落名:", dup if dup else "无")

names = set(headers)
print("段落总数:", len(names))

# 2) 链接目标
links = re.findall(r"\[\[[^\]\|]*\|([^\]]+)\]\]", text)
gotos = re.findall(r'\(goto\s*:\s*"([^"]+)"\)', text)
targets = links + gotos
print("\n== 链接目标检查 ==")
missing = sorted({t for t in targets if t not in names})
print("死链接(目标不存在):", missing if missing else "无")

# 3) 每个段落发出的链接 + 汇入
passage_out = {}
passage_in = {}
for name in names:
    passage_out[name] = set()
    passage_in[name] = set()
# 分段解析
blocks = re.split(r"(?m)^(?=::\s*\S)", text)
for block in blocks:
    hm = re.match(r"(?m)^::\s*([^\n\[]+?)\s*(?:\[[^\]]*\])?\s*$", block)
    if not hm:
        continue
    name = hm.group(1).strip()
    for t in re.findall(r"\[\[[^\]\|]*\|([^\]]+)\]\]", block):
        passage_out[name].add(t)
    for t in re.findall(r'\(goto\s*:\s*"([^"]+)"\)', block):
        passage_out[name].add(t)

print("\n== 孤立段(没有任何段落指向它, 除 Start) ==")
incoming = {n: set() for n in names}
for src, outs in passage_out.items():
    for t in outs:
        if t in incoming:
            incoming[t].add(src)
orphans = [n for n in names if n != "Start" and not incoming[n]]
print("孤立段:", orphans if orphans else "无")

# 4) 从 Start 可达性
reachable = set()
stack = ["Start"]
while stack:
    cur = stack.pop()
    if cur in reachable or cur not in passage_out:
        continue
    reachable.add(cur)
    stack.extend(passage_out[cur])
unreachable = [n for n in names if n not in reachable]
print("\n== 从 Start 不可达 ==")
print("不可达段:", unreachable if unreachable else "无")

# 5) 变量：set 与 use
sets = re.findall(r"\(set:\s*\$([A-Za-z_]+)", text)
uses = re.findall(r"\$([A-Za-z_]+)", text)
init_names = set(re.findall(r"\(set:\s*\$([A-Za-z_]+)", text.split(":: OfficerScene")[0] if ":: OfficerScene" in text else text))
print("\n== 变量 ==")
print("被 set 过的变量:", sorted(set(sets)))
print("被引用过的变量:", sorted(set(uses)))
not_init = sorted({u for u in uses if u not in set(sets)})
print("引用但从未赋值:", not_init if not_init else "无")
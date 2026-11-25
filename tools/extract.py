#!/usr/bin/env python3
"""Извлекает характеристики вагонов WR:SR из файлов игры в data/wagons.json.

Только читает папку игры, ничего в неё не пишет. Только стандартная библиотека.

Запуск:
    python tools/extract.py "D:\\Steam\\steamapps\\common\\SovietRepublic"
    python tools/extract.py <папка игры> --out data/wagons.json
"""
import argparse, json, re, struct, sys
from datetime import datetime, timezone
from pathlib import Path

WAGON_TYPE = "VEHICLETYPE_RAIL_VAGON"
SCALAR_KEYS = {
    "NAME": "name_id", "NAME_STR": "name_str", "COST_RUB": "cost_rub", "COST_USD": "cost_usd",
    "RESOURCE_CAPACITY": "capacity", "MOVEMENT_EMPTY_WEIGHT": "empty_weight",
    "MOVEMENT_CONSPUMPTION": "consumption", "COUNTRY": "country",
    "RESOURCE_TRANSPORT_TYPE": "cargo",
    "TRAIN_BBOX_FORWARD_CORRECTION": "bbox_fwd", "TRAIN_BBOX_BACKWARD_CORRECTION": "bbox_back",
}

def num(s):
    s = s.strip().replace(",", ".")
    try:
        f = float(s)
        return int(f) if f.is_integer() else f
    except ValueError:
        return s

def parse_ini(path):
    d = {"group": None, "purchase_excluded": False}
    for line in path.read_text(encoding="utf-8-sig", errors="replace").splitlines():
        m = re.match(r"^\s*\$(\w+)\s*(.*)$", line)
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        if key == "TYPE":
            d["type"] = val
        elif key == "AVAILABLE":
            p = val.split()
            if len(p) >= 2:
                d["available_from"], d["available_to"] = int(p[0]), int(p[1])
        elif key in SCALAR_KEYS and SCALAR_KEYS[key] not in d:
            v = val.strip('"') if key == "NAME_STR" else val
            d[SCALAR_KEYS[key]] = num(v) if key not in ("RESOURCE_TRANSPORT_TYPE", "NAME_STR") else v
        elif key.startswith("TRAINGROUP_"):
            d["group"] = key
        elif key == "PURCHASE_EXCLUDE":
            d["purchase_excluded"] = True
    return d

def nmf_boxes(b):
    boxes = []
    # вариант 1: маркер ff ff 00 00, bbox через 0x84
    i = b.find(b"\xff\xff\x00\x00", 64)
    while i != -1 and i < len(b) - 0x9C:
        if 32 <= b[i - 64] < 127:
            boxes.append(struct.unpack_from("<6f", b, i + 0x84))
        i = b.find(b"\xff\xff\x00\x00", i + 1)
    if boxes:
        return boxes
    # вариант 2: две единичные матрицы 4x4, bbox сразу за ними
    one = struct.pack("<f", 1.0)
    for o in range(0, len(b) - 0xA0, 4):
        if all(b[o + k:o + k + 4] == one for k in (0, 0x14, 0x28, 0x3C, 0x40, 0x54, 0x68, 0x7C)):
            boxes.append(struct.unpack_from("<6f", b, o + 0x80))
    return boxes

def nmf_size(path):
    boxes = nmf_boxes(path.read_bytes())
    if not boxes:
        return None
    mn = [min(x[i] for x in boxes) for i in range(3)]
    mx = [max(x[i + 3] for x in boxes) for i in range(3)]
    return {"length_m": round(mx[2] - mn[2], 2), "width_m": round(mx[0] - mn[0], 2),
            "height_m": round(mx[1] - mn[1], 2)}

LANGS = {"en": "English", "ru": "Russian", "pl": "Polish", "uk": "Ukrainian"}

def load_btf(path):
    """Файл локализации игры (.btf): заголовок из 3 слов, затем таблица
    (id:4 байта, смещение:4, длина:2; всё big-endian), затем строки в UTF-16BE."""
    b = path.read_bytes()
    n = struct.unpack_from(">I", b, 0)[0]
    base = 12 + n * 10
    out = {}
    for k in range(n):
        sid, off, ln = struct.unpack_from(">IIH", b, 12 + k * 10)
        out[sid] = b[base + off * 2: base + (off + ln) * 2].decode("utf-16-be", errors="replace")
    return out

def load_locales(media):
    locs = {}
    for code, name in LANGS.items():
        f = media / f"soviet{name}.btf"
        if f.exists():
            locs[code] = load_btf(f)
    return locs

def localize(w, locs):
    """Названия по языкам: перевод по NAME -> английский -> NAME_STR -> id папки."""
    names = {}
    nid = w.get("name_id")
    for code in LANGS:
        text = None
        if isinstance(nid, int):
            text = locs.get(code, {}).get(nid) or locs.get("en", {}).get(nid)
        names[code] = text or w.get("name_str") or w["id"]
    return names

def game_build(game_root):
    acf = game_root.parent.parent / "appmanifest_784150.acf"
    if acf.exists():
        m = re.search(r'"buildid"\s+"(\d+)"', acf.read_text(errors="replace"))
        if m:
            return m.group(1)
    return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("game_root", type=Path, help="папка игры (SovietRepublic)")
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "docs" / "data" / "wagons.json")
    a = ap.parse_args()
    media = a.game_root / "media_soviet"
    if not media.is_dir():
        sys.exit(f"Не найдена папка {media}")

    locs = load_locales(media)
    if "en" not in locs:
        warnings_early = "нет файла локализации sovietEnglish.btf"
        print("ВНИМАНИЕ:", warnings_early)
    wagons, warnings = [], []
    for ini in sorted(media.rglob("script.ini")):
        d = parse_ini(ini)
        if d.get("type") != WAGON_TYPE:
            continue
        folder = ini.parent
        w = {"id": folder.name, "path": folder.relative_to(media).as_posix()}
        w.update({k: v for k, v in d.items() if k != "type"})
        w["names"] = localize(w, locs)
        nmf = folder / "main.nmf"
        size = nmf_size(nmf) if nmf.exists() else None
        if size:
            w.update(size)
        else:
            warnings.append(f"{w['id']}: не удалось определить размеры модели")
        for req in ("capacity", "length_m"):
            if not w.get(req):
                warnings.append(f"{w['id']}: нет поля {req}")
        wagons.append(w)

    ids = [w["id"] for w in wagons]
    dups = {i for i in ids if ids.count(i) > 1}
    for i in dups:
        warnings.append(f"{i}: повторяющийся id")
    out = {"meta": {"game_build": game_build(a.game_root),
                    "extracted_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "count": len(wagons)},
           "wagons": wagons}
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Вагонов: {len(wagons)} -> {a.out}")
    for w in warnings:
        print("ВНИМАНИЕ:", w)

if __name__ == "__main__":
    main()

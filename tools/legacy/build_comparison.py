"""Сравнение вагонов: прошлый патч (wiki) | текущий (script.ini) | кастомная таблица.
Запуск: python -I build_comparison.py <old_stats.csv> <custom_stats.csv> [out.xlsx]
"""
import csv, re, sys
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

sys.stdout.reconfigure(encoding="utf-8")
here = Path(__file__).parent
old_path, custom_path = Path(sys.argv[1]), Path(sys.argv[2])
out_path = Path(sys.argv[3]) if len(sys.argv) > 3 else here / "wagons_comparison.xlsx"

# имя в вики (old stats) -> папка в игре
OLD2FOLDER = {
    "11-715 dry-bulk tank": "russian_vagon_cement",
    "12-132 open wagon": "russian_vagon_open_12_132",
    "12-515 open wagon": "russian_vagon_open_12_515",
    "13-401 open wagon": "russian_vagon_open_13_401",
    "13-4012 open wagon": "russian_vagon_open_13_4012",
    "13-926 open wagon": "russian_vagon_open_13_926",
    "15-1443 tanker": "russian_vagon_tank_15_1443",
    "15-1547 tanker": "russian_vagon_tank_15_1547",
    "15-871 tanker": "russian_vagon_tank_15_871",
    "4180 open hopper": "w_80thopper",
    "4550 open hopper": "w_CWBhopper",
    "Boxcar (livestock)": "russian_vagon_covered_uzd7889",
    "Boxcar 11-066": "russian_vagon_box066",
    "Boxcar 11-270": "russian_vagon_box270",
    "Boxcar 11-280": "russian_vagon_box280",
    "Boxcar 4900": "w_40ftPS1",
    "Boxcar 5077": "w_50ftPS1",
    "Boxcar 5300": "w_ACF506",
    "Cement tank": "west_vagon_cement",
    "Centerbeam (20m)": "w_66centerbeam",
    "Centerbeam (22m)": "w_73centerbeam",
    "Container wagon (40ft)|62": "w_ACFF7081",
    "Container wagon (40ft)|72": "w_Backpacker",
    "Container wagon (53ft)": "w_MaxiIV",
    "Covered hopper (50t)": "w_50tconverted",
    "Dresden Gl": "Dresden",
    "Eas open": "russian_vagon_eas_open",
    "Eas open hopper": "russian_vagon_eas_gravel",
    "Eas waste": "russian_vagon_eas_waste",
    "Es open": "russian_vagon_es_open",
    "Es open hopper": "russian_vagon_es_gravel",
    "Es waste": "russian_vagon_es_waste",
    "Essen Om": "Essen",
    "Essen Om (Open)": "EssenO",
    "Essen Om (Waste)": "EssenW",
    "Faccs open hopper": "russian_vagon_faccs_gravel",
    "Falls open hopper": "russian_vagon_falls_gravel",
    "G41-C covered": "w_CoilCarCovered",
    "G41-C open": "w_CoilCarOpen",
    "Hannover Gk": "Hannover",
    "Isotherm refrig. wagon": "russian_vagon_cooler_iso",
    "Kassel G": "Kassel",
    "Kassel G (for horses)": "KasselHorse",
    "Klagenfurt Ommu": "Klagenfurt",
    "Klagenfurt Ommu (Open)": "KlagenfurtO",
    "Klagenfurt Ommu (Waste)": "KlagenfurtW",
    "Koln SSyms": "SSyms",
    "Koln SSys": "SSys",
    "Konigsberg Om": "Konigsberg",
    "Konigsberg Om (Open)": "KonigsbergO",
    "Konigsberg Om (Waste)": "KonigsbergW",
    "Open hopper": "russian_vagon_gravel",
    "Open hopper (50t)": "w_50tOpenHopper",
    "Open hopper (70t)": "w_70tOpenHopper",
    "Open hopper (90t)": "w_100tOpenHopper",
    "Oppeln Gs": "Oppeln",
    "Raj mixer wagon": "russian_vagon_raj_cement",
    "Stuttgart R": "Stuttgart",
    "Villach Ommru": "Villach",
    "Villach Ommru (Open)": "VillachO",
    "Villach Ommru (Waste)": "VillachW",
    "Wismar Z": "Wismar",
    "Wuppertal K": "Wuppertal",
    "ZB5 refrig. wagon": "russian_vagon_cooler",
}

# имя в кастомной таблице -> папка (None = мод, в игровых файлах нет)
CUSTOM2FOLDER = {
    "Hopper Falls": "russian_vagon_falls_gravel",
    "Eas загрузка массовая": "russian_vagon_eas_gravel",
    "Hopper Faccs": "russian_vagon_faccs_gravel",
    "Хоппер (90 т) USA": "w_100tOpenHopper",
    "Hopper": "russian_vagon_gravel",
    "Открытый вагон 13-926": "russian_vagon_open_13_926",
    "Открытый вагон 13-4012": "russian_vagon_open_13_4012",
    "12-132 без крыши": "russian_vagon_open_12_132",
    "12-515 без крыши": "russian_vagon_open_12_515",
    "Eas открытый": "russian_vagon_eas_open",
    "Цистерна 15 871": "russian_vagon_tank_15_871",
    "Цистерна 15 1547": "russian_vagon_tank_15_1547",
    "445R Zans (Мод)": None,
    "406R Zaes (Мод)": None,
    "Вагон сборный": "west_vagon_cement",
    "Raj цемент": "russian_vagon_raj_cement",
    "Крытый вагон 4180": "w_80thopper",
    "Вагон крытый 11-280": "russian_vagon_box280",
    "425S Simmms": None,
    "Крытый вагон 4550": "w_CWBhopper",
    "Крытый вагон 5300": "w_ACF506",
    "Крытый вагон 4900": "w_40ftPS1",
}

def num(s):
    m = re.search(r"-?\d+(?:[.,]\d+)?", s or "")
    return float(m.group().replace(",", ".")) if m else None

# --- текущий патч ---
cur = {}
with open(here / "wagons_current.csv", encoding="utf-8-sig", newline="") as f:
    for r in csv.DictReader(f):
        cur[r["Folder"]] = r

# --- прошлый патч (вики) ---
old = {}  # folder -> dict
with open(old_path, encoding="utf-8-sig", newline="") as f:
    rows = list(csv.reader(f))
for r in rows[2:]:
    if len(r) < 6:
        continue
    name = r[0].split("\n")[0].strip()
    cap_raw = r[2].replace("\n", " ")
    key = name
    if name == "Container wagon (40ft)":
        key = f"{name}|{int(num(cap_raw))}"
    folder = OLD2FOLDER.get(key)
    if folder is None:
        print("НЕТ СОПОСТАВЛЕНИЯ (old):", key)
        continue
    old[folder] = dict(name=name, weight=num(r[1]), cap=num(cap_raw), cap_raw=cap_raw,
                       start=r[3].strip(), end=r[4].strip())

# --- кастом ---
custom = {}   # folder or name -> dict
custom_mods = []
with open(custom_path, encoding="utf-8-sig", newline="") as f:
    for r in csv.reader(f):
        if len(r) < 9 or not r[0] or num(r[2]) is None:
            continue
        d = dict(name=r[0], length=num(r[1]), cap=num(r[2]), maxw=num(r[3]),
                 total=num(r[4]), eff=num(r[5]), maxw2=num(r[6]), total2=num(r[7]), eff2=num(r[8]))
        if r[0] not in CUSTOM2FOLDER:
            print("НЕТ СОПОСТАВЛЕНИЯ (custom):", r[0]); continue
        folder = CUSTOM2FOLDER[r[0]]
        (custom_mods.append(d) if folder is None else custom.__setitem__(folder, d))

# --- сборка ---
HEAD = ["Вагон (папка)", "Название (вики / кастом)", "Тип груза",
        "Вес пустого, т: прошлый", "Вес пустого, т: текущий",
        "Вместимость, т: прошлый", "Вместимость, т: текущий", "Вместимость, т: кастом",
        "Δ текущий−прошлый", "Δ кастом−текущий",
        "Годы: прошлый", "Годы: текущий",
        "Длина, м (кастом)", "Макс. вагонов (кастом)", "Общая вместимость (кастом)", "т/м (кастом)",
        "Группа / источник"]

def fnum(s):
    try: return float(s)
    except (TypeError, ValueError): return None

def build_row(folder):
    c, o, k = cur.get(folder), old.get(folder), custom.get(folder)
    cc = fnum(c["RESOURCE_CAPACITY"]) if c else None
    cw = fnum(c["MOVEMENT_EMPTY_WEIGHT"]) if c else None
    oc = o["cap"] if o else None
    kc = k["cap"] if k else None
    d1 = round(cc - oc, 2) if cc is not None and oc is not None else None
    d2 = round(kc - cc, 2) if kc is not None and cc is not None else None
    name = " / ".join(x for x in [o["name"] if o else "", k["name"] if k else ""] if x)
    ttype = (c["RESOURCE_TRANSPORT_TYPE"].replace("RESOURCE_TRANSPORT_", "") if c else "")
    src = c["Path"].split("\\")[0] if c else ""
    if c and c["Path"].split("\\")[0] in ("cwc", "dlc3"):
        src = c["Path"].split("\\")[0]
    return [folder, name, ttype, o["weight"] if o else None, cw, oc, cc, kc, d1, d2,
            f'{o["start"]}–{o["end"]}' if o else "", (c["AVAILABLE"].replace(" ", "–") if c else ""),
            k["length"] if k else None, k["maxw"] if k else None, k["total"] if k else None,
            k["eff"] if k else None, src]

wb = Workbook(); ws = wb.active; ws.title = "Сравнение"
ws.append(HEAD)
folders = sorted(set(old) | set(custom) | {f for f, r in cur.items()
                  if fnum(r["RESOURCE_CAPACITY"]) is not None and r["RESOURCE_TRANSPORT_TYPE"]
                  and "PASSANGER" not in r["RESOURCE_TRANSPORT_TYPE"]})
for fo in folders:
    ws.append(build_row(fo))
for d in custom_mods:
    ws.append([f"(мод) {d['name']}", d["name"], "", None, None, None, None, d["cap"], None, None, "", "",
               d["length"], d["maxw"], d["total"], d["eff"], "мод"])

hf = PatternFill("solid", fgColor="1F3864")
for c in ws[1]:
    c.font = Font(bold=True, color="FFFFFF"); c.fill = hf
    c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
ws.row_dimensions[1].height = 48
red, grn = PatternFill("solid", fgColor="F8CBAD"), PatternFill("solid", fgColor="C6E0B4")
for row in ws.iter_rows(min_row=2):
    for idx in (8, 9):  # Δ колонки (I, J)
        v = row[idx].value
        if isinstance(v, (int, float)) and v != 0:
            row[idx].fill = grn if v > 0 else red
for i, w in enumerate([30, 38, 14, 11, 11, 11, 11, 11, 11, 11, 13, 13, 10, 10, 12, 10, 10], 1):
    ws.column_dimensions[get_column_letter(i)].width = w
ws.freeze_panes = "C2"; ws.auto_filter.ref = ws.dimensions
wb.save(out_path)
print(f"Строк: {ws.max_row - 1}, файл: {out_path}")
print("Совпало old:", len(old), " custom:", len(custom), " моды:", len(custom_mods))

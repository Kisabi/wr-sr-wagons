# WR:SR Wagon MinMax

Калькулятор выгодности вагонов на метр станции для Workers & Resources: Soviet Republic.
Calculator of wagon efficiency per station length for Workers & Resources: Soviet Republic.

## Обновление данных после патча / Updating data after a game patch

```
pip install pillow   # один раз, для миниатюр / once, for thumbnails
python tools/extract.py "D:\Steam\steamapps\common\SovietRepublic"
git add docs/data/wagons.json docs/data/resources.json docs/img && git commit -m "Update wagon data" && git push
```

Правило отбора вагонов в калькуляторе одно: грузовой вагон (есть груз, вместимость и длина) без `purchase_excluded`. Годы доступности не фильтруют список, а показываются подписью («1962–1998», «с 1962», «—»). / One selection rule: cargo wagon without `purchase_excluded`; years are only a label.

Поле `currency` в `wagons.json` — валюта покупки: `"rub"` (₽, советская сторона) или `"usd"` ($, западная); определяется по `cost_rub` / `cost_usd`. Если заданы обе цены или ни одной — `null` и предупреждение при запуске. В калькуляторе показывается только подпись валюты, без цены. / `currency` is the purchase currency (`"rub"` Soviet / `"usd"` Western), derived from `cost_rub` / `cost_usd`; `null` plus a warning if both or neither exist. Only the label is shown, not the price.

Длина, ширина и высота вагона (`length_m`, `width_m`, `height_m`) читаются из `bbox.bin` в папке вагона (6 float32: minX, minY, minZ, maxX, maxY, maxZ; длина = maxZ − minZ). Это размеры, которые использует игра; значения сверены с игрой. Без `bbox.bin` — запасной разбор `main.nmf` с предупреждением. / Wagon length/width/height come from `bbox.bin` in the wagon folder (6 little-endian float32; length = maxZ − minZ). These are the dimensions the game uses, checked against the game. Fallback: `main.nmf` parsing with a warning.

Вместимость вагона зависит от ресурса: `floor(capacity × k + 1e-9)`, где `k` — коэффициент ресурса для типа груза. Коэффициенты вручную записаны в `tools/resource_coefficients.json` (источник: подсказки вагонов в игре); `extract.py` подбирает названия ресурсов в локализации игры и пишет `docs/data/resources.json`. Для типов груза без списка ресурсов используется базовая вместимость. / Wagon capacity depends on the resource: `floor(capacity × k + 1e-9)`, with `k` per cargo type. Coefficients are entered manually in `tools/resource_coefficients.json` (source: in-game wagon tooltips); `extract.py` looks up resource names in the game localization and writes `docs/data/resources.json`. Cargo types without a resource list use the base capacity.

Скрипт только читает папку игры и ничего в ней не меняет. / The script only reads the game folder.

Файлы игры в репозиторий не добавляются, только числовые характеристики. / Game files are not included, only numeric stats.

`tools/legacy/` — старые одноразовые скрипты, заменены `extract.py`.

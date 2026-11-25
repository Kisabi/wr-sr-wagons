# WR:SR Wagon MinMax

Калькулятор выгодности вагонов на метр станции для Workers & Resources: Soviet Republic.
Calculator of wagon efficiency per station length for Workers & Resources: Soviet Republic.

## Обновление данных после патча / Updating data after a game patch

```
pip install pillow   # один раз, для миниатюр / once, for thumbnails
python tools/extract.py "D:\Steam\steamapps\common\SovietRepublic"
git add docs/data/wagons.json docs/img && git commit -m "Update wagon data" && git push
```

Правило отбора вагонов в калькуляторе одно: грузовой вагон (есть груз, вместимость и длина) без `purchase_excluded`. Годы доступности не фильтруют список, а показываются подписью («1962–1998», «с 1962», «—»). / One selection rule: cargo wagon without `purchase_excluded`; years are only a label.

Поле `currency` в `wagons.json` — валюта покупки: `"rub"` (₽, советская сторона) или `"usd"` ($, западная); определяется по `cost_rub` / `cost_usd`. Если заданы обе цены или ни одной — `null` и предупреждение при запуске. В калькуляторе показывается только подпись валюты, без цены. / `currency` is the purchase currency (`"rub"` Soviet / `"usd"` Western), derived from `cost_rub` / `cost_usd`; `null` plus a warning if both or neither exist. Only the label is shown, not the price.

Скрипт только читает папку игры и ничего в ней не меняет. / The script only reads the game folder.

Файлы игры в репозиторий не добавляются, только числовые характеристики. / Game files are not included, only numeric stats.

`tools/legacy/` — старые одноразовые скрипты, заменены `extract.py`.

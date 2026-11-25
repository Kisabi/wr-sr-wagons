# WR:SR Wagon MinMax

Калькулятор выгодности вагонов на метр станции для Workers & Resources: Soviet Republic.
Calculator of wagon efficiency per station length for Workers & Resources: Soviet Republic.

## Обновление данных после патча / Updating data after a game patch

```
python tools/extract.py "D:\Steam\steamapps\common\SovietRepublic"
git add docs/data/wagons.json && git commit -m "Update wagon data" && git push
```

Правило отбора вагонов в калькуляторе одно: грузовой вагон (есть груз, вместимость и длина) без `purchase_excluded`. Годы доступности не фильтруют список, а показываются подписью («1962–1998», «с 1962», «—»). / One selection rule: cargo wagon without `purchase_excluded`; years are only a label.

Скрипт только читает папку игры и ничего в ней не меняет. / The script only reads the game folder.

Файлы игры в репозиторий не добавляются, только числовые характеристики. / Game files are not included, only numeric stats.

`tools/legacy/` — старые одноразовые скрипты, заменены `extract.py`.

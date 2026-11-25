(function () {
  "use strict";
  var C = window.WagonCalc;

  var T = {
    ru: {
      title: "WR:SR — выгода вагонов для станции заданной длины",
      intro: "Введите длину станции, и калькулятор покажет, какой вагон за один заход увезёт больше всего. Сравнивать нужно вагоны одного типа груза.",
      station: "Длина станции, м", preset: "Станция", presetNone: "— своя длина —",
      cargo: "Тип груза", names: "Язык названий вагонов", autoOpt: "Как в интерфейсе",
      cols: ["Вагон", "Валюта покупки", "Годы выпуска", "Длина, м", "Вместимость", "Вагонов на станции", "Всего за заход", "Вместимость на метр вагона", "Выступ за станцию, м"],
      status: function (n, meta) { return "Показано вагонов: " + n + ". Данные игры: сборка " + (meta.game_build || "?") + ", обновлено " + meta.extracted_at + "."; },
      empty: "Нет вагонов под выбранные условия.",
      howTitle: "Как считается",
      how: "<p>Вагон, который хотя бы частично попал на станцию, грузится вместе с остальными, поэтому число вагонов округляется вверх: <code>n = ⌈длина станции / длина вагона⌉</code>.</p><p>«Всего за заход» = <code>n × вместимость</code>. «Вместимость на метр вагона» = <code>вместимость / длина вагона</code>: это плотность самого вагона, она не зависит от станции. «Выступ за станцию» — на сколько метров последний вагон выходит за границу станции из-за округления вверх (<code>длина состава − длина станции</code>, где длина состава = <code>n × длина вагона</code>); если выступа нет, показано «—». Прежняя колонка «на метр станции» убрана: она пропорциональна «Всего за заход» и только дублировала её. Сортировка: по «Всего за заход» (по убыванию), при равенстве — по меньшему выступу, затем по меньшей длине. Лучший вариант выделен цветом.</p><p>Длина вагона берётся из файла bbox.bin в папке вагона (габарит, который использует игра) и сверена с игрой: вагоны стоят вплотную, зазора между ними нет. Цена вагона не учитывается: в игре она зависит от стоимости ресурсов.</p>",
      footer: "Все изображения и данные принадлежат разработчикам игры Workers & Resources: Soviet Republic. Неофициальный фанатский проект, не связан с разработчиками.",
      steam: "Игра в Steam",
      takedown: "Если вы правообладатель и хотите убрать материалы — свяжитесь через GitHub Issues репозитория.",
      loadError: "Не удалось загрузить данные. Откройте сайт через http(s), а не как файл."
    },
    en: {
      title: "WR:SR — wagon efficiency for a given station length",
      intro: "Enter a station length to see which wagon carries the most per visit. Compare wagons of the same cargo type.",
      station: "Station length, m", preset: "Station", presetNone: "— custom length —",
      cargo: "Cargo type", names: "Wagon name language", autoOpt: "Same as interface",
      cols: ["Wagon", "Bought with", "Years", "Length, m", "Capacity", "Wagons at station", "Total per visit", "Capacity per wagon metre", "Overhang, m"],
      status: function (n, meta) { return "Showing " + n + " wagons. Game data: build " + (meta.game_build || "?") + ", updated " + meta.extracted_at + "."; },
      empty: "No wagons match the selected filters.",
      howTitle: "How it is calculated",
      how: "<p>A wagon that is at least partly on the station is loaded together with the others, so the count is rounded up: <code>n = ⌈station length / wagon length⌉</code>.</p><p>“Total per visit” = <code>n × capacity</code>. “Capacity per wagon metre” = <code>capacity / wagon length</code>: the density of the wagon itself, independent of the station. “Overhang” is how many metres the last wagon sticks out past the station boundary because of rounding up (<code>train length − station length</code>, where train length = <code>n × wagon length</code>); “—” means no overhang. The former “per station metre” column was removed: it is proportional to “Total per visit” and only duplicated it. Sorting: by “Total per visit” (descending), ties broken by smaller overhang, then by shorter length. The best option is highlighted.</p><p>Wagon length is read from bbox.bin in the wagon's folder (the dimensions the game itself uses) and checked against the game: wagons stand flush, with no gap between them. Wagon price is not considered: in-game it depends on resource costs.</p>",
      footer: "All images and data belong to the developers of Workers & Resources: Soviet Republic. Unofficial fan project, not affiliated with the developers.",
      steam: "Game on Steam",
      takedown: "If you are a rights holder and want the materials removed, please get in touch via the repository's GitHub Issues.",
      loadError: "Could not load data. Open the site over http(s), not as a local file."
    }
  };

  var CARGO = {
    RESOURCE_TRANSPORT_OPEN: ["Открытые (навалочные)", "Open (bulk)"],
    RESOURCE_TRANSPORT_GRAVEL: ["Сыпучие (гравий и т. п.)", "Gravel / loose"],
    RESOURCE_TRANSPORT_COVERED: ["Крытые", "Covered"],
    RESOURCE_TRANSPORT_PASSANGER: ["Пассажирские", "Passenger"],
    RESOURCE_TRANSPORT_WASTE: ["Мусор", "Waste"],
    RESOURCE_TRANSPORT_OIL: ["Нефть и жидкости", "Oil / liquids"],
    RESOURCE_TRANSPORT_COOLER: ["Рефрижераторные", "Refrigerated"],
    RESOURCE_TRANSPORT_CEMENT: ["Цемент", "Cement"],
    RESOURCE_TRANSPORT_LIVESTOCK: ["Скот", "Livestock"],
    RESOURCE_TRANSPORT_SEWAGE: ["Сточные воды", "Sewage"],
    RESOURCE_TRANSPORT_WATER: ["Вода", "Water"]
  };

  var $ = function (id) { return document.getElementById(id); };
  var state = { lang: "ru", data: null, stations: [] };

  try { var saved = localStorage.getItem("lang"); if (saved === "ru" || saved === "en") state.lang = saved; else if (!/^ru|uk|be/.test(navigator.language || "")) state.lang = "en"; } catch (e) { if (!/^ru|uk|be/.test(navigator.language || "")) state.lang = "en"; }

  function t() { return T[state.lang]; }
  function li() { return state.lang === "ru" ? 0 : 1; }
  function fmt(x) { return Number(x.toFixed(2)).toLocaleString(state.lang === "ru" ? "ru-RU" : "en-US"); }
  function wagonName(w) {
    var l = $("namelang").value; if (l === "auto") l = state.lang;
    return (w.names && w.names[l]) || w.name_str || w.id;
  }
  var CURRENCY = {
    rub: { sym: "₽", ru: "Советский", en: "Soviet" },
    usd: { sym: "$", ru: "Западный", en: "Western" }
  };
  function currencyLabel(w) {
    var c = CURRENCY[w.currency];
    if (!c) return "—";
    return c.sym + " " + c[state.lang];
  }
  function cargoName(c) { return CARGO[c] ? CARGO[c][li()] : c.replace("RESOURCE_TRANSPORT_", ""); }

  function applyTexts() {
    var x = t();
    document.documentElement.lang = state.lang;
    $("t-title").textContent = x.title; document.title = x.title;
    $("t-intro").textContent = x.intro;
    $("l-station").textContent = x.station; $("l-preset").textContent = x.preset;
    $("l-cargo").textContent = x.cargo;
    $("l-names").textContent = x.names;
    $("o-auto").textContent = x.autoOpt;
    $("t-how-title").textContent = x.howTitle; $("t-how").innerHTML = x.how;
    $("footer").innerHTML = "<p>" + esc(x.footer) + " <a href='https://store.steampowered.com/app/784150' target='_blank' rel='noopener'>" + esc(x.steam) + "</a></p><p>" + esc(x.takedown) + "</p>";
    $("lang").textContent = state.lang === "ru" ? "EN" : "RU";
    $("head").innerHTML = x.cols.map(function (c) { return "<th>" + c + "</th>"; }).join("");
    fillPresets(); fillCargo();
  }

  function fillPresets() {
    var sel = $("preset"), cur = sel.value;
    sel.innerHTML = "<option value=''>" + t().presetNone + "</option>" + state.stations.map(function (s) {
      return "<option value='" + s.length_m + "'>" + s[state.lang] + " (" + s.length_m + " м)</option>";
    }).join("");
    sel.value = cur;
  }

  function fillCargo() {
    if (!state.data) return;
    var sel = $("cargo"), cur = sel.value;
    var kinds = {};
    state.data.wagons.filter(C.isListed).forEach(function (w) { kinds[w.cargo] = true; });
    var list = Object.keys(kinds).sort(function (a, b) { return cargoName(a).localeCompare(cargoName(b)); });
    sel.innerHTML = list.map(function (c) { return "<option value='" + c + "'>" + cargoName(c) + "</option>"; }).join("");
    sel.value = (cur && kinds[cur]) ? cur : (kinds.RESOURCE_TRANSPORT_OPEN ? "RESOURCE_TRANSPORT_OPEN" : list[0]);
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function thumb(w) {
    if (!w.preview) return "<span class='thumb'></span>";
    return "<img class='thumb' src='" + esc(w.preview) + "' alt='" + esc(wagonName(w)) + "' width='64' height='40' loading='lazy'>";
  }

  function render() {
    if (!state.data) return;
    var station = parseFloat($("station").value);
    var cargo = $("cargo").value;

    var shown = state.data.wagons.filter(C.isListed).filter(function (w) { return w.cargo === cargo; });
    var tbody = document.querySelector("#result tbody");
    $("status").textContent = t().status(shown.length, state.data.meta);
    if (!(station > 0) || !shown.length) {
      tbody.innerHTML = "<tr><td colspan='9'>" + t().empty + "</td></tr>"; return;
    }
    var rows = C.rank(shown, station);
    rows.forEach(function (r) { r.name = wagonName(r.wagon); });
    var max = rows[0].total || 1;
    tbody.innerHTML = rows.map(function (r, i) {
      var w = r.wagon;
      return "<tr" + (i === 0 && r.total > 0 ? " class='best'" : "") + ">" +
        "<td><span class='wname'>" + thumb(w) + "<span>" + esc(wagonName(w)) + "</span></span></td>" +
        "<td>" + currencyLabel(w) + "</td><td>" + C.formatYears(w, state.lang) + "</td>" +
        "<td>" + fmt(w.length_m) + "</td><td>" + fmt(w.capacity) + "</td><td>" + r.count + "</td>" +
        "<td>" + fmt(r.total) + "<span class='bar' style='width:" + Math.round(r.total / max * 100) + "%'></span></td>" +
        "<td>" + fmt(r.density) + "</td>" +
        "<td>" + (r.overhang > 0 ? fmt(r.overhang) : "—") + "</td></tr>";
    }).join("");
  }

  function load(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  $("lang").addEventListener("click", function () {
    state.lang = state.lang === "ru" ? "en" : "ru";
    try { localStorage.setItem("lang", state.lang); } catch (e) {}
    applyTexts(); render();
  });
  $("preset").addEventListener("change", function () { if (this.value) { $("station").value = this.value; } render(); });
  $("station").addEventListener("input", function () { $("preset").value = ""; render(); });
  ["cargo", "namelang"].forEach(function (id) { $(id).addEventListener("input", render); $(id).addEventListener("change", render); });

  applyTexts();
  Promise.all([load("data/wagons.json"), load("data/stations.json").catch(function () { return { stations: [] }; })])
    .then(function (res) { state.data = res[0]; state.stations = res[1].stations || []; applyTexts(); render(); })
    .catch(function () { $("status").textContent = t().loadError; });
})();

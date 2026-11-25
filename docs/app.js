(function () {
  "use strict";
  var C = window.WagonCalc;

  var T = {
    ru: {
      title: "WR:SR — выгода вагона на метр станции",
      intro: "Введите длину станции, и калькулятор покажет, какой вагон за один заход увезёт больше всего. Сравнивать нужно вагоны одного типа груза.",
      station: "Длина станции, м", preset: "Станция", presetNone: "— своя длина —",
      cargo: "Тип груза", gap: "Зазор между вагонами, м", names: "Язык названий вагонов",
      cols: ["Вагон", "Длина, м", "Вместимость", "Вагонов на станции", "Всего за заход", "На метр станции"],
      status: function (n, meta) { return "Показано вагонов: " + n + ". Данные игры: сборка " + (meta.game_build || "?") + ", обновлено " + meta.extracted_at + "."; },
      empty: "Нет вагонов под выбранные условия.",
      howTitle: "Как считается",
      how: "<p>Вагон, который хотя бы частично попал на станцию, грузится вместе с остальными, поэтому число вагонов округляется вверх: <code>n = ⌈длина станции / (длина вагона + зазор)⌉</code>.</p><p>«Всего за заход» = <code>n × вместимость</code>. «На метр станции» = это значение, делённое на длину станции. Лучший вариант выделен цветом.</p><p>Длины берутся из моделей игры и могут отличаться от реальных на доли метра. Цена вагона не учитывается: в игре она зависит от стоимости ресурсов.</p>",
      footer: "Неофициальный фанатский проект. Данные взяты из файлов игры Workers & Resources: Soviet Republic.",
      loadError: "Не удалось загрузить данные. Откройте сайт через http(s), а не как файл."
    },
    en: {
      title: "WR:SR — wagon efficiency per station length",
      intro: "Enter a station length to see which wagon carries the most per visit. Compare wagons of the same cargo type.",
      station: "Station length, m", preset: "Station", presetNone: "— custom length —",
      cargo: "Cargo type", gap: "Gap between wagons, m", names: "Wagon name language",
      cols: ["Wagon", "Length, m", "Capacity", "Wagons at station", "Total per visit", "Per station metre"],
      status: function (n, meta) { return "Showing " + n + " wagons. Game data: build " + (meta.game_build || "?") + ", updated " + meta.extracted_at + "."; },
      empty: "No wagons match the selected filters.",
      howTitle: "How it is calculated",
      how: "<p>A wagon that is at least partly on the station is loaded together with the others, so the count is rounded up: <code>n = ⌈station length / (wagon length + gap)⌉</code>.</p><p>“Total per visit” = <code>n × capacity</code>. “Per station metre” is that value divided by the station length. The best option is highlighted.</p><p>Lengths come from the game models and may differ from real-life ones by fractions of a metre. Wagon price is not considered: in-game it depends on resource costs.</p>",
      footer: "Unofficial fan project. Data comes from the files of Workers & Resources: Soviet Republic.",
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
  function cargoName(c) { return CARGO[c] ? CARGO[c][li()] : c.replace("RESOURCE_TRANSPORT_", ""); }

  function applyTexts() {
    var x = t();
    document.documentElement.lang = state.lang;
    $("t-title").textContent = x.title; document.title = x.title;
    $("t-intro").textContent = x.intro;
    $("l-station").textContent = x.station; $("l-preset").textContent = x.preset;
    $("l-cargo").textContent = x.cargo;
    $("l-gap").textContent = x.gap;
    $("l-names").textContent = x.names;
    $("t-how-title").textContent = x.howTitle; $("t-how").innerHTML = x.how;
    $("footer").textContent = x.footer;
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

  function render() {
    if (!state.data) return;
    var station = parseFloat($("station").value);
    var gap = Math.max(0, parseFloat($("gap").value) || 0), cargo = $("cargo").value;

    var shown = state.data.wagons.filter(C.isListed).filter(function (w) { return w.cargo === cargo; });
    var tbody = document.querySelector("#result tbody");
    $("status").textContent = t().status(shown.length, state.data.meta);
    if (!(station > 0) || !shown.length) {
      tbody.innerHTML = "<tr><td colspan='6'>" + t().empty + "</td></tr>"; return;
    }
    var rows = C.rank(shown, station, { gap: gap });
    rows.forEach(function (r) { r.name = wagonName(r.wagon); });
    var max = rows[0].total || 1;
    tbody.innerHTML = rows.map(function (r, i) {
      var w = r.wagon;
      return "<tr" + (i === 0 && r.total > 0 ? " class='best'" : "") + ">" +
        "<td>" + esc(wagonName(w)) + " <small>" + C.formatYears(w, state.lang) + "</small>" + "</td>" +
        "<td>" + fmt(w.length_m) + "</td><td>" + fmt(w.capacity) + "</td><td>" + r.count + "</td>" +
        "<td>" + fmt(r.total) + "<span class='bar' style='width:" + Math.round(r.total / max * 100) + "%'></span></td>" +
        "<td>" + fmt(r.perMeter) + "</td></tr>";
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
  ["cargo", "gap", "namelang"].forEach(function (id) { $(id).addEventListener("input", render); $(id).addEventListener("change", render); });

  applyTexts();
  Promise.all([load("data/wagons.json"), load("data/stations.json").catch(function () { return { stations: [] }; })])
    .then(function (res) { state.data = res[0]; state.stations = res[1].stations || []; applyTexts(); render(); })
    .catch(function () { $("status").textContent = t().loadError; });
})();

/* Чистая логика расчёта, без DOM. Работает и в браузере, и в Node (для тестов). */
(function (root) {
  "use strict";

  /** Вагон пригоден для калькулятора: есть груз, вместимость и длина. */
  function isCargoWagon(w) {
    return !!w.cargo && w.capacity > 0 && w.length_m > 0;
  }

  /** Единое правило отбора: грузовой вагон, который не исключён из покупки. Годы не учитываются. */
  function isListed(w) {
    return isCargoWagon(w) && !w.purchase_excluded;
  }

  /** Подпись годов доступности: «1962–1998», «с 1962» / «from 1962» (если до >= 3000), «—» (если годов нет). */
  function formatYears(w, lang) {
    if (typeof w.available_from !== "number") return "—";
    if (typeof w.available_to !== "number" || w.available_to >= 3000)
      return (lang === "en" ? "from " : "с ") + w.available_from;
    return w.available_from + "–" + w.available_to;
  }

  /**
   * Сколько вагонов одновременно помещается на станции.
   * Правило игры: вагон, который частично заходит на станцию, тоже грузится -> округление вверх.
   * stationLen — длина станции, м; wagonLen — длина вагона, м.
   * Вагоны стоят вплотную (проверено в игре): зазора нет.
   */
  function wagonsOnStation(stationLen, wagonLen) {
    if (!(stationLen > 0) || !(wagonLen > 0)) return 0;
    // 1e-9 защищает от погрешности float: 28/14 должно быть ровно 2, а не 3
    return Math.ceil(stationLen / wagonLen - 1e-9);
  }

  /** Вместимость вагона для ресурса с коэффициентом k: целая часть capacity × k (правило игры). */
  function capacityFor(w, k) {
    if (!(k > 0)) return w.capacity;
    return Math.floor(w.capacity * k + 1e-9);
  }

  /** Результат для одного вагона на станции заданной длины; k — необязательный коэффициент ресурса. */
  function evaluate(w, stationLen, k) {
    var n = wagonsOnStation(stationLen, w.length_m);
    var cap = capacityFor(w, k);
    var total = n * cap;
    var trainLength = n * w.length_m;
    return {
      wagon: w,
      capacity: cap,
      count: n,
      total: total,                              // вместимость за один заход
      density: cap / w.length_m,          // вместимость на метр вагона
      trainLength: trainLength,
      // на сколько метров состав выходит за станцию (убираем шум float)
      overhang: Math.max(0, Math.round((trainLength - stationLen) * 1e6) / 1e6)
    };
  }

  /** Отсортированный список результатов, лучшие первыми. */
  function rank(wagons, stationLen, k) {
    return wagons.map(function (w) { return evaluate(w, stationLen, k); })
      .sort(function (a, b) {
        return b.total - a.total || a.overhang - b.overhang ||
          a.wagon.length_m - b.wagon.length_m ||
          (a.wagon.id < b.wagon.id ? -1 : 1);
      });
  }

  var api = { isCargoWagon: isCargoWagon, isListed: isListed, formatYears: formatYears,
    wagonsOnStation: wagonsOnStation, capacityFor: capacityFor, evaluate: evaluate, rank: rank };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WagonCalc = api;
})(typeof self !== "undefined" ? self : this);

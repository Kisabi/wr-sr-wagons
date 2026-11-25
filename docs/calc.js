/* Чистая логика расчёта, без DOM. Работает и в браузере, и в Node (для тестов). */
(function (root) {
  "use strict";

  /** Вагон пригоден для калькулятора: есть груз, вместимость и длина. */
  function isCargoWagon(w) {
    return !!w.cargo && w.capacity > 0 && w.length_m > 0;
  }

  /** Вагон «обычный»: его можно купить и у него заданы годы доступности. */
  function isBuyable(w) {
    return !w.purchase_excluded && typeof w.available_from === "number";
  }

  function isAvailableInYear(w, year) {
    if (typeof w.available_from !== "number") return false;
    return year >= w.available_from && year <= w.available_to;
  }

  /**
   * Сколько вагонов одновременно помещается на станции.
   * Правило игры: вагон, который частично заходит на станцию, тоже грузится -> округление вверх.
   * stationLen — длина станции, м; wagonLen — длина вагона, м;
   * gap — зазор между вагонами, м; reserved — длина, занятая локомотивом, м.
   */
  function wagonsOnStation(stationLen, wagonLen, gap, reserved) {
    gap = gap || 0; reserved = reserved || 0;
    var free = stationLen - reserved;
    if (!(free > 0) || !(wagonLen > 0)) return 0;
    // 1e-9 защищает от погрешности float: 28/14 должно быть ровно 2, а не 3
    return Math.ceil(free / (wagonLen + gap) - 1e-9);
  }

  /** Результат для одного вагона на станции заданной длины. */
  function evaluate(w, stationLen, opts) {
    opts = opts || {};
    var n = wagonsOnStation(stationLen, w.length_m, opts.gap, opts.reserved);
    var total = n * w.capacity;
    return {
      wagon: w,
      count: n,
      total: total,                              // вместимость за один заход
      perMeter: stationLen > 0 ? total / stationLen : 0, // на метр станции
      trainLength: n * w.length_m + Math.max(0, n - 1) * (opts.gap || 0)
    };
  }

  /** Отсортированный список результатов, лучшие первыми. */
  function rank(wagons, stationLen, opts) {
    return wagons.map(function (w) { return evaluate(w, stationLen, opts); })
      .sort(function (a, b) {
        return b.total - a.total || a.wagon.length_m - b.wagon.length_m ||
          (a.wagon.id < b.wagon.id ? -1 : 1);
      });
  }

  var api = { isCargoWagon: isCargoWagon, isBuyable: isBuyable, isAvailableInYear: isAvailableInYear,
    wagonsOnStation: wagonsOnStation, evaluate: evaluate, rank: rank };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WagonCalc = api;
})(typeof self !== "undefined" ? self : this);

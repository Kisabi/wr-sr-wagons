const test = require("node:test");
const assert = require("node:assert");
const C = require("../docs/calc.js");

test("пример из описания: 115 м и вагон 14 м -> 9 вагонов", () => {
  assert.strictEqual(C.wagonsOnStation(115, 14), 9);
});
test("точное деление не округляется вверх: 28 / 14 = 2", () => {
  assert.strictEqual(C.wagonsOnStation(28, 14), 2);
});
test("некорректные входные данные дают 0", () => {
  assert.strictEqual(C.wagonsOnStation(0, 14), 0);
  assert.strictEqual(C.wagonsOnStation(10, 0), 0);
});
test("округление вверх может сделать длинный вагон выгоднее", () => {
  const a = { id: "a", length_m: 14, capacity: 60 }; // 9 шт -> 540
  const b = { id: "b", length_m: 11, capacity: 50 }; // 11 шт -> 550
  const r = C.rank([a, b], 115);
  assert.strictEqual(r[0].wagon.id, "b");
  assert.strictEqual(r[0].total, 550);
  assert.strictEqual(r[1].total, 540);
});
test("плотность вагона: 14 м / 60 ед. = 4.29", () => {
  const r = C.evaluate({ id: "a", length_m: 14, capacity: 60 }, 115);
  assert.strictEqual(Number(r.density.toFixed(2)), 4.29);
  assert.strictEqual(r.perMeter, undefined);
});
test("выступ: станция 115 м, вагон 14 м -> n=9, состав 126, выступ 11", () => {
  const r = C.evaluate({ id: "a", length_m: 14, capacity: 60 }, 115);
  assert.strictEqual(r.count, 9);
  assert.strictEqual(r.trainLength, 126);
  assert.strictEqual(r.overhang, 11);
});
test("выступ: станция 28 м, вагон 14 м -> n=2, выступа нет", () => {
  const r = C.evaluate({ id: "a", length_m: 14, capacity: 60 }, 28);
  assert.strictEqual(r.count, 2);
  assert.strictEqual(r.overhang, 0);
});
test("при равном «всего» выигрывает меньший выступ, затем меньшая длина", () => {
  const a = { id: "a", length_m: 10, capacity: 60 }; // 115 м -> 12 шт, 720, выступ 5
  const b = { id: "b", length_m: 14, capacity: 80 }; // 9 шт, 720, выступ 11
  const r = C.rank([b, a], 115);
  assert.strictEqual(r[0].wagon.id, "a");
});
test("отбор: грузовой и не purchase_excluded, годы не важны", () => {
  const ok = { cargo: "X", capacity: 10, length_m: 12 };
  assert.ok(C.isListed(ok));
  assert.ok(C.isListed({ ...ok, available_from: 2100, available_to: 2200 }));
  assert.ok(!C.isListed({ ...ok, purchase_excluded: true }));
  assert.ok(!C.isListed({ ...ok, cargo: undefined }));
  assert.ok(!C.isListed({ ...ok, capacity: 0 }));
  assert.ok(!C.isListed({ ...ok, length_m: 0 }));
});
test("формат годов", () => {
  assert.strictEqual(C.formatYears({ available_from: 1962, available_to: 1998 }, "ru"), "1962–1998");
  assert.strictEqual(C.formatYears({ available_from: 1962, available_to: 3000 }, "ru"), "с 1962");
  assert.strictEqual(C.formatYears({ available_from: 1962, available_to: 9999 }, "en"), "from 1962");
  assert.strictEqual(C.formatYears({}, "ru"), "—");
  assert.strictEqual(C.formatYears({}, "en"), "—");
});

test("сверка с игрой: 18 Falls по 13.521 м + ВЛ10 (32.396 м) = 275.774 -> 276", () => {
  const len = 18 * 13.521 + 32.396;
  assert.ok(Math.abs(len - 275.774) < 1e-6);
  assert.strictEqual(Math.ceil(len), 276);
  assert.strictEqual(Math.round(len), 276);
});
test("сверка с игрой: 20 вагонов 11-066 по 14.779 м + ВЛ10 = 327.976 -> 328", () => {
  const len = 20 * 14.779 + 32.396;
  assert.ok(Math.abs(len - 327.976) < 1e-6);
  assert.strictEqual(Math.ceil(len), 328);
  assert.strictEqual(Math.round(len), 328);
});

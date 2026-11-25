const test = require("node:test");
const assert = require("node:assert");
const C = require("../docs/calc.js");

test("пример из описания: 115 м и вагон 14 м -> 9 вагонов", () => {
  assert.strictEqual(C.wagonsOnStation(115, 14), 9);
});
test("точное деление не округляется вверх: 28 / 14 = 2", () => {
  assert.strictEqual(C.wagonsOnStation(28, 14), 2);
});
test("зазор и локомотив уменьшают/увеличивают число", () => {
  assert.strictEqual(C.wagonsOnStation(100, 10, 0, 0), 10);
  assert.strictEqual(C.wagonsOnStation(100, 10, 2, 0), 9);   // 100/12 = 8.33 -> 9
  assert.strictEqual(C.wagonsOnStation(100, 10, 0, 20), 8);  // 80/10
});
test("некорректные входные данные дают 0", () => {
  assert.strictEqual(C.wagonsOnStation(0, 14), 0);
  assert.strictEqual(C.wagonsOnStation(10, 0), 0);
  assert.strictEqual(C.wagonsOnStation(10, 14, 0, 50), 0);
});
test("округление вверх может сделать длинный вагон выгоднее", () => {
  const a = { id: "a", length_m: 14, capacity: 60 }; // 9 шт -> 540
  const b = { id: "b", length_m: 11, capacity: 50 }; // 11 шт -> 550
  const r = C.rank([a, b], 115);
  assert.strictEqual(r[0].wagon.id, "b");
  assert.strictEqual(r[0].total, 550);
  assert.strictEqual(r[1].total, 540);
});
test("доступность по годам", () => {
  const w = { available_from: 1960, available_to: 1990 };
  assert.ok(C.isAvailableInYear(w, 1960));
  assert.ok(C.isAvailableInYear(w, 1990));
  assert.ok(!C.isAvailableInYear(w, 1991));
  assert.ok(!C.isAvailableInYear({}, 1970));
});

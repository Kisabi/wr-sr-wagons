const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const C = require("../docs/calc.js");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/data/wagons.json"), "utf8"));
const cargo = data.wagons.filter(C.isCargoWagon);

test("метаданные и список не пустые", () => {
  assert.ok(data.meta && data.meta.extracted_at);
  assert.ok(data.wagons.length > 50);
  assert.strictEqual(data.meta.count, data.wagons.length);
});
test("id уникальны", () => {
  const ids = data.wagons.map(w => w.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});
test("у грузовых вагонов разумные длина и вместимость", () => {
  assert.ok(cargo.length > 50);
  for (const w of cargo) {
    assert.ok(w.length_m >= 3 && w.length_m <= 40, `${w.id}: длина ${w.length_m}`);
    assert.ok(w.capacity > 0 && w.capacity < 1000, `${w.id}: вместимость ${w.capacity}`);
  }
});
test("у доступных вагонов годы заданы корректно", () => {
  for (const w of data.wagons.filter(C.isBuyable)) {
    assert.ok(w.available_to >= w.available_from, w.id);
  }
});

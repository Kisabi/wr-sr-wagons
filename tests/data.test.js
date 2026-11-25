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
test("если годы заданы, они корректны", () => {
  for (const w of data.wagons.filter(C.isListed)) {
    if (typeof w.available_from === "number") assert.ok(w.available_to >= w.available_from, w.id);
  }
});
test("у вагонов со страной есть country_names на всех языках", () => {
  for (const w of data.wagons.filter(x => typeof x.country === "number")) {
    assert.ok(w.country_names, w.id);
    for (const l of ["en", "ru", "pl", "uk"]) assert.ok(w.country_names[l], `${w.id}: ${l}`);
  }
});

test("у покупаемых грузовых вагонов задана валюта", () => {
  for (const w of data.wagons.filter(C.isListed)) {
    assert.ok(w.currency === "rub" || w.currency === "usd", `${w.id}: currency ${w.currency}`);
  }
});

test("у грузовых вагонов есть названия на всех языках", () => {
  for (const w of cargo) {
    assert.ok(w.names, w.id);
    for (const l of ["en", "ru", "pl", "uk"]) assert.ok(w.names[l] && w.names[l].length > 0, `${w.id}: ${l}`);
  }
});

test("превью вагонов существуют и меньше 40 КБ", () => {
  for (const w of data.wagons.filter(x => x.preview)) {
    const f = path.join(__dirname, "../docs", w.preview);
    assert.ok(fs.existsSync(f), `${w.id}: нет файла ${w.preview}`);
    assert.ok(fs.statSync(f).size < 40 * 1024, `${w.id}: ${fs.statSync(f).size} байт`);
  }
});

test("у каждого покупаемого грузового вагона length_m в диапазоне 3–40 м", () => {
  const listed = data.wagons.filter(C.isListed);
  assert.ok(listed.length > 50);
  for (const w of listed) assert.ok(w.length_m >= 3 && w.length_m <= 40, `${w.id}: длина ${w.length_m}`);
});

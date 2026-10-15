// Datensatzname im Menü (CKAN-Titel statt URL-Kürzel) und Datenbeschreibung (Rückfall auf CKAN-notes).
// Treibt app/app.js im node vm mit Stub-DOM und gemocktem fetch (package_show).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const API = 'https://portal.invalid/api/3/action/package_show?id=geschwindigkeitsuberschreitungen';
const STANDARD = 'Hier ist die Beschreibung für die Daten.';

function stubNode() {
  return {
    value: '0', innerHTML: '', disabled: false, isConnected: true,
    classList: { add() {}, remove() {} },
    querySelector() { return null; }, addEventListener() {},
  };
}

function setup(pkgResult, { fetchFails = false } = {}) {
  const calls = [];
  const fetchMock = async (url) => {
    calls.push(String(url));
    if (fetchFails) throw new Error('offline');
    return { ok: true, text: async () => JSON.stringify({ success: true, result: pkgResult }) };
  };
  const nodes = new Map();
  const root = { querySelector(sel) { if (!nodes.has(sel)) nodes.set(sel, stubNode()); return nodes.get(sel); } };
  const document = { createElement() { return Object.assign(stubNode(), { id: '', className: '' }); } };
  const app = vm.createContext({ console, root, document, fetch: fetchMock, AbortController });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/app.js'), 'utf8'), app);
  vm.runInContext('dakiInstanzen.set(root, { disposed: false, controller: new AbortController() });', app);
  Object.assign(app, { appAssetUrl: (x) => x });
  return { app, root, calls };
}

// Menü: Container sammelt Karte; .daki-dsname-Spans werden aus dem gerenderten HTML abgeleitet.
function renderMenu(app, cfg) {
  const children = [];
  const container = Object.assign(stubNode(), {
    appendChild(c) { children.push(c); },
    querySelector() { return stubNode(); },
  });
  app.showFunctionSelectionMenu(container, cfg, 'uid');
  const card = children[0];
  const spans = [];
  card.querySelectorAll = (sel) => {
    assert.equal(sel, '.daki-dsname');
    if (!spans.length) {
      for (const _ of card.innerHTML.matchAll(/<span class="daki-dsname">/g)) spans.push({ textContent: 'unset' });
    }
    return spans;
  };
  return { card, spans: () => card.querySelectorAll('.daki-dsname') };
}

const tick = () => new Promise((r) => setImmediate(r));

test('Menü: URL-Kürzel erscheint sofort, dann ersetzt der CKAN-Titel (mit Umlaut) alle Namensstellen', async () => {
  const { app, calls } = setup({ title: 'Geschwindigkeitsüberschreitungen' });
  const { card, spans } = renderMenu(app, { apiurl: API });
  assert.match(card.innerHTML, /<span class="daki-dsname">Geschwindigkeitsuberschreitungen<\/span>/);
  assert.equal((card.innerHTML.match(/class="daki-dsname"/g) || []).length, 5);
  await tick(); await tick();
  assert.deepEqual(calls, [API]);
  assert.ok(spans().length === 5);
  for (const s of spans()) assert.equal(s.textContent, 'Geschwindigkeitsüberschreitungen');
});

test('Menü: ohne Titel in der Antwort oder bei Fetch-Fehler bleibt das URL-Kürzel (kein unbehandelter Fehler)', async () => {
  for (const variant of [setup({}), setup({ title: 'X' }, { fetchFails: true })]) {
    const { card, spans } = renderMenu(variant.app, { apiurl: API });
    await tick(); await tick();
    for (const s of spans()) assert.equal(s.textContent, 'unset');
    assert.match(card.innerHTML, /Geschwindigkeitsuberschreitungen/);
  }
});

test('Menü: CKAN-Titel wird als textContent gesetzt, nie als HTML', async () => {
  const { app } = setup({ title: '<img src=x onerror=alert(1)>' });
  const { spans } = renderMenu(app, { apiurl: API });
  await tick(); await tick();
  assert.equal(spans()[0].textContent, '<img src=x onerror=alert(1)>');
});

test('Beschreibung: Konfigurationstext hat Vorrang, Standardtext/leer fällt auf CKAN-notes zurück', () => {
  const { app } = setup({});
  const f = app.datenbeschreibungFuer;
  assert.equal(f({ datenbeschreibung: 'Eigener Text' }, { notes: 'CKAN' }), 'Eigener Text');
  assert.equal(f({ datenbeschreibung: STANDARD }, { notes: 'CKAN' }), 'CKAN');
  assert.equal(f({ datenbeschreibung: '' }, { notes: 'CKAN' }), 'CKAN');
  assert.equal(f({}, { notes: 'CKAN' }), 'CKAN');
  assert.equal(f({ datenbeschreibung: STANDARD }, {}), '');
  assert.equal(f({ datenbeschreibung: '' }, null), '');
});

for (const [kind, fn, ds] of [
  ['Allgemeine Analyse', 'loadGeneralAnalysisContent', 'dataset-info'],
  ['Vergleich', 'loadComparisonAnalysisContent', 'dataset-info'],
  ['Suche', 'loadSearchAnalysisContent', 'dataset-info'],
]) {
  test(`${kind}: Infoblock zeigt CKAN-notes escaped; ohne notes „Keine Beschreibung vorhanden.“`, async () => {
    const pkg = { name: 'ds', title: 'T', notes: 'Messdaten <b>&</b> mehr',
      resources: [{ name: 'A', url: 'https://fixture.invalid/a.csv' }] };
    const a = setup(pkg);
    const container = stubNode();
    await a.app[fn](container, { apiurl: API, datenbeschreibung: STANDARD }, a.root, 'uid');
    assert.match(container.innerHTML, new RegExp(ds));
    assert.match(container.innerHTML, /Messdaten &lt;b&gt;&amp;&lt;\/b&gt; mehr/);
    assert.doesNotMatch(container.innerHTML, /Hier ist die Beschreibung/);

    const b = setup({ ...pkg, notes: undefined });
    const container2 = stubNode();
    await b.app[fn](container2, { apiurl: API, datenbeschreibung: '' }, b.root, 'uid');
    assert.match(container2.innerHTML, /Keine Beschreibung vorhanden\./);
  });
}

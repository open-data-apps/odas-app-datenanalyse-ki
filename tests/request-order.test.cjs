// F-121: Testet die tatsächlichen UI-Handler aus app.js mit kontrolliertem KI-/CKAN-Abschluss.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function setup(kind) {
  const nodes = new Map();
  const root = { querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, { value: selector.includes('query') ? 'Suche Alpha' : '0', innerHTML: '', disabled: false, isConnected: true,
      classList: { add() {}, remove() {} }, listeners: {}, querySelector() { return null; },
      addEventListener(event, cb) { (this.listeners[event] ||= []).push(cb); },
      async fire(event) { for (const cb of this.listeners[event] || []) await cb(); },
    });
    return nodes.get(selector);
  } };
  const app = vm.createContext({ console, root });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/app.js'), 'utf8'), app);
  vm.runInContext('dakiInstanzen.set(root, { disposed: false });', app);
  const requests = [];
  const send = () => { const request = deferred(); requests.push(request); return request.promise; };
  Object.assign(app, { sendToAI: send, sendComparisonToAI: send, sendSearchToAI: send, appAssetUrl: x => x });
  const pkg = { resources: [{ name: 'Alpha', url: 'https://fixture.invalid/a.csv' }, { name: 'Beta', url: 'https://fixture.invalid/b.csv' }] };
  app.loadDatasetFromUrl = async () => ({ ok: true, dataset: pkg });
  const method = { general: 'setupGeneralAnalysisEvents', comparison: 'setupComparisonAnalysisEvents', search: 'setupSearchAnalysisEvents' }[kind];
  app[method](pkg, {}, root, 'test');
  const select = root.querySelector({ general: '#daki-resource-select-test', comparison: '#daki-resource1-select-test', search: '#daki-search-resource-select-test' }[kind]);
  const button = root.querySelector({ general: '#daki-analyze-btn', comparison: '#daki-compare-btn', search: '#daki-search-btn' }[kind]);
  const result = root.querySelector({ general: '#daki-analysis-result', comparison: '#daki-comparison-result', search: '#daki-search-result' }[kind]);
  return { app, root, select, button, result, requests };
}
for (const kind of ['general', 'comparison', 'search']) {
  for (const oldError of [false, true]) {
    test(`F-121 ${kind}: alte ${oldError ? 'Fehlerantwort' : 'Antwort'} überschreibt neuere Analyse nicht`, async () => {
      const s = setup(kind);
      if (kind === 'comparison') await s.root.querySelector('#daki-load-dataset2-btn').fire('click');
      const old = s.button.fire('click');
      s.select.value = '1'; await s.select.fire('change');
      const current = s.button.fire('click');
      s.requests[1].resolve({ result: 'NEW-RESULT-B' }); await current;
      s.requests[0].resolve(oldError ? { error: true, message: 'OLD-ERROR-A' } : { result: 'OLD-RESULT-A' }); await old;
      assert.match(s.result.innerHTML, /NEW-RESULT-B/);
      assert.doesNotMatch(s.result.innerHTML, /OLD-/);
    });
  }
  test(`F-121 ${kind}: Auswahlwechsel ohne neue Anfrage verwirft laufendes und sichtbares Ergebnis`, async () => {
    const s = setup(kind);
    if (kind === 'comparison') await s.root.querySelector('#daki-load-dataset2-btn').fire('click');
    const old = s.button.fire('click');
    s.select.value = '1'; await s.select.fire('change');
    s.requests[0].resolve({ result: 'OLD-RESULT-A' }); await old;
    assert.equal(s.result.innerHTML, '');
    const current = s.button.fire('click');
    s.requests[1].resolve({ result: 'RESULT-B' }); await current;
    s.select.value = '0'; await s.select.fire('change');
    assert.equal(s.result.innerHTML, '');
  });
}
test('F-121 Suche: geänderter Text ohne neuen Start invalidiert das Ergebnis', async () => {
  const s = setup('search'); const old = s.button.fire('click');
  const query = s.root.querySelector('#daki-search-query-test'); query.value = 'Suche Beta'; await query.fire('input');
  s.requests[0].resolve({ result: 'OLD-QUERY' }); await old;
  assert.equal(s.result.innerHTML, '');
});
test('F-121 Vergleich: zweite Ressource invalidiert laufende Analyse', async () => {
  const s = setup('comparison'); await s.root.querySelector('#daki-load-dataset2-btn').fire('click');
  const old = s.button.fire('click'); const second = s.root.querySelector('#daki-resource2-select');
  second.value = '1'; await second.fire('change');
  s.requests[0].resolve({ result: 'OLD-SECOND' }); await old;
  assert.equal(s.result.innerHTML, '');
});
test('F-121 Vergleich: später Datensatz-Abruf darf die neuere zweite Quelle nicht ersetzen', async () => {
  const s = setup('comparison'); const loads = [];
  s.app.loadDatasetFromUrl = () => { const d = deferred(); loads.push(d); return d.promise; };
  const url = s.root.querySelector('#daki-dataset2-url'), load = s.root.querySelector('#daki-load-dataset2-btn');
  url.value = 'https://fixture.invalid/api/3/action/package_show?id=a'; await url.fire('input'); const old = load.fire('click');
  url.value = 'https://fixture.invalid/api/3/action/package_show?id=b'; await url.fire('input'); const current = load.fire('click');
  loads[1].resolve({ ok: true, dataset: { resources: [{ name: 'SECOND-B', url: 'https://fixture.invalid/b.csv' }] } }); await current;
  loads[0].resolve({ ok: true, dataset: { resources: [{ name: 'SECOND-A', url: 'https://fixture.invalid/a.csv' }] } }); await old;
  assert.match(s.root.querySelector('#daki-resource2-select').innerHTML, /SECOND-B/);
  assert.doesNotMatch(s.root.querySelector('#daki-resource2-select').innerHTML, /SECOND-A/);
});
test('F-120 Vergleich: zweiter Datensatz ohne Ressourcen zeigt Leerzustand statt Erfolg', async () => {
  const s = setup('comparison');
  s.app.loadDatasetFromUrl = async () => ({ ok: true, dataset: { resources: [] } });
  s.root.querySelector('#daki-dataset2-url').value = 'https://fixture.invalid/api/3/action/package_show?id=leer';
  await s.root.querySelector('#daki-load-dataset2-btn').fire('click');
  const status = s.root.querySelector('#daki-dataset2-status').innerHTML;
  assert.doesNotMatch(status, /erfolgreich geladen/);
  assert.match(status, /alert alert-info/);
  assert.match(status, /keine Ressourcen gefunden/);
  assert.equal(s.root.querySelector('#daki-resource2-select').disabled, true);
  assert.equal(s.button.disabled, true);
});

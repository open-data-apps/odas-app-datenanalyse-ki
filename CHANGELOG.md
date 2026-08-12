# Changelog

## 1.24.0 - 2026-08-12
- FIX: Aus `apiurl`/`urlDaten` abgeleitete Datensatznamen werden HTML-escaped, bevor sie in innerHTML-Sinks landen (F-49)

## 1.23.0 - 2026-08-11
- FIX: Ladeanimation aus dem Geschwister-Assetverzeichnis laden: die sechs Lottie-Player nutzen jetzt `appAssetUrl("assets/loading.json")` statt `${getOdasAppBasePath()}/assets/loading.json` — letzteres zeigte in der ODAS-Live-Auslieferung auf `/app/assets/loading.json` und erzeugte einen 404, weil `assets/` Geschwister von `app/` ist (Review-Restfix)

## 1.22.0 - 2026-08-11
- FIX: Konfigurierbare Datenbeschreibung wird in allen drei Analyseansichten HTML-escaped; der aus `apiurl` abgeleitete Dataset-Link wird nur bei gültigem HTTP(S)-Schema gerendert (F-35-Nachtrag)

## 1.21.0 - 2026-08-11
- FIX: XSS- und URL-Vertrag geschlossen (F-35): `safeHttpUrl` als Top-Level-Helfer ergänzt; alle untrusted→HTML-Sinks auf `escapeHtml` umgestellt — Fehlermeldungen (`err.message`), Datensatztitel, Ressourcennamen in `<option>`, Ressourcenbeschreibungen, KI-Ergebnisse (`aiData.result`; nur Escaping, keine Formatierung) und Suchbegriffe (`query`)

## 1.20.0 - 2026-08-07
- FIX: Bootstrap-Ziele der Methodik-Box instanzeindeutig machen (F-32): `data-bs-target`, `aria-controls` und die Panel-ID tragen jetzt eine Instanzkennung (`-i1`, `-i2`, …); die uid wird am `app()`-Einstieg als lokale Konstante eingefroren und an den Render-Helfer durchgereicht — zwei App-Instanzen auf einer Seite kollidieren beim Auf- und Zuklappen der Methodik-Box nicht mehr, auch wenn sie gleichzeitig laden.

## 1.19.0 - 2026-08-07
- FIX: Die drei Analyse-Lader übergeben `root` jetzt an `loadGeneralAnalysisContent`/`loadComparisonAnalysisContent`/`loadSearchAnalysisContent` (F-25-Regression aus Tranche 3, beim Browsernachweis gefunden): `fd5fe83` hatte die Signaturen um den `root`-Parameter erweitert, die Aufrufe in `showGeneralAnalysis`/`showComparisonAnalysis`/`showSearchAnalysis` aber nicht mitgezogen — dadurch warf `setup…AnalysisEvents` mit `root.querySelector` einen TypeError und keine der drei Analysen öffnete ihre Bedienelemente.

## 1.18.0 - 2026-08-06
- CHG: DOM-Zugriffe auf den App-Container gescopt (F-25, Tranche 3): alle Elemente der App werden über den App-Container (container/root.querySelector) angesprochen statt über document; unpräfixierte IDs mit `daki-`-Präfix versehen (`general-analysis-btn` → `daki-general-analysis-btn`, `comparison-analysis-btn` → `daki-comparison-analysis-btn`, `search-analysis-btn` → `daki-search-analysis-btn`, `general-analysis-content` → `daki-general-analysis-content`, `resource-select` → `daki-resource-select`, `resource-desc` → `daki-resource-desc`, `analyze-btn` → `daki-analyze-btn`, `analyze-info` → `daki-analyze-info`, `analysis-result` → `daki-analysis-result`, `comparison-analysis-content` → `daki-comparison-analysis-content`, `resource1-select` → `daki-resource1-select`, `resource1-desc` → `daki-resource1-desc`, `load-dataset2-btn` → `daki-load-dataset2-btn`, `dataset2-url` → `daki-dataset2-url`, `dataset2-status` → `daki-dataset2-status`, `compare-btn` → `daki-compare-btn`, `resource2-select` → `daki-resource2-select`, `comparison-result` → `daki-comparison-result`, `search-analysis-content` → `daki-search-analysis-content`, `search-resource-select` → `daki-search-resource-select`, `search-resource-desc` → `daki-search-resource-desc`, `search-btn` → `daki-search-btn`, `search-query` → `daki-search-query`, `search-result` → `daki-search-result`); der Selektor `.function-selection-card` wird über den App-Container gescopt (kein Rename, Klasse); der Helper `populateResourceSelect` präfixiert seine ID an einer Stelle (root-Parameter)

## 1.17.0 - 2026-08-06
- FIX: Datenschutzangabe beschreibt den tatsaechlichen Stand nach dem Vendoring (Welle G)

## 1.16.0 - 2026-08-06
- FIX: Drittanbieterliste "Beim Aufruf kontaktierte Drittanbieter" entfernt — alle Programmbibliotheken liegen jetzt lokal in `app/vendor/`, beim Aufruf werden keine externen Bibliotheksserver mehr kontaktiert

## 1.15.0 - 2026-08-06
- FIX: Font Awesome und Lottie Player vendored in `app/vendor/` statt von CDN geladen (Vendoring Teil 3) — Standalone-Betrieb laedt die Zusatzbibliotheken nicht mehr extern
- FIX: Font-Awesome-`all.min.css` bereinigt: der ueberfluessige `.ttf`-Fallback (10 `format("truetype")`-Referenzen, ca. 642 KB) entfernt — einzige Aenderung an einer Fremdbibliothek dieser Welle; `woff2`-Dateien (4) bleiben unveraendert, die `../webfonts/`-Struktur bleibt erhalten

## 1.14.0 - 2026-08-06
- FIX: Lottie Player auf @2.0.12 exakt gepinnt (vorher @latest — bei jedem Aufruf eine andere Version, Voraussetzung fuer Vendoring)

## 1.13.0 - 2026-08-06
- FIX: Base auf Template oda-generic 1.6.0 vereinheitlicht (Hook renderPageOverride)

## 1.12.0 - 2026-08-04
- FIX: Datenschutzhinweis "Beim Aufruf kontaktierte Drittanbieter" an das Vendoring angepasst — jetzt lokal ausgelieferte Bibliotheken (Bootstrap/Leaflet/Chart.js) sind aus der Liste entfernt, weiterhin extern geladene Dienste (Kartenkacheln, Zusatzbibliotheken) bleiben genannt

## 1.11.0 - 2026-08-04
- FIX: Bootstrap vendored in `app/vendor/` statt von CDN geladen (F-07 Teil 2) — Standalone-Betrieb laedt diese Bibliotheken nicht mehr extern

## 1.10.0 - 2026-08-04
- FIX: Drittanbieter (CDN, Kartendienste) in `datenschutz`-Default und README dokumentiert (F-07 Teil 1)
- FIX: Bootstrap CSS/JS auf einheitlich 5.3.8 gezogen (vorher gemischt 5.3.0/5.3.1 bzw. 5.3.0/5.3.0) (F-31)

## 1.9.0 - 2026-07-31
- CHG: ZIP-Name auf die Konvention `${current_dir}.zip` umgestellt (F-22) - das
  Liefer-Artefakt heisst jetzt `odas-app-datenanalyse-ki.zip` statt
  `odas-app-ki-analyse.zip`

## 1.8.0 - 2026-07-31
- DOC: Abschnitt „Einschraenkung im Standalone-Betrieb" ergaenzt (F-04) - die KI-Analyse
  benoetigt den ODAS-Dienst `…/ai` und steht standalone nicht bereit
- DOC: Denselben Hinweis in die App-Beschreibung („Ueber diese App") aufgenommen

## 1.7.0 - 2026-07-31
- FIX: KI-Endpunkte und Lottie-Ladeanimation nutzen getOdasAppBasePath() statt window.location.href - die URLs enthielten das Hash-Fragment und zeigten ins Leere (F-05)
- FIX: aiResp.ok wird vor dem JSON-Parsen geprueft, damit ein HTML-Antwortkoerper nicht als Parse-Fehler verschleiert wird (F-05)
- CHG: fehlendes Pflicht-Asset assets/branding.css ergaenzt und brandingCSSFile lokal aktiviert

## 1.6.0 - 2026-07-31
- CHG: toter Konfigurationsschlüssel lizenz entfernt (F-17)
- CHG: brandingCSS und brandingCSSFile als Base-Abhängigkeiten deklariert und lokal gespiegelt (F-17)
- CHG: datenbeschreibung in die lokale Konfiguration gespiegelt (F-17)
- CHG: format.typ von "String" auf v1-sicheres "string" korrigiert (F-18)
- CHG: dropdown-Default auf Feldebene verschoben statt in format (F-18)
- CHG: daten.schema auf assets/schema.json gesetzt (F-20)
- CHG: assets/schema.json auf ein flaches Frictionless Table Schema gebracht (F-20)

## 1.5.0 - 2026-07-30

- **FIX:** Laufzeitfehler nach dem Laden der Konfiguration werden jetzt sichtbar gemeldet; `handleRouting()` wird `await`et und besitzt einen Fehlerpfad. Bisher blieb die Seite bei einem Fehler im Seitenaufbau stumm leer
- **FIX:** `getConfigUrl()` schneidet bei einer URL ohne abschliessenden Schraegstrich nicht mehr das letzte Verzeichnis ab; die Konfiguration wird auch unter `.../app` gefunden
- **FIX:** Klick auf einen Hash-Link, der bereits die aktive Seite bezeichnet, rendert die Seite neu (`setupSamePageLinks()`) - das Logo fuehrt damit aus Unteransichten zurueck zur Startseite
- **ENH:** `app/app-base.js` ist wieder byte-identisch zum Template `oda-generic` 1.4.0; app-spezifisches Aufraeumen laeuft ueber den neuen Hook `onPageLeave(page)` in `app/app.js`

## 1.4.0 - 2026-07-24

- **FIX:** Laufzeit-Fehlermeldung wird vor der Anzeige HTML-maskiert (`escapeHtmlForBase`); ein Fehlertext kann kein Markup mehr in die Seite einschleusen (XSS)
- **FIX:** Startseiten-Renderer wird nun `await`et; bei asynchronen Apps erscheint kein kurzzeitiges `[object Promise]` in `#main-content`

## 1.3.0 - 2026-07-23

- **ENH:** Datenabruf auf den Schalter `proxyAktiv` umgestellt; direkte Abrufe sind der Standard, der ODAS-Proxy wird nur noch bei `ja` verwendet
- **ENH:** Einfachen Standalone-Betrieb hinter Traefik mit derselben `odas-config/config.json` wie in der Entwicklung ergänzt
- **ENH:** Traefik-Anbindung auf das externe Netzwerk `proxynet`, den EntryPoint `websecure` und den Zertifikatsresolver `letsencrypt` festgelegt
- **FIX:** Proxy-Basispfad funktioniert jetzt auch bei URLs mit `index.html`; der Ziel-Pfad wird URL-kodiert
- **FIX:** Drei doppelte extractPathFromUrl-Definitionen zu einer kanonischen zusammengeführt
- **DOC:** Start über `STANDALONE=true make up` dokumentiert

## ToDo

-

## 05.05.2025

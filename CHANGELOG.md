# Changelog

## 1.36.12 - 2026-10-15
- FIX: Kopfzeile bei 360 px ohne Überlauf (Template): Logo- und Burger-Spalte passen sich der Breite an, das Menü-Symbol ragt nicht mehr über den rechten Rand. Keine Änderung an App-Code oder Konfiguration.

## 1.36.11 - 2026-10-15
- FIX: Das Funktionsmenü zeigt den Datensatznamen jetzt mit dem Titel des Datenportals (z. B. „Geschwindigkeitsüberschreitungen“ mit Umlaut) statt des aus der URL abgeleiteten Kürzels, ebenso die Überschrift der Allgemeinen Analyse; das Kürzel bleibt Rückfall, solange der Titel nicht geladen ist.
- FIX: Der Standardtext der „Daten-Beschreibung“ ist jetzt leer. Ist keine eigene Beschreibung gepflegt (oder noch der frühere Platzhalter „Hier ist die Beschreibung für die Daten.“ gespeichert), zeigt die App die Beschreibung des Datensatzes aus dem Datenportal an.

## 1.36.10 - 2026-10-15
- DOCS: Neue Store-Screenshots: je drei Desktop- (1440 × 1000) und Mobile-Aufnahmen (390 × 844) der aktuellen App, aufgenommen auf der Dev-Instanz. Bisherige Bilder nach `docs/screenshots/archive/2026-10-13/` verschoben. Keine Änderung an App-Code oder Konfiguration.

## 1.36.9 - 2026-10-13
- FIX: Standard-Fehleranzeige gibt präzisere Tipps: ein „Failed to fetch“ ohne Proxy-Kontext erhält einen Netzwerk-Hinweis statt `proxyAktiv`; der 404-Hinweis gilt nur noch für echte HTTP-404-Antworten und nennt den lokal fehlenden Proxy/Relay statt pauschal „Datensatz auf dem Portal nicht gefunden“.

## 1.36.8 - 2026-10-13
- FIX: F-162: „Zurück zur Funktionsauswahl“ während des Metadatenabrufs erzeugt keinen JavaScript-Fehler mehr; späte Antworten füllen den entfernten Bereich nicht.

## 1.36.7 - 2026-10-08
- FIX: F-121: Allgemeine Analyse, Vergleich und Suche verwerfen ältere Antworten sowie Ergebnisse zu geänderter Ressource/Suchanfrage.
- FIX: F-121: Zweiter Datensatz hat eine eigene Abrufgeneration; geänderte URL oder erneutes Laden invalidiert alten Datensatz und Vergleich. Entfernte Ergebnisfelder erhalten keine späten Antworten.
- FIX: F-120 (Rest): Zweiter Datensatz ohne Ressourcen zeigt einen Leerhinweis statt „Datensatz erfolgreich geladen“; Ressourcenauswahl und Vergleich bleiben gesperrt.

## 1.36.6 - 2026-10-02
- ENH: Verwendete ODAS-Dienste in `odas-services` deklariert.

## 1.36.5 - 2026-09-29
- **FIX:** Audit F-120: Vergleichsanalyse ohne gültige zweite Ressource startete trotzdem und blieb bei „Vergleichsanalyse läuft..." hängen (TypeError). Start-Button wird nur mit geladenem zweiten Datensatz mit Ressourcen freigegeben; Klick ohne Ressourcen zeigt eine sichtbare Aufforderung statt des Ladezustands (Browser nachgewiesen).

## 1.36.4 - 2026-09-10
- **FIX (KI-B1):** Die App hatte keinerlei Lifecycle-Schutz. Jetzt gibt es `onPageLeave` mit Instanz-Registry, `disposed`-Guard und `AbortController`: Ein laufender `/ai`-POST (bis 90 s) wird beim Seitenwechsel abgebrochen, und späte Fortsetzungen schreiben nicht mehr in den dann fremden Container. Damit ist der letzte offene Fall der F-57/F-70-Klasse geschlossen.
- **FIX (KI-B2):** Das Breiten-Layout lag als Inline-Style auf dem geteilten `#main-content` und blieb sitzungsweit hängen (app-base ersetzt nur `innerHTML`). Jetzt eine Klasse (`.daki-container`), die der Teardown entfernt; auf kleinen Bildschirmen greift die Breite nicht mehr.
- **FIX (KI-B3):** Die Prompts forderten HTML-Formatierung, die Ausgabe wird aber escaped als Text gerendert — Nutzer sahen `<h3>`/`<ul>` als Klartext. Die Prompts verlangen jetzt einfachen Text mit Absätzen und Aufzählungen; das Escaping bleibt (keine neue XSS-Senke).
- **FIX (KI-B4):** `loadDatasetFromUrl` meldete Fehler per nativem `alert()`. Jetzt liefert die Funktion ein Ergebnisobjekt, und der Aufrufer zeigt die Meldung über `renderOdasFehler`.
- **FIX (KI-B5):** FontAwesome und Lottie werden per `ladeUiBibliotheken()` mit Element-id und Fehlerpfad geladen statt per `addToHead()` ohne Rückmeldung; `addToHead` gibt `""` zurück.
- **TECH (KI-B6):** `isLeerErgebnis` entfernt; ungenutzter Parameter `datasetTitle` aus `sendToAI` entfernt (der Prompt nutzt ihn nicht); `datasetId` wird beim Bau der `package_show`-URL encodiert.
- **DOC:** README-Abschnitt „Funktionen" beschrieb noch den Template-Zustand („zeigt Ihre Konfiguration im JSON Format an") und listet jetzt die drei tatsächlichen KI-Funktionen.

## 1.36.3 - 2026-09-10
- **FIX:** `rel="noopener"` an allen 6 `target="_blank"`-Links nachgetragen (H-2, Tabsicherheit-Härtung ohne Verhaltensänderung).

## 1.36.2 - 2026-09-08
- **FIX:** Variante-A-Verdrahtung (F-92): Typprüfung (ckan-ps) vor dem ersten Fetch; alle drei Ladefehler-Pfade über `renderOdasFehler` (1.36.1 -> 1.36.2).

## 1.36.1 - 2026-09-07
- **FIX:** Frictionless-Härtung: `daten.beispiel`/`beispiel-url` befüllt (Schema beschreibt belegt die package_show-Ressourcenauswahl). package_show-Default bleibt (4B-Ausnahme: Metadaten-Antwort nicht tabellarisch validierbar, Rot-Beleg im REPORT).

## 1.36.0 - 2026-08-25
- **CHG:** Datensatz-Links in der Beschreibung nutzen den neuen Shortcode `{{{appinstanz.urlDaten}}}` und zeigen damit auf den tatsächlich gebuchten Datensatz statt auf feste Beispiel-URLs.
- **FIX:** `urlDaten`-Beispielwert korrigiert: verwies fälschlich auf den Müllkalender-Datensatz, jetzt auf den eigenen Datensatz „Geschwindigkeitsüberschreitungen“.


## 1.35.0 - 2026-08-25
- **CHG:** Proxy-Aufruf sendet die vollständige Ziel-URL statt nur Pfad+Query, damit die neue Origin-Allowlist-Prüfung der ODAS-Plattform greift (bisher implizite Auflösung gegen den ersten konfigurierten `apiurl`).
- **FIX:** Tote Anbieter-Shortcodes in Kontakt/Impressum ersetzt (`{{odp.anbieter.url-extern}}` → `{{odp.anbieter.url}}`, `tel:{{odp.anbieter.telcode}}` → `tel:{{odp.anbieter.tel}}`).


## 1.34.0 - 2026-08-25
- **FIX:** `urlDaten` verlinkt jetzt die Datensatzseite (`/dataset/…`) statt der Ressourcenseite – Standard „Eine Quelle = eine vollständige URL“, R4.

## 1.33.0 - 2026-08-22
- **CHG:** `version` in `app-package.json` zu `app-version` umbenannt.
- **ENH:** Top-Level-Feld `app-package-version` ergänzt (Wert `"2"`: mehrere benannte API-URLs über `instanz-config.apiurls`).

## 1.32.0 - 2026-08-21
- **CHG:** Skalares `apiurl` durch das Array-Feld `apiurls` ersetzt (`typ: "array"`, Eintrag `analysedaten`). Neuer Standard portfolioweit; `apiurl` entfällt. `app.js` liest die Datenquelle jetzt über `getOdasApiUrl(configdata, "analysedaten")`.

## 1.31.0 - 2026-08-20
- Markdown-Metadaten: Paketbeschreibungen auf echtes Markdown umgestellt, exakte Identität Top-Level/Instanz hergestellt, lokale HTML-Fixture semantisch gespiegelt.

## 1.30.0 - 2026-08-20
- FIX: KI-Anfragen (`sendToAI`/`sendComparisonToAI`/`sendSearchToAI`) hatten keinen Timeout/Abort — bei hängendem Backend blieb die App unbegrenzt im Ladezustand; jetzt 90s-Timeout mit AbortController und Fehlermeldung (F-79)
- FIX: KI-Fehlerantworten wurden wie ein erfolgreiches Ergebnis inklusive Gemini-Credit-Hinweis angezeigt; Fehler sind jetzt strukturell unterscheidbar und werden ohne Erfolgs-Framing dargestellt (F-88)

## 1.29.0 - 2026-08-17
- `apiurl.hilfe` verwendete das Wort „Datensatz" für das Feld, das explizit NICHT die Datensatzseite sein soll (plus Tippfehler „Ressoucen"); jetzt mit expliziter Abgrenzung zu `urlDaten` formuliert (F-68)

## 1.28.0 - 2026-08-17
- `fetchOdasJson()` wirft jetzt bei nicht-JSON-Antworten (CSV, HTML, leerer Body) eine sprechende Konfigurationsfehlermeldung statt der rohen `JSON.parse`-Parserfehlermeldung (F-66)

## 1.27.0 - 2026-08-17
- **CHG:** `instanz-config`-`category`-Vokabular auf Deutsch umgestellt (`allgemein`, `beschreibung`, `datenherkunft`, `kontakt-rechtliches`, `sonstiges`); die entfallenen Kategorien `metrics` und `advanced` wurden auf `beschreibung` bzw. `sonstiges` verteilt

## 1.26.0 - 2026-08-12
- FIX: HTML-Escaping der Datensatznamen von der Quellfunktion an die sechs innerHTML-Sinks verlagert — die Absicherung ist jetzt an der Fundstelle sichtbar und vom herkunftsbasierten Sink-Check prüfbar (F-52b)


## 1.25.0 - 2026-08-12
- FIX: `app/index.html` auf den Template-Stand (F-47): Datei byte-gleich aus `oda-generic` übernommen — gültiges HTML, deutsche ARIA-Labels, Footer im Body; Titel und Fußzeile bleiben Platzhalter und werden zur Laufzeit aus der Instanz-Config überschrieben

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

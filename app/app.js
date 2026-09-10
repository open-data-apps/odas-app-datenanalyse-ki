let dakiInstanzZaehler = 0;

// F-57/KI-B1: Instanz-Registry je Container (Portfolio-Muster). Die App hatte
// bisher keinerlei Lifecycle-Schutz: ein laufender /ai-POST (bis 90 s) wurde
// beim Seitenwechsel weder abgebrochen noch verworfen.
const dakiInstanzen = new Map();

function onPageLeave() {
  dakiInstanzen.forEach(function (zustand) {
    try {
      zustand.abmelden();
    } catch (error) {
      console.warn("Fehler beim Abraeumen der KI-Analyse-Instanz:", error);
    }
  });
  dakiInstanzen.clear();
}

function zustandFuer(root) {
  return (root && dakiInstanzen.get(root)) || null;
}

// Nach einem Seitenwechsel darf keine spaete Fortsetzung mehr in den (dann
// fremden) Container schreiben.
function istVerworfen(root) {
  const zustand = zustandFuer(root);
  return !zustand || zustand.disposed;
}

function signalFuer(root) {
  const zustand = zustandFuer(root);
  return zustand ? zustand.controller.signal : undefined;
}

// Client-seitiges Timeout für /ai-Aufrufe (F-79): verhindert unbegrenztes
// Hängenbleiben im Ladezustand, falls das ODAS-Backend nicht antwortet.
const AI_REQUEST_TIMEOUT_MS = 90000;

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHttpUrl(value) {
  const s = String(value || "").trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

// Rendert einen KI-Fehler strukturell abweichend von der Erfolgs-Ergebniskarte
// (F-88): kein Gemini-Credit-Hinweis, warnend gestaltet, mit Retry-Möglichkeit,
// die dieselbe Analyse erneut anstößt (F-79).
function renderAiErrorCard(resultDiv, message, onRetry) {
  resultDiv.innerHTML = `
    <div class="alert alert-danger" role="alert">
      <i class="fas fa-exclamation-triangle me-2"></i>
      ${escapeHtml(message || "Bei der KI-Anfrage ist ein Fehler aufgetreten.")}
      <div class="mt-2">
        <button type="button" class="btn btn-sm btn-outline-danger daki-ai-retry-btn">
          <i class="fas fa-redo me-1"></i>Erneut versuchen
        </button>
      </div>
    </div>`;
  const retryBtn = resultDiv.querySelector(".daki-ai-retry-btn");
  if (retryBtn && typeof onRetry === "function") {
    retryBtn.addEventListener("click", onRetry);
  }
}

function appAssetUrl(relativePath) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";

  let pathname = url.pathname;
  if (!pathname.endsWith("/")) {
    pathname = pathname.substring(0, pathname.lastIndexOf("/") + 1);
  }
  if (pathname.endsWith("/app/")) {
    pathname = pathname.slice(0, -4);
  }

  return url.origin + pathname + relativePath.replace(/^\/+/, "");
}

function renderWeitereInfos(configdata) {
  const links = String(configdata.weiterfuehrendeLinks || "").trim();
  if (!links) return "";
  return (
    '<section class="daki-weitere-infos mt-4">' +
    '<h2 class="h5 mb-3">Weitere Informationen</h2>' +
    '<div class="daki-weitere-infos-content">' +
    links +
    "</div></section>"
  );
}

function renderMethodikbox(configdata, dakiUid) {
  const hinweis = String(configdata.datenquelleHinweis || "").trim();
  const stand = String(configdata.datenStand || "").trim();
  if (!hinweis && !stand) return "";
  const standHtml = stand
    ? '<p class="text-muted small mb-2">' + escapeHtml(stand) + "</p>"
    : "";
  return (
    '<section class="daki-methodik mt-3">' +
    '<button class="daki-methodik-toggle collapsed" type="button" ' +
    'data-bs-toggle="collapse" data-bs-target="#daki-methodik-body-' + dakiUid + '" ' +
    'aria-expanded="false" aria-controls="daki-methodik-body-' + dakiUid + '">' +
    '<h2 class="h5 mb-0">Methodik &amp; Datenquelle</h2>' +
    '<span class="daki-methodik-chevron" aria-hidden="true">&#9662;</span>' +
    "</button>" +
    '<div id="daki-methodik-body-' + dakiUid + '" class="collapse">' +
    '<div class="daki-methodik-content">' +
    standHtml +
    hinweis +
    "</div></div></section>"
  );
}

function isOdasProxyEnabled(configdata = {}) {
  return String(configdata.proxyAktiv || "").trim().toLowerCase() === "ja";
}

function extractPathFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname + parsedUrl.search;
  } catch (_error) {
    return String(url || "");
  }
}

function getOdasAppBasePath(pathname) {
  let appPath =
    pathname === undefined
      ? typeof window !== "undefined"
        ? window.location.pathname
        : "/"
      : String(pathname || "/");

  if (!appPath.endsWith("/")) {
    const lastSlashIndex = appPath.lastIndexOf("/");
    const lastSegment = appPath.substring(lastSlashIndex + 1);
    if (lastSegment.includes(".")) {
      appPath = appPath.substring(0, lastSlashIndex + 1);
    }
  }

  return appPath.replace(/\/+$/, "");
}

function getOdasProxyEndpoint(targetUrl, pathname) {
  const appPath = getOdasAppBasePath(pathname);
  return `${appPath}/odp-data?path=${encodeURIComponent(targetUrl)}`;
}

async function fetchViaOdasProxy(targetUrl, options = {}) {
  if (typeof isKeineDatenquelleKonfiguriert === "function" && isKeineDatenquelleKonfiguriert(targetUrl)) {
    throw new Error("Keine Datenquelle konfiguriert.");
  } else if (typeof isKeineDatenquelleKonfiguriert !== "function") {
    const v = String(targetUrl || "").trim();
    if (!v || /^\{\{.*\}\}$/.test(v) || /^<.*>$/.test(v)) throw new Error("Keine Datenquelle konfiguriert.");
  }

  const response = await fetch(getOdasProxyEndpoint(targetUrl), {
    method: "POST",
    signal: options && options.signal ? options.signal : undefined,
  });

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch (_e) {}
    const originHint = /origin not allowed/i.test(body) ? " – URL origin not allowed" : "";
    throw new Error(`ODAS-Proxy-Fehler: HTTP ${response.status}${originHint}`);
  }

  const proxyData = await response.json();
  if (!proxyData || typeof proxyData.content !== "string") {
    throw new Error("ODAS-Proxy-Antwort enthält keinen content-String.");
  }

  return proxyData.content;
}

async function fetchOdasResource(targetUrl, configdata = {}) {
  if (isOdasProxyEnabled(configdata)) {
    return fetchViaOdasProxy(targetUrl);
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  } catch (error) {
    throw new Error(
      `Direkter Datenabruf fehlgeschlagen (${error.message}). Bitte prüfen Sie die Daten-URL und die CORS-Freigabe der Datenquelle.`,
    );
  }
}

/**
 * Löst eine benannte Datenressource aus configdata.apiurls auf.
 * Neue apiurls-Form (typ: "array"); das frühere skalare apiurl wird nicht mehr gelesen.
 * @returns {string} getrimmte URL, oder "" für den Zustand "keine Quelle konfiguriert"
 */
function getOdasApiUrl(configdata, name) {
  const liste = Array.isArray(configdata && configdata.apiurls) ? configdata.apiurls : [];
  const treffer = liste.find((eintrag) => eintrag && eintrag.name === name);
  return String((treffer && treffer.url) || "").trim();
}

async function fetchOdasJson(targetUrl, configdata = {}) {
  const rawContent = await fetchOdasResource(targetUrl, configdata);
  try {
    return JSON.parse(rawContent);
  } catch (_error) {
    throw new Error(
      `Die konfigurierte Daten-URL liefert kein JSON, sondern ${describeNonJsonPayload(rawContent)}. ` +
        "Bitte in der Instanzkonfiguration den API-Endpunkt der Datenquelle eintragen, " +
        "nicht den Datensatz- oder Download-Link.",
    );
  }
}

function describeNonJsonPayload(rawContent) {
  const text = String(rawContent == null ? "" : rawContent).trim();
  if (!text) return "eine leere Antwort";
  if (text.startsWith("<")) return "eine HTML-Seite";
  const firstLine = text.split(/\r?\n/, 1)[0];
  if (/[,;]/.test(firstLine)) return "eine CSV- oder Textdatei";
  return "unlesbaren Inhalt";
}

function isKeineDatenquelleKonfiguriert(targetUrl) {
  const quelle = String(targetUrl || "").trim();
  return !quelle || /^\{\{.*\}\}$/.test(quelle) || /^<.*>$/.test(quelle);
}


const TYP_BEZEICHNUNG = {
  "ckan-dkan-ds": "Tabellen-API mit Daten-ID",
  "ckan-ps": "Datensatz-API",
  "ckan-dl": "Datei-Download",
  "ods21": "Open-Data-Suche (API v2.1)",
  "wfs": "Kartendienst (WFS)",
  "sparql": "Wissensdatenbank (SPARQL)",
  "csv-zip": "Statische Datei"
};

function validateUrlTypErwartung(url, erwarteterTyp) {
  const u = String(url || "");
  if (!erwarteterTyp || isKeineDatenquelleKonfiguriert(u)) return null;
  const checks = {
    "ckan-dkan-ds": /\/api\/3\/action\/datastore_search\?resource_id=/i,
    "ckan-ps": /\/api\/3\/action\/package_show\?id=/i,
    "ckan-dl": /\/dataset\/.*\/resource\/.*\/download\//i,
    "ods21": /\/api\/explore\/v2\.1\//i,
    "wfs": /service=WFS/i,
    "sparql": /\/api\/ts\/v1\/kg\/sparql/i,
    "csv-zip": /\.(csv|json|zip)(\?|$)/i
  };
  const re = checks[erwarteterTyp];
  if (!re) return null;
  if (!re.test(u)) {
    const soll = TYP_BEZEICHNUNG[erwarteterTyp] || erwarteterTyp;
    return `Typ passt nicht: erwartet „${soll}", erhalten „${u.slice(0, 60)}…". Prüfen Sie den Hilfe-Tooltip bei „URLs zu Datenressourcen".`;
  }
  return null;
}

function classifyOdasFehler(error, kontext = {}) {
  const msg = String((error && error.message) || error || "");
  const url = String(kontext.url || "");
  const label = String(kontext.label || "Datenressource");
  const typLabel = String(kontext.typLabel || TYP_BEZEICHNUNG[kontext.erwarteterTyp] || "Datenquelle");
  if (/Keine Datenquelle konfiguriert/i.test(msg) || isKeineDatenquelleKonfiguriert(url)) {
    return {
      kind: "KEINE_QUELLE",
      titel: "Es ist keine Datenquelle konfiguriert.",
      hinweis: `Prüfen Sie unter „URLs zu Datenressourcen → ${label}" ob eine gültige ${typLabel}-URL eingetragen ist (Hilfe-Tooltip beachten).`,
      detail: msg,
      alertClass: "alert-info"
    };
  }
  if (/Typ passt nicht: erwartet/i.test(msg)) {
    return {
      kind: "TYP_MISMATCH",
      titel: msg,
      hinweis: `Diese App erwartet ${typLabel}. Korrigieren Sie die URL gemäß Hilfe-Tooltip (Beispiel dort).`,
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/URL origin not allowed/i.test(msg)) {
    return {
      kind: "PROXY_ORIGIN",
      titel: "ODAS-Proxy blockiert: Ziel-Origin nicht freigegeben.",
      hinweis: "Tragen Sie die Ziel-Origin als eigenen Eintrag unter „URLs zu Datenressourcen“ ein oder prüfen Sie proxyAktiv.",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/ODAS-Proxy-Fehler/i.test(msg) || /kein content-String/i.test(msg)) {
    return {
      kind: "PROXY_HTTP",
      titel: msg,
      hinweis: "Prüfen Sie proxyAktiv und Erreichbarkeit im ODAS-Live-System (lokal 404 ist normal).",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/Direkter Datenabruf fehlgeschlagen/i.test(msg) || /Failed to fetch/i.test(msg)) {
    const corsHint = /Failed to fetch/i.test(msg) ? " – vermutlich CORS blockiert → im ODAS-Live proxyAktiv=ja." : "";
    return {
      kind: "DIREKT_CORS_HTTP",
      titel: msg,
      hinweis: `Prüfen Sie URL und CORS der Quelle${corsHint}`,
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/liefert kein JSON/i.test(msg) || /HTML-Seite|CSV-|leere Antwort|unlesbaren/i.test(msg)) {
    return {
      kind: "PAYLOAD_TYP",
      titel: msg,
      hinweis: "Tragen Sie den passenden Endpunkt ein – nicht die Datensatzseite (/dataset/…) – Hilfe-Tooltip beachten.",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/CKAN.*Fehler|success:false/i.test(msg)) {
    return {
      kind: "CKAN_API",
      titel: msg,
      hinweis: "Prüfen Sie Daten-ID / Datensatz-ID (existiert die Tabelle/Datei noch auf dem Portal?).",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/404|Nicht gefunden/i.test(msg)) {
    return {
      kind: "HTTP_404",
      titel: msg,
      hinweis: "Ressource/Datensatz auf dem Portal nicht gefunden (404).",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  return {
    kind: "UNBEKANNT",
    titel: msg || "Unbekannter Fehler beim Laden.",
    hinweis: "Prüfen Sie Konfiguration und Erreichbarkeit der Quelle.",
    detail: msg,
    alertClass: "alert-danger"
  };
}

function renderOdasFehler(container, error, kontext = {}) {
  if (!container) return;
  const typWarn = validateUrlTypErwartung(kontext.url, kontext.erwarteterTyp);
  if (typWarn && !/Typ passt nicht/i.test(String(error && error.message))) {
    error = new Error(typWarn);
  }
  const info = classifyOdasFehler(error, kontext);
  const url = String(kontext.url || "");
  const urlZeile = url ? `<p class="mb-1 small text-muted">Konfigurierte URL: <code>${escapeHtml(url.length > 80 ? url.slice(0, 80) + "…" : url)}</code></p>` : "";
  const titel = kontext.leer ? "Keine Datensätze gefunden." : info.titel;
  const alertClass = kontext.leer ? "alert-info" : info.alertClass;
  container.innerHTML = `<div class="alert ${alertClass}" role="alert"><strong>${escapeHtml(titel)}</strong><p class="mb-1">${escapeHtml(info.hinweis)}</p>${urlZeile}<details class="small"><summary>Details</summary><code>${escapeHtml(info.detail || String(error))}</code></details></div>`;
}


async function app(configdata, enclosingHtmlDivElement) {
  const dakiUid = "i" + ++dakiInstanzZaehler;

  // KI-B1: Zustand und Teardown SOFORT registrieren — vor dem await auf die
  // Konfiguration und vor jedem Fetch/POST.
  const zustand = {
    disposed: false,
    controller: new AbortController(),
    abmelden: function () {
      this.disposed = true;
      this.controller.abort();
      // KI-B2: Der Breiten-Stil haengt sonst sitzungsweit am geteilten
      // #main-content (app-base ersetzt nur innerHTML, keine Styles).
      enclosingHtmlDivElement.classList.remove("daki-container");
    },
  };
  const dakiVorheriger = dakiInstanzen.get(enclosingHtmlDivElement);
  if (dakiVorheriger) {
    try {
      dakiVorheriger.abmelden();
    } catch (_e) {}
  }
  dakiInstanzen.set(enclosingHtmlDivElement, zustand);

  const cfg = { ...(await Promise.resolve(configdata || {})) };
  if (zustand.disposed) return;
  cfg.apiurl = getOdasApiUrl(cfg, "analysedaten");
  if (zustand.disposed) return;
  enclosingHtmlDivElement.innerHTML = "";
  // KI-B2: Klasse statt Inline-Styles (siehe app.css); wird im Teardown entfernt.
  enclosingHtmlDivElement.classList.add("daki-container");
  ladeUiBibliotheken();

  const quelle = cfg.apiurl;
  if (!quelle || /^\{\{.*\}\}$/.test(quelle) || /^<.*>$/.test(quelle)) {
    renderOdasFehler(
      enclosingHtmlDivElement,
      new Error("Keine Datenquelle konfiguriert."),
      {
        url: quelle,
        label: "Analyse-Datensatz-API",
        typLabel: "Datensatz-API",
        erwarteterTyp: "ckan-ps",
      },
    );
    return;
  }

  // Variante A (F-92): Typprüfung vor dem ersten Fetch.
  const dakiTypWarn = validateUrlTypErwartung(quelle, "ckan-ps");
  if (dakiTypWarn) {
    renderOdasFehler(enclosingHtmlDivElement, new Error(dakiTypWarn), {
      url: quelle,
      label: "Analyse-Datensatz-API",
      typLabel: "Datensatz-API",
      erwarteterTyp: "ckan-ps",
    });
    return;
  }

  // Funktion-Auswahl-Menü
  showFunctionSelectionMenu(enclosingHtmlDivElement, cfg, dakiUid);
}

// Datensatzname aus Konfiguration extrahieren
function extractDatasetNameFromConfig(cfg) {
  try {
    if (cfg.apiurl) {
      // Extrahiere Dataset-ID aus der API-URL
      const match = cfg.apiurl.match(/[?&]id=([^&]+)/);
      if (match && match[1]) {
        // Konvertiere Dataset-ID zu lesbarem Namen. Das Escaping erfolgt an den
        // Sinks, nicht hier — nur so ist die Absicherung lokal pruefbar (F-52b).
        return match[1]
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
      }
    }

    if (cfg.urlDaten) {
      // Extrahiere Dataset-Name aus der Dataset-URL
      const match = cfg.urlDaten.match(/\/dataset\/([^/?]+)/);
      if (match && match[1]) {
        // Escaping an den Sinks, siehe oben (F-52b)
        return match[1]
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
      }
    }

    return null;
  } catch (err) {
    console.error("Fehler beim Extrahieren des Datensatznamens:", err);
    return null;
  }
}

// Funktion-Auswahl-Menü
function showFunctionSelectionMenu(container, cfg, dakiUid) {
  // Datensatzname aus der Konfiguration extrahieren
  const datasetName = extractDatasetNameFromConfig(cfg);

  const menuCard = document.createElement("div");
  menuCard.className = "card mb-4 shadow-sm function-selection-card";
  menuCard.innerHTML = `
    <div class="card-body">
      <h5 class="card-title">
        KI-Analysefunktionen für ${escapeHtml(datasetName)}
      </h5>
      <p class="card-text text-muted">Wählen Sie die gewünschte Analysefunktion für ${escapeHtml(datasetName)}:</p>
      <div class="d-grid gap-3 function-buttons">
        <button id="daki-general-analysis-btn" class="btn btn-primary">
          <i class="fas fa-chart-bar feature-icon"></i>
          <strong>Allgemeine Datensatzanalyse</strong>
          <br><small class="text-white-50">Umfassende KI-Analyse des Datensatzes: ${escapeHtml(datasetName)}</small>
        </button>
        <button id="daki-comparison-analysis-btn" class="btn btn-success">
          <i class="fas fa-balance-scale feature-icon"></i>
          <strong>Datensatzvergleichsanalyse</strong>
          <br><small class="text-white-50">Vergleiche ${escapeHtml(datasetName)} auf Gemeinsamkeiten und Unterschiede mit einem zweiten Datensatz</small>
        </button>
        <button id="daki-search-analysis-btn" class="btn btn-info">
          <i class="fas fa-search feature-icon"></i>
          <strong>Datensatzsuche</strong>
          <br><small class="text-white-50">Gezielte Suche nach spezifischen Informationen im Datensatz: ${escapeHtml(datasetName)}</small>
        </button>
      </div>
    </div>`;
  container.appendChild(menuCard);

  // Content Container für die gewählte Funktion
  const contentContainer = document.createElement("div");
  contentContainer.id = "function-content";
  container.appendChild(contentContainer);

  // Methodikbox
  const methodikHtml = renderMethodikbox(cfg, dakiUid);
  if (methodikHtml) {
    const methodikDiv = document.createElement("div");
    methodikDiv.innerHTML = methodikHtml;
    container.appendChild(methodikDiv);
  }

  // Weitere Informationen
  const weitereHtml = renderWeitereInfos(cfg);
  if (weitereHtml) {
    const weitereDiv = document.createElement("div");
    weitereDiv.innerHTML = weitereHtml;
    container.appendChild(weitereDiv);
  }

  // Event-Listener für die Buttons
  container
    .querySelector("#daki-general-analysis-btn")
    .addEventListener("click", () => {
      minimizeSelectionMenu(menuCard);
      showGeneralAnalysis(contentContainer, cfg, container, dakiUid);
    });

  container
    .querySelector("#daki-comparison-analysis-btn")
    .addEventListener("click", () => {
      minimizeSelectionMenu(menuCard);
      showComparisonAnalysis(contentContainer, cfg, container, dakiUid);
    });

  container
    .querySelector("#daki-search-analysis-btn")
    .addEventListener("click", () => {
      minimizeSelectionMenu(menuCard);
      showSearchAnalysis(contentContainer, cfg, container, dakiUid);
    });
}

// Funktion zum kompletten Ausblenden des Auswahlmenüs
function minimizeSelectionMenu(menuCard) {
  // Gesamtes Menü ausblenden
  menuCard.style.display = "none";
}

// Hilfsfunktion zum Hinzufügen des Zurück-Buttons
function addBackButtonIfNeeded(container, root) {
  if (!container.querySelector(".back-to-menu")) {
    const backButtonContainer = document.createElement("div");
    backButtonContainer.className = "mb-3 back-to-menu";
    backButtonContainer.innerHTML = `
      <button class="btn btn-outline-secondary btn-sm">
        <i class="fas fa-arrow-left me-2"></i>Zurück zur Funktionsauswahl
      </button>
    `;

    const backButton = backButtonContainer.querySelector("button");
    backButton.addEventListener("click", () => {
      // Auswahlmenü wieder einblenden
      const menuCard = root.querySelector(".function-selection-card");
      if (menuCard) {
        menuCard.style.display = "block";
      }
      // Content-Bereich leeren
      container.innerHTML = "";
    });

    container.appendChild(backButtonContainer);
  }
}

// Allgemeine Datensatzanalyse (ursprüngliche Funktion)
async function showGeneralAnalysis(container, cfg, root, uid) {
  // Zurück-Button hinzufügen wenn noch nicht vorhanden
  addBackButtonIfNeeded(container, root);

  // Datensatzname aus der Konfiguration extrahieren
  const datasetName = extractDatasetNameFromConfig(cfg);

  const functionContent = document.createElement("div");
  functionContent.innerHTML = `
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <h5 class="card-title" id="analysis-title">
          <i class="fas fa-chart-bar me-2" style="color: #007bff;"></i>
          ${
            datasetName
              ? `Analyse des Datensatzes: ${escapeHtml(datasetName)}`
              : "Allgemeine Datensatzanalyse"
          }
        </h5>
        <p class="card-text">Laden und analysieren Sie einen Datensatz mit umfassender KI-Unterstützung.</p>
        <div id="daki-general-analysis-content">
          <div class="loading-container">
            <lottie-player
              src="${appAssetUrl("assets/loading.json")}"
              background="transparent"
              speed="1"
              style="width: 150px; height: 150px;"
              loop autoplay>
            </lottie-player>
            <h5 class="mt-3">Datensatz wird geladen...</h5>
            <p class="text-muted">Bitte warten Sie, während der Datensatz geladen wird.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(functionContent);

  const contentDiv = container.querySelector("#daki-general-analysis-content");
  await loadGeneralAnalysisContent(contentDiv, cfg, root, uid);
}

async function loadGeneralAnalysisContent(container, cfg, root, uid) {
  let pkg;
  let datenStand = null;
  try {
    // Daten laden: direkt oder ueber den ODAS-Proxy (proxyAktiv)
    const json = await fetchOdasJson(cfg.apiurl, cfg, { signal: signalFuer(root) });
    if (!json.success) throw new Error("API returned success=false");

    // Nur noch CKAN Support
    if (json.result) {
      pkg = json.result;
      pkg.resources = Array.isArray(pkg.resources) ? pkg.resources : [];
      datenStand = pkg.metadata_modified || null;
    } else {
      throw new Error("Unbekanntes API-Format");
    }
  } catch (err) {
    renderOdasFehler(container, err, {
      url: cfg.apiurl,
      label: "Analyse-Datensatz-API",
      typLabel: "Datensatz-API",
      erwarteterTyp: "ckan-ps",
    });
    return;
  }

  // Oberer Infoblock mit Titel und Beschreibung des Datensatzes
  const baseUrl = cfg.apiurl
    .replace(/\/api\/3\/action\/package_show.*$/i, "")
    .replace(/\/$/, "");
  const datasetUrl = safeHttpUrl(
    baseUrl + "/dataset/" + encodeURIComponent(pkg.name),
  );
  const datasetTitle = escapeHtml(pkg.title);
  const datasetLink = datasetUrl
    ? `<a href="${escapeHtml(datasetUrl)}" target="_blank" rel="noopener">${datasetTitle}</a>`
    : datasetTitle;

  container.innerHTML = `
    <div class="dataset-info mb-3">
      <h6>
        <i class="fas fa-database me-2"></i>
        Datensatz: ${datasetLink}
      </h6>
      <p class="text-muted">${escapeHtml(
        cfg.datenbeschreibung || "Keine Beschreibung vorhanden.",
      )}</p>
    </div>
    <div id="daki-datenstand-wrap"></div>
  `;

  // Schale 4: Datenfrische anzeigen
  if (datenStand) {
    const d = new Date(datenStand);
    if (!isNaN(d.getTime())) {
      const dsEl = container.querySelector("#daki-datenstand-wrap");
      if (dsEl) dsEl.innerHTML = '<div class="text-muted small mb-2">Datenstand: ' + escapeHtml(d.toLocaleDateString("de-DE")) + '</div>';
    }
  }

  // Ressourcen-Auswahl
  if (
    !pkg.resources ||
    !Array.isArray(pkg.resources) ||
    pkg.resources.length === 0
  ) {
    container.innerHTML += `
      <div class="alert alert-info" role="alert">
        <i class="fas fa-info-circle me-2"></i>
        Für diesen Datensatz wurden keine Ressourcen gefunden.
      </div>`;
    return;
  }

  container.innerHTML += `
    <div class="mb-3">
      <label for="daki-resource-select-${uid}" class="form-label">
        <i class="fas fa-file-alt me-2"></i><strong>Ressource wählen:</strong>
      </label>
      <select id="daki-resource-select-${uid}" class="form-select">
        ${pkg.resources
          .map(
            (r, idx) =>
              `<option value="${idx}">${escapeHtml(
                r.name || r.title || r.id || "Ressource " + (idx + 1)
              )}</option>`
          )
          .join("")}
      </select>
      <div id="daki-resource-desc" class="form-text mt-2"></div>
    </div>
    
    <div class="text-center mb-4">
      <button id="daki-analyze-btn" class="btn btn-primary btn-lg me-3">
        <i class="fas fa-magic me-2"></i>Analyse starten!
      </button>
      <br>
      <small id="daki-analyze-info" class="text-muted mt-2 d-block">
        <i class="fas fa-info-circle me-1"></i>
        Die Analyse wird mit KI durchgeführt und dauert ca. 30-60 Sekunden.
      </small>
    </div>
    
    <div id="daki-analysis-result"></div>
  `;

  // Event-Listener für Ressourcen-Auswahl und Analyse
  setupGeneralAnalysisEvents(pkg, cfg, root, uid);
}

function setupGeneralAnalysisEvents(pkg, cfg, root, uid) {
  const selectEl = root.querySelector(`#daki-resource-select-${uid}`);
  const resourceDesc = root.querySelector("#daki-resource-desc");
  const analyzeBtn = root.querySelector("#daki-analyze-btn");
  const analyzeInfo = root.querySelector("#daki-analyze-info");

  function updateResourceInfo() {
    const selectedIdx = parseInt(selectEl.value, 10);
    const resource = pkg.resources[selectedIdx];
    const selectedUrl =
      resource.url || resource.accessURL || resource.downloadURL || "";

    if (/\.(jpe?g|png|gif)$/i.test(selectedUrl)) {
      analyzeBtn.disabled = true;
      analyzeInfo.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>Bilddateien werden momentan nicht unterstützt.`;
      analyzeInfo.classList.add("text-danger");
    } else {
      analyzeBtn.disabled = false;
      analyzeInfo.innerHTML = `<i class="fas fa-info-circle me-1"></i>Die Analyse wird mit KI durchgeführt und dauert ca. 30-60 Sekunden.`;
      analyzeInfo.classList.remove("text-danger");
    }

    resourceDesc.innerHTML =
      resource.description || resource.notes
        ? `<strong>Beschreibung:</strong> ${escapeHtml(
            resource.description || resource.notes
          )}`
        : `<em>Keine Beschreibung zur Ressource vorhanden.</em>`;
  }

  selectEl.addEventListener("change", updateResourceInfo);
  updateResourceInfo();

  async function runGeneralAnalysis() {
    const selectedIdx = parseInt(selectEl.value, 10);
    const resource = pkg.resources[selectedIdx];
    const resourceUrl =
      resource.url || resource.accessURL || resource.downloadURL || "";
    const resourceName =
      resource.name ||
      resource.title ||
      resource.id ||
      `Ressource ${selectedIdx + 1}`;

    const resultDiv = root.querySelector("#daki-analysis-result");
    resultDiv.innerHTML = `
      <div class="loading-container">
        <lottie-player
          src="${appAssetUrl("assets/loading.json")}"
          background="transparent"
          speed="1"
          style="width: 150px; height: 150px;"
          loop autoplay>
        </lottie-player>
        <h5 class="mt-3">Analyse läuft...</h5>
        <p class="text-muted">Die KI analysiert den ausgewählten Datensatz.</p>
      </div>
    `;

    const aiData = await sendToAI(
      resourceUrl,
      resourceName,
      pkg.notes || "",
      "general",
      root,
    );
    if (istVerworfen(root)) return;

    if (aiData?.error) {
      renderAiErrorCard(
        resultDiv,
        aiData.message || "Die KI konnte keine Analyse durchführen.",
        runGeneralAnalysis
      );
      return;
    }

    if (!aiData?.result) {
      renderAiErrorCard(
        resultDiv,
        "Die KI konnte keine Analyse durchführen.",
        runGeneralAnalysis
      );
      return;
    }

    resultDiv.innerHTML = `
      <div class="card result-card mb-4">
        <div class="card-body">
          <h5 class="card-title">
            <i class="fas fa-chart-line me-2" style="color: #007bff;"></i>
            Analyseergebnis
          </h5>
          <div class="card-text analysis-result mb-3">${escapeHtml(aiData.result)}</div>
          <div class="ai-credit">
            <i class="fas fa-robot me-2"></i>
            Die Analyse wurde mit <a href="https://deepmind.google/technologies/gemini/" target="_blank" rel="noopener">Google Gemini</a> durchgeführt.
          </div>
        </div>
      </div>`;
  }

  analyzeBtn.addEventListener("click", runGeneralAnalysis);
}

// Datensatzvergleichsanalyse
async function showComparisonAnalysis(container, cfg, root, uid) {
  // Zurück-Button hinzufügen wenn noch nicht vorhanden
  addBackButtonIfNeeded(container, root);

  const functionContent = document.createElement("div");
  functionContent.innerHTML = `
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <h5 class="card-title">
          <i class="fas fa-balance-scale me-2" style="color: #28a745;"></i>
          Datensatzvergleichsanalyse
        </h5>
        <p class="card-text">Vergleichen Sie den konfigurierten Datensatz mit einem zweiten Datensatz systematisch auf Gemeinsamkeiten, Unterschiede und übergreifende Trends.</p>
        <div id="daki-comparison-analysis-content">
          <div class="loading-container">
            <lottie-player
              src="${appAssetUrl("assets/loading.json")}"
              background="transparent"
              speed="1"
              style="width: 150px; height: 150px;"
              loop autoplay>
            </lottie-player>
            <h5 class="mt-3">Erster Datensatz wird geladen...</h5>
            <p class="text-muted">Bitte warten Sie, während der konfigurierte Datensatz geladen wird.</p>
          </div>
        </div>
      </div>
    </div>
    <div id="daki-comparison-result"></div>
  `;

  container.appendChild(functionContent);

  const contentDiv = container.querySelector("#daki-comparison-analysis-content");
  await loadComparisonAnalysisContent(contentDiv, cfg, root, uid);
}

async function loadComparisonAnalysisContent(container, cfg, root, uid) {
  let dataset1;
  try {
    // Daten laden: direkt oder ueber den ODAS-Proxy (proxyAktiv)
    const json = await fetchOdasJson(cfg.apiurl, cfg, { signal: signalFuer(root) });
    if (!json.success) throw new Error("API returned success=false");

    // Nur noch CKAN Support
    if (json.result) {
      dataset1 = json.result;
      // Sicherstellen, dass dataset1.resources ein Array ist
      dataset1.resources = Array.isArray(dataset1.resources)
        ? dataset1.resources
        : [];
    } else {
      throw new Error("Unbekanntes API-Format");
    }
  } catch (err) {
    renderOdasFehler(container, err, {
      url: cfg.apiurl,
      label: "Erster Analyse-Datensatz",
      typLabel: "Datensatz-API",
      erwarteterTyp: "ckan-ps",
    });
    return;
  }

  // Oberer Infoblock mit Titel und Beschreibung des ersten Datensatzes
  const baseUrl = cfg.apiurl
    .replace(/\/api\/3\/action\/package_show.*$/i, "")
    .replace(/\/$/, "");
  const datasetUrl = safeHttpUrl(
    baseUrl + "/dataset/" + encodeURIComponent(dataset1.name),
  );
  const datasetTitle = escapeHtml(dataset1.title);
  const datasetLink = datasetUrl
    ? `<a href="${escapeHtml(datasetUrl)}" target="_blank" rel="noopener">${datasetTitle}</a>`
    : datasetTitle;

  if (!dataset1.resources || !dataset1.resources.length) {
    container.innerHTML = `
      <div class="alert alert-info" role="alert">
        <i class="fas fa-info-circle me-2"></i>
        Für diesen Datensatz wurden keine Ressourcen gefunden.
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="comparison-grid">
      <div class="dataset-input-group">
        <h6><i class="fas fa-database me-2"></i>Erster Datensatz (Konfiguriert)</h6>
        <div class="dataset-info mb-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-title">
                ${datasetLink}
              </h6>
              <p class="card-text text-muted">${escapeHtml(
                cfg.datenbeschreibung || "Keine Beschreibung vorhanden.",
              )}</p>
            </div>
          </div>
        </div>
        <label for="daki-resource1-select-${uid}" class="form-label">
          <i class="fas fa-file-alt me-2"></i><strong>Ressource wählen:</strong>
        </label>
        <select id="daki-resource1-select-${uid}" class="form-select">
          ${dataset1.resources
            .map(
              (r, idx) =>
                `<option value="${idx}">${escapeHtml(
                  r.name || r.title || r.id || "Ressource " + (idx + 1)
                )}</option>`
            )
            .join("")}
        </select>
        <div id="daki-resource1-desc" class="form-text mt-2"></div>
      </div>
      
      <div class="dataset-input-group">
        <h6><i class="fas fa-database me-2"></i>Zweiter Datensatz (Zum Vergleich)</h6>
        <input type="text" id="daki-dataset2-url" class="form-control mb-2" placeholder="URL zum zweiten Datensatz eingeben">
        <select id="daki-resource2-select" class="form-select mb-2" disabled>
          <option>Zuerst Datensatz laden...</option>
        </select>
        <button id="daki-load-dataset2-btn" class="btn btn-outline-primary btn-sm">
          <i class="fas fa-download me-1"></i>Datensatz 2 laden
        </button>
        <div id="daki-dataset2-status" class="mt-2"></div>
      </div>
    </div>
    
    <hr>
    <div class="d-flex align-items-center justify-content-center">
      <button id="daki-compare-btn" class="btn btn-success btn-lg me-3" disabled>
        <i class="fas fa-sync-alt me-2"></i>Vergleichsanalyse starten!
      </button>
      <small class="text-muted">
        <i class="fas fa-info-circle me-1"></i>
        Zweiten Datensatz laden, um den Vergleich zu starten
      </small>
    </div>
  `;

  // Event-Listener für Vergleichsanalyse einrichten
  setupComparisonAnalysisEvents(dataset1, cfg, root, uid);
}

function setupComparisonAnalysisEvents(dataset1, cfg, root, uid) {
  let dataset2 = null;

  const selectEl1 = root.querySelector(`#daki-resource1-select-${uid}`);
  const resourceDesc1 = root.querySelector("#daki-resource1-desc");

  function updateResource1Info() {
    const selectedIdx = parseInt(selectEl1.value, 10);
    const resource = dataset1.resources[selectedIdx];

    resourceDesc1.innerHTML =
      resource.description || resource.notes
        ? `<strong>Beschreibung:</strong> ${escapeHtml(
            resource.description || resource.notes
          )}`
        : `<em>Keine Beschreibung zur Ressource vorhanden.</em>`;
  }

  selectEl1.addEventListener("change", updateResource1Info);
  updateResource1Info();

  root
    .querySelector("#daki-load-dataset2-btn")
    .addEventListener("click", async () => {
      const url = root.querySelector("#daki-dataset2-url").value.trim();
      if (!url) return;

      const statusEl = root.querySelector("#daki-dataset2-status");
      statusEl.innerHTML =
        '<span class="status-indicator status-loading"></span>Lade Datensatz...';

      const geladen = await loadDatasetFromUrl(url, cfg, root);
      if (istVerworfen(root)) return;
      if (geladen.ok) {
        dataset2 = geladen.dataset;
        populateResourceSelect("resource2-select", dataset2.resources, root);
        statusEl.innerHTML =
          '<span class="status-indicator status-success"></span><strong>Datensatz erfolgreich geladen</strong>';
        checkCompareButton();
      } else {
        dataset2 = null;
        statusEl.innerHTML = "";
        renderOdasFehler(statusEl, new Error(geladen.message), {
          url,
          label: "Zweiter Datensatz",
          typLabel: "Datensatz-API",
          erwarteterTyp: "ckan-ps",
        });
        checkCompareButton();
      }
    });

  async function runComparisonAnalysis() {
    const resource1Idx = parseInt(selectEl1.value, 10);
    const resource2Idx = parseInt(
      root.querySelector("#daki-resource2-select").value,
      10
    );

    const resource1 = dataset1.resources[resource1Idx];
    const resource2 = dataset2.resources[resource2Idx];

    const resultDiv = root.querySelector("#daki-comparison-result");
    resultDiv.innerHTML = `
      <div class="loading-container">
        <lottie-player
          src="${appAssetUrl("assets/loading.json")}"
          background="transparent"
          speed="1"
          style="width: 150px; height: 150px;"
          loop autoplay>
        </lottie-player>
        <h5 class="mt-3">Vergleichsanalyse läuft...</h5>
        <p class="text-muted">Die KI analysiert beide Datensätze und erstellt einen detaillierten Vergleich.</p>
      </div>
    `;

    const aiData = await sendComparisonToAI(
      resource1,
      resource2,
      dataset1,
      dataset2,
      root,
    );
    if (istVerworfen(root)) return;

    if (aiData?.error) {
      renderAiErrorCard(
        resultDiv,
        aiData.message || "Die KI konnte keine Vergleichsanalyse durchführen.",
        runComparisonAnalysis
      );
      return;
    }

    if (!aiData?.result) {
      renderAiErrorCard(
        resultDiv,
        "Die KI konnte keine Vergleichsanalyse durchführen.",
        runComparisonAnalysis
      );
      return;
    }

    resultDiv.innerHTML = `
      <div class="card result-card mb-4">
        <div class="card-body">
          <h5 class="card-title">
            <i class="fas fa-chart-line me-2" style="color: #28a745;"></i>
            Vergleichsanalyse-Ergebnis
          </h5>
          <div class="card-text analysis-result mb-3">${escapeHtml(aiData.result)}</div>
          <div class="ai-credit">
            <i class="fas fa-robot me-2"></i>
            Die Vergleichsanalyse wurde mit <a href="https://deepmind.google/technologies/gemini/" target="_blank" rel="noopener">Google Gemini</a> durchgeführt.
          </div>
        </div>
      </div>`;
  }

  root
    .querySelector("#daki-compare-btn")
    .addEventListener("click", runComparisonAnalysis);

  function checkCompareButton() {
    const btn = root.querySelector("#daki-compare-btn");
    btn.disabled = !dataset2;
    if (dataset2) {
      btn.innerHTML =
        '<i class="fas fa-sync-alt me-2"></i>Vergleichsanalyse starten!';
    }
  }
}

// Datensatzsuche
async function showSearchAnalysis(container, cfg, root, uid) {
  // Zurück-Button hinzufügen wenn noch nicht vorhanden
  addBackButtonIfNeeded(container, root);

  const functionContent = document.createElement("div");
  functionContent.innerHTML = `
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <h5 class="card-title">
          <i class="fas fa-search me-2" style="color: #17a2b8;"></i>
          Intelligente Datensatzsuche
        </h5>
        <p class="card-text">Nutzen Sie KI-gestützte Suche, um gezielt nach spezifischen Informationen in Ihren Daten zu suchen.</p>
        <div id="daki-search-analysis-content">
          <div class="loading-container">
            <lottie-player
              src="${appAssetUrl("assets/loading.json")}"
              background="transparent"
              speed="1"
              style="width: 150px; height: 150px;"
              loop autoplay>
            </lottie-player>
            <h5 class="mt-3">Datensatz wird geladen...</h5>
            <p class="text-muted">Bitte warten Sie, während der Datensatz geladen wird.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(functionContent);

  const contentDiv = container.querySelector("#daki-search-analysis-content");
  await loadSearchAnalysisContent(contentDiv, cfg, root, uid);
}

async function loadSearchAnalysisContent(container, cfg, root, uid) {
  let pkg;
  let datenStand = null;
  try {
    // Daten laden: direkt oder ueber den ODAS-Proxy (proxyAktiv)
    const json = await fetchOdasJson(cfg.apiurl, cfg, { signal: signalFuer(root) });
    if (!json.success) throw new Error("API returned success=false");

    // Nur noch CKAN Support
    if (json.result) {
      pkg = json.result;
      pkg.resources = Array.isArray(pkg.resources) ? pkg.resources : [];
      datenStand = pkg.metadata_modified || null;
    } else {
      throw new Error("Unbekanntes API-Format");
    }
  } catch (err) {
    renderOdasFehler(container, err, {
      url: cfg.apiurl,
      label: "Analyse-Datensatz-API",
      typLabel: "Datensatz-API",
      erwarteterTyp: "ckan-ps",
    });
    return;
  }

  // Oberer Infoblock mit Titel und Beschreibung des Datensatzes
  const baseUrl = cfg.apiurl
    .replace(/\/api\/3\/action\/package_show.*$/i, "")
    .replace(/\/$/, "");
  const datasetUrl = safeHttpUrl(
    baseUrl + "/dataset/" + encodeURIComponent(pkg.name),
  );
  const datasetTitle = escapeHtml(pkg.title);
  const datasetLink = datasetUrl
    ? `<a href="${escapeHtml(datasetUrl)}" target="_blank" rel="noopener">${datasetTitle}</a>`
    : datasetTitle;

  container.innerHTML = `
    <div class="dataset-info mb-3">
      <h6>
        <i class="fas fa-database me-2"></i>
        Datensatz: ${datasetLink}
      </h6>
      <p class="text-muted">${escapeHtml(
        cfg.datenbeschreibung || "Keine Beschreibung vorhanden.",
      )}</p>
    </div>
  `;

  // Ressourcen-Auswahl
  if (
    !pkg.resources ||
    !Array.isArray(pkg.resources) ||
    pkg.resources.length === 0
  ) {
    container.innerHTML += `
      <div class="alert alert-info" role="alert">
        <i class="fas fa-info-circle me-2"></i>
        Für diesen Datensatz wurden keine Ressourcen gefunden.
      </div>`;
    return;
  }

  container.innerHTML += `
    <div class="mb-3">
      <label for="daki-search-resource-select-${uid}" class="form-label">
        <i class="fas fa-file-alt me-2"></i><strong>Ressource wählen:</strong>
      </label>
      <select id="daki-search-resource-select-${uid}" class="form-select">
        ${pkg.resources
          .map(
            (r, idx) =>
              `<option value="${idx}">${escapeHtml(
                r.name || r.title || r.id || "Ressource " + (idx + 1)
              )}</option>`
          )
          .join("")}
      </select>
      <div id="daki-search-resource-desc" class="form-text mt-2"></div>
    </div>
    
    <div class="mb-4">
      <label for="daki-search-query-${uid}" class="form-label">
        <i class="fas fa-comment-dots me-2"></i><strong>Ihre Suchanfrage:</strong>
      </label>
      <textarea id="daki-search-query-${uid}" class="form-control" rows="3" placeholder="Beschreiben Sie in natürlicher Sprache, wonach Sie suchen..."></textarea>
      <div class="form-text mt-2">
        <strong>Beispiele:</strong><br>
        • "Finde alle Einträge mit Temperaturwerten über 30°C"<br>
        • "Suche nach Anomalien oder Ausreißern in den Verkaufszahlen"<br>
        • "Zeige mir Trends der letzten 6 Monate"
      </div>
    </div>
    
    <div class="text-center mb-4">
      <button id="daki-search-btn" class="btn btn-warning btn-lg me-3">
        <i class="fas fa-magic me-2"></i>KI-Suche starten!
      </button>
      <br>
      <small id="search-info" class="text-muted mt-2 d-block">
        <i class="fas fa-info-circle me-1"></i>
        Geben Sie Ihre Suchanfrage ein und starten Sie die KI-gestützte Suche.
      </small>
    </div>
    
    <div id="daki-search-result"></div>
  `;

  // Event-Listener für Ressourcen-Auswahl und Suche
  setupSearchAnalysisEvents(pkg, cfg, root, uid);
}

function setupSearchAnalysisEvents(pkg, cfg, root, uid) {
  const selectEl = root.querySelector(`#daki-search-resource-select-${uid}`);
  const resourceDesc = root.querySelector("#daki-search-resource-desc");
  const searchBtn = root.querySelector("#daki-search-btn");
  const searchQuery = root.querySelector(`#daki-search-query-${uid}`);

  function updateResourceInfo() {
    const selectedIdx = parseInt(selectEl.value, 10);
    const resource = pkg.resources[selectedIdx];

    resourceDesc.innerHTML =
      resource.description || resource.notes
        ? `<strong>Beschreibung:</strong> ${escapeHtml(
            resource.description || resource.notes
          )}`
        : `<em>Keine Beschreibung zur Ressource vorhanden.</em>`;
  }

  function checkSearchButton() {
    const query = searchQuery.value.trim();
    searchBtn.disabled = !query;
  }

  selectEl.addEventListener("change", updateResourceInfo);
  searchQuery.addEventListener("input", checkSearchButton);
  updateResourceInfo();
  checkSearchButton();

  async function runSearchAnalysis() {
    const selectedIdx = parseInt(selectEl.value, 10);
    const resource = pkg.resources[selectedIdx];
    const query = searchQuery.value.trim();

    if (!query) return;

    const resultDiv = root.querySelector("#daki-search-result");
    resultDiv.innerHTML = `
      <div class="loading-container">
        <lottie-player
          src="${appAssetUrl("assets/loading.json")}"
          background="transparent"
          speed="1"
          style="width: 150px; height: 150px;"
          loop autoplay>
        </lottie-player>
        <h5 class="mt-3">KI-Suche läuft...</h5>
        <p class="text-muted">Die KI durchsucht den Datensatz nach Ihren Kriterien.</p>
        <div class="alert alert-info mt-3">
          <strong>Suchbegriff:</strong> "${escapeHtml(query)}"
        </div>
      </div>
    `;

    const aiData = await sendSearchToAI(resource, pkg, query, root);
    if (istVerworfen(root)) return;

    if (aiData?.error) {
      renderAiErrorCard(
        resultDiv,
        aiData.message || "Die KI konnte keine Suche durchführen.",
        runSearchAnalysis
      );
      return;
    }

    if (!aiData?.result) {
      renderAiErrorCard(
        resultDiv,
        "Die KI konnte keine Suche durchführen.",
        runSearchAnalysis
      );
      return;
    }

    resultDiv.innerHTML = `
      <div class="card result-card mb-4">
        <div class="card-body">
          <h5 class="card-title">
            <i class="fas fa-search-plus me-2" style="color: #17a2b8;"></i>
            Suchergebnis
          </h5>
          <div class="alert alert-light border">
            <strong><i class="fas fa-quote-left me-2"></i>Ihre Suchanfrage:</strong> "${escapeHtml(query)}"
          </div>
          <div class="card-text analysis-result mb-3">${escapeHtml(aiData.result)}</div>
          <div class="ai-credit">
            <i class="fas fa-robot me-2"></i>
            Die Suche wurde mit <a href="https://deepmind.google/technologies/gemini/" target="_blank" rel="noopener">Google Gemini</a> durchgeführt.
          </div>
        </div>
      </div>`;
  }

  searchBtn.addEventListener("click", runSearchAnalysis);
}

// Hilfsfunktionen
async function loadDatasetFromUrl(url, cfg = {}, root) {
  try {
    // Vereinfachte URL-Verarbeitung für CKAN APIs
    let apiUrl = url;
    if (url.includes("/dataset/")) {
      const datasetId = url.split("/dataset/")[1].split("/")[0];
      const baseUrl = url.split("/dataset/")[0];
      apiUrl = `${baseUrl}/api/3/action/package_show?id=${encodeURIComponent(datasetId)}`;
    }

    // Daten laden: direkt oder ueber den ODAS-Proxy (proxyAktiv)
    const json = await fetchOdasJson(apiUrl, cfg, { signal: signalFuer(root) });

    if (json.success && json.result) {
      json.result.resources = Array.isArray(json.result.resources)
        ? json.result.resources
        : [];
      return { ok: true, dataset: json.result };
    }
    throw new Error("Datensatz konnte nicht geladen werden");
  } catch (err) {
    // KI-B4: kein natives alert() mehr — der Aufrufer zeigt die Meldung in der
    // Fehlerarchitektur (renderOdasFehler) an.
    return { ok: false, message: err && err.message ? err.message : String(err) };
  }
}

function populateResourceSelect(selectId, resources, root) {
  const select = root.querySelector("#daki-" + selectId);
  select.innerHTML = resources
    .map(
      (r, idx) =>
        `<option value="${idx}">${escapeHtml(
          r.name || r.title || r.id || "Ressource " + (idx + 1)
        )}</option>`
    )
    .join("");
  select.disabled = false;
}

// Führt den POST an den /ai-Endpunkt mit Timeout/Abort aus (F-79) und liefert
// bei Fehlern eine strukturell unterscheidbare Form { error: true, message }
// statt eines als Erfolg getarnten result-Strings (F-88).
async function postAiRequest(body, errorLabel, root) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    AI_REQUEST_TIMEOUT_MS
  );
  // KI-B1: Beim Seitenwechsel wird der laufende /ai-POST abgebrochen statt bis
  // zu 90 s weiterzulaufen (Timeout- und Navigationsabbruch teilen sich den
  // Controller, damit kein AbortSignal.any vorausgesetzt wird).
  const instanzSignal = signalFuer(root);
  const beiNavigation = () => controller.abort();
  if (instanzSignal) {
    if (instanzSignal.aborted) controller.abort();
    else instanzSignal.addEventListener("abort", beiNavigation, { once: true });
  }
  try {
    const aiUrl = `${getOdasAppBasePath()}/ai`;
    const aiResp = await fetch(aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!aiResp.ok) {
      throw new Error(`KI-Endpunkt antwortet mit Status ${aiResp.status}.`);
    }

    return await aiResp.json();
  } catch (err) {
    if (err.name === "AbortError") {
      if (istVerworfen(root)) {
        // Navigationsabbruch: keine Meldung, keine DOM-Schreiber.
        return { error: true, message: "Abgebrochen." };
      }
      console.error(`${errorLabel} (Zeitüberschreitung):`, err);
      return {
        error: true,
        message:
          "Zeitüberschreitung — die Analyse hat zu lange gedauert. Bitte erneut versuchen.",
      };
    }
    console.error(`${errorLabel}:`, err);
    return { error: true, message: `${errorLabel}: ${err.message}` };
  } finally {
    clearTimeout(timeoutId);
    if (instanzSignal) instanzSignal.removeEventListener("abort", beiNavigation);
  }
}

async function sendToAI(
  resourceUrl,
  resourceName,
  datasetDesc,
  analysisType = "general",
  root
) {
  const fileUrl = resourceUrl;

  let promptText;
  if (analysisType === "general") {
    promptText =
      `Hier sind die Datenressourcen mit der Bezeichnung (${resourceName}):\n` +
      `Zusätzlich liegt folgende Beschreibung des Datensatzes vor: "${datasetDesc}".\n\n` +
      `Beginne die Analyse mit einer prägnanten Zusammenfassung des Inhalts und Formats der Daten. Beschreibe, welche Informationen in den Daten enthalten sind, wie sie strukturiert sind und in welchem Format sie vorliegen.\n\n` +
      `Erstelle anschließend eine umfassende Analyse, indem du folgende Perspektiven integrierst:\n` +
      `- Gib einen Überblick über die zentralen Muster und Trends innerhalb dieser Daten\n` +
      `- Untersuche Auffälligkeiten oder Anomalien\n` +
      `- Analysiere potenzielle Zusammenhänge und Korrelationen\n` +
      `- Diskutiere gesellschaftliche, wirtschaftliche oder ökologische Kontexte\n` +
      `- Ziehe Schlussfolgerungen für Entscheidungsträger\n` +
      `- Beurteile Qualität und Vollständigkeit der Daten`;
  }

  return postAiRequest(
    { fileUrl: fileUrl, prompt: promptText },
    "Fehler beim KI-Aufruf",
    root
  );
}

// Spezielle KI-Funktion für Datensatzvergleich
async function sendComparisonToAI(resource1, resource2, dataset1, dataset2, root) {
  const resource1Url =
    resource1.url || resource1.accessURL || resource1.downloadURL || "";
  const resource2Url =
    resource2.url || resource2.accessURL || resource2.downloadURL || "";

  const resource1Name =
    resource1.name || resource1.title || resource1.id || "Ressource 1";
  const resource2Name =
    resource2.name || resource2.title || resource2.id || "Ressource 2";

  const promptText =
    `Du sollst eine umfassende Vergleichsanalyse zwischen zwei Datensätzen durchführen. Analysiere beide Datensätze gründlich und erstelle eine detaillierte Vergleichsanalyse.\n\n` +
    `ERSTER DATENSATZ:\n` +
    `Titel: ${dataset1.title}\n` +
    `Ressource: ${resource1Name}\n` +
    `Beschreibung: ${dataset1.notes || "Keine Beschreibung verfügbar"}\n\n` +
    `ZWEITER DATENSATZ:\n` +
    `Titel: ${dataset2.title}\n` +
    `Ressource: ${resource2Name}\n` +
    `Beschreibung: ${dataset2.notes || "Keine Beschreibung verfügbar"}\n\n` +
    `ANALYSEANFORDERUNGEN:\n` +
    `1. STRUKTURELLER VERGLEICH: Vergleiche Format, Datentypen, Spaltenstrukturen und Datenorganisation beider Datensätze\n` +
    `2. INHALTLICHE GEMEINSAMKEITEN: Identifiziere übereinstimmende Themenbereiche, ähnliche Datenpunkte und vergleichbare Kategorien\n` +
    `3. WESENTLICHE UNTERSCHIEDE: Analysiere unterschiedliche Schwerpunkte, abweichende Metriken und verschiedene Perspektiven\n` +
    `4. TRENDS UND MUSTER: Erkenne zeitliche Entwicklungen, wiederkehrende Muster und statistische Auffälligkeiten in beiden Datensätzen\n` +
    `5. KORRELATIONSANALYSE: Untersuche mögliche Zusammenhänge zwischen den Datensätzen und identifiziere potenzielle Abhängigkeiten\n` +
    `6. QUALITÄTSBEWERTUNG: Bewerte Vollständigkeit, Aktualität und Zuverlässigkeit beider Datensätze im Vergleich\n` +
    `7. SYNTHESEERKENNTNISSE: Ziehe Schlussfolgerungen aus der Kombination beider Datensätze und identifiziere übergreifende Insights\n` +
    `8. HANDLUNGSEMPFEHLUNGEN: Gib konkrete Empfehlungen für die kombinierte Nutzung oder weitere Analyseschritte\n\n` +
    `Strukturiere deine Antwort klar mit kurzen Absätzen und Aufzählungen in einfachem Text — keine HTML-Tags. Beginne mit einer Executive Summary der wichtigsten Erkenntnisse.`;

  return postAiRequest(
    { fileUrls: [resource1Url, resource2Url], prompt: promptText },
    "Fehler beim KI-Vergleichsaufruf",
    root
  );
}

// Spezielle KI-Funktion für Datensatzsuche
async function sendSearchToAI(resource, dataset, searchQuery, root) {
  const resourceUrl =
    resource.url || resource.accessURL || resource.downloadURL || "";
  const resourceName =
    resource.name || resource.title || resource.id || "Ressource";

  const promptText =
    `Du bist ein KI-Assistent für die zielgerichtete Datensuche und -analyse. Deine Aufgabe ist es, in einem Datensatz gezielt nach spezifischen Informationen zu suchen.\n\n` +
    `DATENSATZ-INFORMATIONEN:\n` +
    `Titel: ${dataset.title}\n` +
    `Ressource: ${resourceName}\n` +
    `Beschreibung: ${dataset.notes || "Keine Beschreibung verfügbar"}\n\n` +
    `SUCHANFRAGE DES NUTZERS:\n` +
    `"${searchQuery}"\n\n` +
    `ANALYSEANWEISUNG:\n` +
    `1. DATENVERSTÄNDNIS: Analysiere zunächst die Struktur und den Inhalt des Datensatzes\n` +
    `2. SUCHSTRATEGIE: Entwickle eine systematische Herangehensweise für die Suchanfrage\n` +
    `3. GEZIELTE SUCHE: Suche präzise nach den vom Nutzer gewünschten Informationen\n` +
    `4. ERGEBNISAUFBEREITUNG: Präsentiere die gefundenen Daten strukturiert und verständlich\n` +
    `5. KONTEXT UND INTERPRETATION: Erkläre die Bedeutung der gefundenen Informationen\n` +
    `6. ZUSÄTZLICHE ERKENNTNISSE: Weise auf verwandte oder interessante Nebenbefunde hin\n` +
    `7. QUALITÄTSBEWERTUNG: Bewerte die Vollständigkeit und Zuverlässigkeit der Suchergebnisse\n\n` +
    `AUSGABEFORMAT:\n` +
    `- Beginne mit einer klaren Zusammenfassung der Suchergebnisse\n` +
    `- Präsentiere konkrete Daten, Zahlen oder Beispiele aus dem Datensatz\n` +
    `- Gliedere die Antwort mit kurzen Absätzen und Aufzählungen (einfacher Text, keine HTML-Tags)\n` +
    `- Falls keine exakten Treffer gefunden werden, schlage alternative Suchansätze vor\n` +
    `- Gib Hinweise für weiterführende Analysen\n\n` +
    `Konzentriere dich ausschließlich auf die Beantwortung der spezifischen Suchanfrage und liefere präzise, verwertbare Ergebnisse.`;

  return postAiRequest(
    { fileUrl: resourceUrl, prompt: promptText },
    "Fehler beim KI-Suchaufruf",
    root
  );
}

/*
 * addToHead() – laedt nichts mehr selbst (KI-B5). FontAwesome und Lottie
 * werden per ladeUiBibliotheken() aus app/vendor/ geladen, mit Script-id und
 * Fehlerpfad statt stillem Weglassen.
 */
function addToHead() {
  return ``;
}

function ladeUiBibliotheken() {
  if (!document.getElementById("daki-fontawesome")) {
    const fa = document.createElement("link");
    fa.id = "daki-fontawesome";
    fa.rel = "stylesheet";
    fa.href = "vendor/fontawesome/css/all.min.css";
    fa.onerror = function () {
      console.warn("FontAwesome konnte nicht geladen werden.");
    };
    document.head.appendChild(fa);
  }
  if (typeof customElements !== "undefined" && customElements.get("lottie-player")) return;
  if (document.getElementById("daki-lottie")) return;
  const lottie = document.createElement("script");
  lottie.id = "daki-lottie";
  lottie.src = "vendor/lottie/lottie-player.js";
  lottie.onerror = function () {
    console.warn("Lottie konnte nicht geladen werden.");
  };
  document.head.appendChild(lottie);
}

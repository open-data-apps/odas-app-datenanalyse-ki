let dakiDatenStand = null;

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function renderMethodikbox(configdata) {
  const hinweis = String(configdata.datenquelleHinweis || "").trim();
  const stand = String(configdata.datenStand || "").trim();
  if (!hinweis && !stand) return "";
  const standHtml = stand
    ? '<p class="text-muted small mb-2">' + escapeHtml(stand) + "</p>"
    : "";
  return (
    '<section class="daki-methodik mt-3">' +
    '<button class="daki-methodik-toggle collapsed" type="button" ' +
    'data-bs-toggle="collapse" data-bs-target="#daki-methodik-body" ' +
    'aria-expanded="false" aria-controls="daki-methodik-body">' +
    '<h2 class="h5 mb-0">Methodik &amp; Datenquelle</h2>' +
    '<span class="daki-methodik-chevron" aria-hidden="true">&#9662;</span>' +
    "</button>" +
    '<div id="daki-methodik-body" class="collapse">' +
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
  return `${appPath}/odp-data?path=${encodeURIComponent(
    extractPathFromUrl(targetUrl),
  )}`;
}

async function fetchViaOdasProxy(targetUrl) {
  const response = await fetch(getOdasProxyEndpoint(targetUrl), {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`ODAS-Proxy-Fehler: HTTP ${response.status}`);
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

async function fetchOdasJson(targetUrl, configdata = {}) {
  return JSON.parse(await fetchOdasResource(targetUrl, configdata));
}

async function app(configdata, enclosingHtmlDivElement) {
  const cfg = await Promise.resolve(configdata);
  enclosingHtmlDivElement.innerHTML = "";
  enclosingHtmlDivElement.style.maxWidth = "60%";
  enclosingHtmlDivElement.style.margin = "2rem auto";

  // Funktion-Auswahl-Menü
  showFunctionSelectionMenu(enclosingHtmlDivElement, cfg);
}

// Datensatzname aus Konfiguration extrahieren
function extractDatasetNameFromConfig(cfg) {
  try {
    if (cfg.apiurl) {
      // Extrahiere Dataset-ID aus der API-URL
      const match = cfg.apiurl.match(/[?&]id=([^&]+)/);
      if (match && match[1]) {
        // Konvertiere Dataset-ID zu lesbarem Namen
        return match[1]
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
      }
    }

    if (cfg.urlDaten) {
      // Extrahiere Dataset-Name aus der Dataset-URL
      const match = cfg.urlDaten.match(/\/dataset\/([^/?]+)/);
      if (match && match[1]) {
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
function showFunctionSelectionMenu(container, cfg) {
  // Datensatzname aus der Konfiguration extrahieren
  const datasetName = extractDatasetNameFromConfig(cfg);

  const menuCard = document.createElement("div");
  menuCard.className = "card mb-4 shadow-sm function-selection-card";
  menuCard.innerHTML = `
    <div class="card-body">
      <h5 class="card-title">
        KI-Analysefunktionen für ${datasetName}
      </h5>
      <p class="card-text text-muted">Wählen Sie die gewünschte Analysefunktion für ${datasetName}:</p>
      <div class="d-grid gap-3 function-buttons">
        <button id="general-analysis-btn" class="btn btn-primary">
          <i class="fas fa-chart-bar feature-icon"></i>
          <strong>Allgemeine Datensatzanalyse</strong>
          <br><small class="text-white-50">Umfassende KI-Analyse des Datensatzes: ${datasetName}</small>
        </button>
        <button id="comparison-analysis-btn" class="btn btn-success">
          <i class="fas fa-balance-scale feature-icon"></i>
          <strong>Datensatzvergleichsanalyse</strong>
          <br><small class="text-white-50">Vergleiche ${datasetName} auf Gemeinsamkeiten und Unterschiede mit einem zweiten Datensatz</small>
        </button>
        <button id="search-analysis-btn" class="btn btn-info">
          <i class="fas fa-search feature-icon"></i>
          <strong>Datensatzsuche</strong>
          <br><small class="text-white-50">Gezielte Suche nach spezifischen Informationen im Datensatz: ${datasetName}</small>
        </button>
      </div>
    </div>`;
  container.appendChild(menuCard);

  // Content Container für die gewählte Funktion
  const contentContainer = document.createElement("div");
  contentContainer.id = "function-content";
  container.appendChild(contentContainer);

  // Methodikbox
  const methodikHtml = renderMethodikbox(cfg);
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
  document
    .getElementById("general-analysis-btn")
    .addEventListener("click", () => {
      minimizeSelectionMenu(menuCard);
      showGeneralAnalysis(contentContainer, cfg);
    });

  document
    .getElementById("comparison-analysis-btn")
    .addEventListener("click", () => {
      minimizeSelectionMenu(menuCard);
      showComparisonAnalysis(contentContainer, cfg);
    });

  document
    .getElementById("search-analysis-btn")
    .addEventListener("click", () => {
      minimizeSelectionMenu(menuCard);
      showSearchAnalysis(contentContainer, cfg);
    });
}

// Funktion zum kompletten Ausblenden des Auswahlmenüs
function minimizeSelectionMenu(menuCard) {
  // Gesamtes Menü ausblenden
  menuCard.style.display = "none";
}

// Hilfsfunktion zum Hinzufügen des Zurück-Buttons
function addBackButtonIfNeeded(container) {
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
      const menuCard = document.querySelector(".function-selection-card");
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
async function showGeneralAnalysis(container, cfg) {
  // Zurück-Button hinzufügen wenn noch nicht vorhanden
  addBackButtonIfNeeded(container);

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
              ? `Analyse des Datensatzes: ${datasetName}`
              : "Allgemeine Datensatzanalyse"
          }
        </h5>
        <p class="card-text">Laden und analysieren Sie einen Datensatz mit umfassender KI-Unterstützung.</p>
        <div id="general-analysis-content">
          <div class="loading-container">
            <lottie-player
              src="${window.location.href}assets/loading.json"
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

  const contentDiv = document.getElementById("general-analysis-content");
  await loadGeneralAnalysisContent(contentDiv, cfg);
}

async function loadGeneralAnalysisContent(container, cfg) {
  let pkg;
  try {
    // Daten laden: direkt oder ueber den ODAS-Proxy (proxyAktiv)
    const json = await fetchOdasJson(cfg.apiurl, cfg);
    if (!json.success) throw new Error("API returned success=false");

    // Nur noch CKAN Support
    if (json.result) {
      pkg = json.result;
      pkg.resources = Array.isArray(pkg.resources) ? pkg.resources : [];
      dakiDatenStand = pkg.metadata_modified || null;
    } else {
      throw new Error("Unbekanntes API-Format");
    }
  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Fehler beim Laden der Daten:<br><code>${err.message}</code>
      </div>`;
    return;
  }

  // Oberer Infoblock mit Titel und Beschreibung des Datensatzes
  const baseUrl = cfg.apiurl
    .replace(/\/api\/3\/action\/package_show.*$/i, "")
    .replace(/\/$/, "");

  container.innerHTML = `
    <div class="dataset-info mb-3">
      <h6>
        <i class="fas fa-database me-2"></i>
        Datensatz: <a href="${baseUrl}/dataset/${encodeURIComponent(
    pkg.name
  )}" target="_blank">${pkg.title}</a>
      </h6>
      <p class="text-muted">${
        cfg.datenbeschreibung || "Keine Beschreibung vorhanden."
      }</p>
    </div>
    <div id="daki-datenstand-wrap"></div>
  `;

  // Schale 4: Datenfrische anzeigen
  if (dakiDatenStand) {
    const d = new Date(dakiDatenStand);
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
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Für diesen Datensatz wurden keine Ressourcen gefunden.
      </div>`;
    return;
  }

  container.innerHTML += `
    <div class="mb-3">
      <label for="resource-select" class="form-label">
        <i class="fas fa-file-alt me-2"></i><strong>Ressource wählen:</strong>
      </label>
      <select id="resource-select" class="form-select">
        ${pkg.resources
          .map(
            (r, idx) =>
              `<option value="${idx}">${
                r.name || r.title || r.id || "Ressource " + (idx + 1)
              }</option>`
          )
          .join("")}
      </select>
      <div id="resource-desc" class="form-text mt-2"></div>
    </div>
    
    <div class="text-center mb-4">
      <button id="analyze-btn" class="btn btn-primary btn-lg me-3">
        <i class="fas fa-magic me-2"></i>Analyse starten!
      </button>
      <br>
      <small id="analyze-info" class="text-muted mt-2 d-block">
        <i class="fas fa-info-circle me-1"></i>
        Die Analyse wird mit KI durchgeführt und dauert ca. 30-60 Sekunden.
      </small>
    </div>
    
    <div id="analysis-result"></div>
  `;

  // Event-Listener für Ressourcen-Auswahl und Analyse
  setupGeneralAnalysisEvents(pkg, cfg);
}

function setupGeneralAnalysisEvents(pkg, cfg) {
  const selectEl = document.getElementById("resource-select");
  const resourceDesc = document.getElementById("resource-desc");
  const analyzeBtn = document.getElementById("analyze-btn");
  const analyzeInfo = document.getElementById("analyze-info");

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
        ? `<strong>Beschreibung:</strong> ${
            resource.description || resource.notes
          }`
        : `<em>Keine Beschreibung zur Ressource vorhanden.</em>`;
  }

  selectEl.addEventListener("change", updateResourceInfo);
  updateResourceInfo();

  analyzeBtn.addEventListener("click", async () => {
    const selectedIdx = parseInt(selectEl.value, 10);
    const resource = pkg.resources[selectedIdx];
    const resourceUrl =
      resource.url || resource.accessURL || resource.downloadURL || "";
    const resourceName =
      resource.name ||
      resource.title ||
      resource.id ||
      `Ressource ${selectedIdx + 1}`;

    const resultDiv = document.getElementById("analysis-result");
    resultDiv.innerHTML = `
      <div class="loading-container">
        <lottie-player
          src="${window.location.href}assets/loading.json"
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
      pkg.title,
      pkg.notes || "",
      "general"
    );
    if (!aiData?.result) {
      resultDiv.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Die KI konnte keine Analyse durchführen.
        </div>`;
      return;
    }

    resultDiv.innerHTML = `
      <div class="card result-card mb-4">
        <div class="card-body">
          <h5 class="card-title">
            <i class="fas fa-chart-line me-2" style="color: #007bff;"></i>
            Analyseergebnis
          </h5>
          <div class="card-text analysis-result mb-3">${aiData.result}</div>
          <div class="ai-credit">
            <i class="fas fa-robot me-2"></i>
            Die Analyse wurde mit <a href="https://deepmind.google/technologies/gemini/" target="_blank">Google Gemini</a> durchgeführt.
          </div>
        </div>
      </div>`;
  });
}

// Datensatzvergleichsanalyse
async function showComparisonAnalysis(container, cfg) {
  // Zurück-Button hinzufügen wenn noch nicht vorhanden
  addBackButtonIfNeeded(container);

  const functionContent = document.createElement("div");
  functionContent.innerHTML = `
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <h5 class="card-title">
          <i class="fas fa-balance-scale me-2" style="color: #28a745;"></i>
          Datensatzvergleichsanalyse
        </h5>
        <p class="card-text">Vergleichen Sie den konfigurierten Datensatz mit einem zweiten Datensatz systematisch auf Gemeinsamkeiten, Unterschiede und übergreifende Trends.</p>
        <div id="comparison-analysis-content">
          <div class="loading-container">
            <lottie-player
              src="${window.location.href}assets/loading.json"
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
    <div id="comparison-result"></div>
  `;

  container.appendChild(functionContent);

  const contentDiv = document.getElementById("comparison-analysis-content");
  await loadComparisonAnalysisContent(contentDiv, cfg);
}

async function loadComparisonAnalysisContent(container, cfg) {
  let dataset1;
  try {
    // Daten laden: direkt oder ueber den ODAS-Proxy (proxyAktiv)
    const json = await fetchOdasJson(cfg.apiurl, cfg);
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
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Fehler beim Laden des ersten Datensatzes:<br><code>${err.message}</code>
      </div>`;
    return;
  }

  // Oberer Infoblock mit Titel und Beschreibung des ersten Datensatzes
  const baseUrl = cfg.apiurl
    .replace(/\/api\/3\/action\/package_show.*$/i, "")
    .replace(/\/$/, "");

  container.innerHTML = `
    <div class="comparison-grid">
      <div class="dataset-input-group">
        <h6><i class="fas fa-database me-2"></i>Erster Datensatz (Konfiguriert)</h6>
        <div class="dataset-info mb-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-title">
                <a href="${baseUrl}/dataset/${encodeURIComponent(
    dataset1.name
  )}" target="_blank">${dataset1.title}</a>
              </h6>
              <p class="card-text text-muted">${
                cfg.datenbeschreibung || "Keine Beschreibung vorhanden."
              }</p>
            </div>
          </div>
        </div>
        <label for="resource1-select" class="form-label">
          <i class="fas fa-file-alt me-2"></i><strong>Ressource wählen:</strong>
        </label>
        <select id="resource1-select" class="form-select">
          ${dataset1.resources
            .map(
              (r, idx) =>
                `<option value="${idx}">${
                  r.name || r.title || r.id || "Ressource " + (idx + 1)
                }</option>`
            )
            .join("")}
        </select>
        <div id="resource1-desc" class="form-text mt-2"></div>
      </div>
      
      <div class="dataset-input-group">
        <h6><i class="fas fa-database me-2"></i>Zweiter Datensatz (Zum Vergleich)</h6>
        <input type="text" id="dataset2-url" class="form-control mb-2" placeholder="URL zum zweiten Datensatz eingeben">
        <select id="resource2-select" class="form-select mb-2" disabled>
          <option>Zuerst Datensatz laden...</option>
        </select>
        <button id="load-dataset2-btn" class="btn btn-outline-primary btn-sm">
          <i class="fas fa-download me-1"></i>Datensatz 2 laden
        </button>
        <div id="dataset2-status" class="mt-2"></div>
      </div>
    </div>
    
    <hr>
    <div class="d-flex align-items-center justify-content-center">
      <button id="compare-btn" class="btn btn-success btn-lg me-3" disabled>
        <i class="fas fa-sync-alt me-2"></i>Vergleichsanalyse starten!
      </button>
      <small class="text-muted">
        <i class="fas fa-info-circle me-1"></i>
        Zweiten Datensatz laden, um den Vergleich zu starten
      </small>
    </div>
  `;

  // Event-Listener für Vergleichsanalyse einrichten
  setupComparisonAnalysisEvents(dataset1, cfg);
}

function setupComparisonAnalysisEvents(dataset1, cfg) {
  let dataset2 = null;

  const selectEl1 = document.getElementById("resource1-select");
  const resourceDesc1 = document.getElementById("resource1-desc");

  function updateResource1Info() {
    const selectedIdx = parseInt(selectEl1.value, 10);
    const resource = dataset1.resources[selectedIdx];

    resourceDesc1.innerHTML =
      resource.description || resource.notes
        ? `<strong>Beschreibung:</strong> ${
            resource.description || resource.notes
          }`
        : `<em>Keine Beschreibung zur Ressource vorhanden.</em>`;
  }

  selectEl1.addEventListener("change", updateResource1Info);
  updateResource1Info();

  document
    .getElementById("load-dataset2-btn")
    .addEventListener("click", async () => {
      const url = document.getElementById("dataset2-url").value.trim();
      if (!url) return;

      const statusEl = document.getElementById("dataset2-status");
      statusEl.innerHTML =
        '<span class="status-indicator status-loading"></span>Lade Datensatz...';

      dataset2 = await loadDatasetFromUrl(url, cfg);
      if (dataset2) {
        populateResourceSelect("resource2-select", dataset2.resources);
        statusEl.innerHTML =
          '<span class="status-indicator status-success"></span><strong>Datensatz erfolgreich geladen</strong>';
        checkCompareButton();
      } else {
        statusEl.innerHTML =
          '<span class="status-indicator status-error"></span>Fehler beim Laden';
      }
    });

  document.getElementById("compare-btn").addEventListener("click", async () => {
    const resource1Idx = parseInt(selectEl1.value, 10);
    const resource2Idx = parseInt(
      document.getElementById("resource2-select").value,
      10
    );

    const resource1 = dataset1.resources[resource1Idx];
    const resource2 = dataset2.resources[resource2Idx];

    const resultDiv = document.getElementById("comparison-result");
    resultDiv.innerHTML = `
      <div class="loading-container">
        <lottie-player
          src="${window.location.href}assets/loading.json"
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
      dataset2
    );
    if (!aiData?.result) {
      resultDiv.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Die KI konnte keine Vergleichsanalyse durchführen.
        </div>`;
      return;
    }

    resultDiv.innerHTML = `
      <div class="card result-card mb-4">
        <div class="card-body">
          <h5 class="card-title">
            <i class="fas fa-chart-line me-2" style="color: #28a745;"></i>
            Vergleichsanalyse-Ergebnis
          </h5>
          <div class="card-text analysis-result mb-3">${aiData.result}</div>
          <div class="ai-credit">
            <i class="fas fa-robot me-2"></i>
            Die Vergleichsanalyse wurde mit <a href="https://deepmind.google/technologies/gemini/" target="_blank">Google Gemini</a> durchgeführt.
          </div>
        </div>
      </div>`;
  });

  function checkCompareButton() {
    const btn = document.getElementById("compare-btn");
    btn.disabled = !dataset2;
    if (dataset2) {
      btn.innerHTML =
        '<i class="fas fa-sync-alt me-2"></i>Vergleichsanalyse starten!';
    }
  }
}

// Datensatzsuche
async function showSearchAnalysis(container, cfg) {
  // Zurück-Button hinzufügen wenn noch nicht vorhanden
  addBackButtonIfNeeded(container);

  const functionContent = document.createElement("div");
  functionContent.innerHTML = `
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <h5 class="card-title">
          <i class="fas fa-search me-2" style="color: #17a2b8;"></i>
          Intelligente Datensatzsuche
        </h5>
        <p class="card-text">Nutzen Sie KI-gestützte Suche, um gezielt nach spezifischen Informationen in Ihren Daten zu suchen.</p>
        <div id="search-analysis-content">
          <div class="loading-container">
            <lottie-player
              src="${window.location.href}assets/loading.json"
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

  const contentDiv = document.getElementById("search-analysis-content");
  await loadSearchAnalysisContent(contentDiv, cfg);
}

async function loadSearchAnalysisContent(container, cfg) {
  let pkg;
  try {
    // Daten laden: direkt oder ueber den ODAS-Proxy (proxyAktiv)
    const json = await fetchOdasJson(cfg.apiurl, cfg);
    if (!json.success) throw new Error("API returned success=false");

    // Nur noch CKAN Support
    if (json.result) {
      pkg = json.result;
      pkg.resources = Array.isArray(pkg.resources) ? pkg.resources : [];
      dakiDatenStand = pkg.metadata_modified || null;
    } else {
      throw new Error("Unbekanntes API-Format");
    }
  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Fehler beim Laden der Daten:<br><code>${err.message}</code>
      </div>`;
    return;
  }

  // Oberer Infoblock mit Titel und Beschreibung des Datensatzes
  const baseUrl = cfg.apiurl
    .replace(/\/api\/3\/action\/package_show.*$/i, "")
    .replace(/\/$/, "");

  container.innerHTML = `
    <div class="dataset-info mb-3">
      <h6>
        <i class="fas fa-database me-2"></i>
        Datensatz: <a href="${baseUrl}/dataset/${encodeURIComponent(
    pkg.name
  )}" target="_blank">${pkg.title}</a>
      </h6>
      <p class="text-muted">${
        cfg.datenbeschreibung || "Keine Beschreibung vorhanden."
      }</p>
    </div>
  `;

  // Ressourcen-Auswahl
  if (
    !pkg.resources ||
    !Array.isArray(pkg.resources) ||
    pkg.resources.length === 0
  ) {
    container.innerHTML += `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Für diesen Datensatz wurden keine Ressourcen gefunden.
      </div>`;
    return;
  }

  container.innerHTML += `
    <div class="mb-3">
      <label for="search-resource-select" class="form-label">
        <i class="fas fa-file-alt me-2"></i><strong>Ressource wählen:</strong>
      </label>
      <select id="search-resource-select" class="form-select">
        ${pkg.resources
          .map(
            (r, idx) =>
              `<option value="${idx}">${
                r.name || r.title || r.id || "Ressource " + (idx + 1)
              }</option>`
          )
          .join("")}
      </select>
      <div id="search-resource-desc" class="form-text mt-2"></div>
    </div>
    
    <div class="mb-4">
      <label for="search-query" class="form-label">
        <i class="fas fa-comment-dots me-2"></i><strong>Ihre Suchanfrage:</strong>
      </label>
      <textarea id="search-query" class="form-control" rows="3" placeholder="Beschreiben Sie in natürlicher Sprache, wonach Sie suchen..."></textarea>
      <div class="form-text mt-2">
        <strong>Beispiele:</strong><br>
        • "Finde alle Einträge mit Temperaturwerten über 30°C"<br>
        • "Suche nach Anomalien oder Ausreißern in den Verkaufszahlen"<br>
        • "Zeige mir Trends der letzten 6 Monate"
      </div>
    </div>
    
    <div class="text-center mb-4">
      <button id="search-btn" class="btn btn-warning btn-lg me-3">
        <i class="fas fa-magic me-2"></i>KI-Suche starten!
      </button>
      <br>
      <small id="search-info" class="text-muted mt-2 d-block">
        <i class="fas fa-info-circle me-1"></i>
        Geben Sie Ihre Suchanfrage ein und starten Sie die KI-gestützte Suche.
      </small>
    </div>
    
    <div id="search-result"></div>
  `;

  // Event-Listener für Ressourcen-Auswahl und Suche
  setupSearchAnalysisEvents(pkg, cfg);
}

function setupSearchAnalysisEvents(pkg, cfg) {
  const selectEl = document.getElementById("search-resource-select");
  const resourceDesc = document.getElementById("search-resource-desc");
  const searchBtn = document.getElementById("search-btn");
  const searchQuery = document.getElementById("search-query");

  function updateResourceInfo() {
    const selectedIdx = parseInt(selectEl.value, 10);
    const resource = pkg.resources[selectedIdx];

    resourceDesc.innerHTML =
      resource.description || resource.notes
        ? `<strong>Beschreibung:</strong> ${
            resource.description || resource.notes
          }`
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

  searchBtn.addEventListener("click", async () => {
    const selectedIdx = parseInt(selectEl.value, 10);
    const resource = pkg.resources[selectedIdx];
    const query = searchQuery.value.trim();

    if (!query) return;

    const resultDiv = document.getElementById("search-result");
    resultDiv.innerHTML = `
      <div class="loading-container">
        <lottie-player
          src="${window.location.href}assets/loading.json"
          background="transparent"
          speed="1"
          style="width: 150px; height: 150px;"
          loop autoplay>
        </lottie-player>
        <h5 class="mt-3">KI-Suche läuft...</h5>
        <p class="text-muted">Die KI durchsucht den Datensatz nach Ihren Kriterien.</p>
        <div class="alert alert-info mt-3">
          <strong>Suchbegriff:</strong> "${query}"
        </div>
      </div>
    `;

    const aiData = await sendSearchToAI(resource, pkg, query);
    if (!aiData?.result) {
      resultDiv.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Die KI konnte keine Suche durchführen.
        </div>`;
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
            <strong><i class="fas fa-quote-left me-2"></i>Ihre Suchanfrage:</strong> "${query}"
          </div>
          <div class="card-text analysis-result mb-3">${aiData.result}</div>
          <div class="ai-credit">
            <i class="fas fa-robot me-2"></i>
            Die Suche wurde mit <a href="https://deepmind.google/technologies/gemini/" target="_blank">Google Gemini</a> durchgeführt.
          </div>
        </div>
      </div>`;
  });
}

// Hilfsfunktionen
async function loadDatasetFromUrl(url, cfg = {}) {
  try {
    // Vereinfachte URL-Verarbeitung für CKAN APIs
    let apiUrl = url;
    if (url.includes("/dataset/")) {
      const datasetId = url.split("/dataset/")[1].split("/")[0];
      const baseUrl = url.split("/dataset/")[0];
      apiUrl = `${baseUrl}/api/3/action/package_show?id=${datasetId}`;
    }

    // Daten laden: direkt oder ueber den ODAS-Proxy (proxyAktiv)
    const json = await fetchOdasJson(apiUrl, cfg);

    if (json.success && json.result) {
      json.result.resources = Array.isArray(json.result.resources)
        ? json.result.resources
        : [];
      return json.result;
    }
    throw new Error("Datensatz konnte nicht geladen werden");
  } catch (err) {
    alert(`Fehler beim Laden des Datensatzes: ${err.message}`);
    return null;
  }
}

function populateResourceSelect(selectId, resources) {
  const select = document.getElementById(selectId);
  select.innerHTML = resources
    .map(
      (r, idx) =>
        `<option value="${idx}">${
          r.name || r.title || r.id || "Ressource " + (idx + 1)
        }</option>`
    )
    .join("");
  select.disabled = false;
}

async function sendToAI(
  resourceUrl,
  resourceName,
  datasetTitle,
  datasetDesc,
  analysisType = "general"
) {
  try {
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

    const aiUrl = `${window.location.href.replace(/\/+$/, "")}/ai`;
    const aiResp = await fetch(aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileUrl: fileUrl,
        prompt: promptText,
      }),
    });

    const result = await aiResp.json();
    return result;
  } catch (err) {
    console.error("Fehler beim KI-Aufruf:", err);
    return { result: `Fehler beim KI-Aufruf: ${err.message}` };
  }
}

// Spezielle KI-Funktion für Datensatzvergleich
async function sendComparisonToAI(resource1, resource2, dataset1, dataset2) {
  try {
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
      `Strukturiere deine Antwort klar und verwende HTML-Formatierung für bessere Lesbarkeit. Beginne mit einer Executive Summary der wichtigsten Erkenntnisse.`;

    const aiUrl = `${window.location.href.replace(/\/+$/, "")}/ai`;
    const aiResp = await fetch(aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileUrls: [resource1Url, resource2Url],
        prompt: promptText,
      }),
    });

    const result = await aiResp.json();
    return result;
  } catch (err) {
    console.error("Fehler beim KI-Vergleichsaufruf:", err);
    return { result: `Fehler beim KI-Vergleichsaufruf: ${err.message}` };
  }
}

// Spezielle KI-Funktion für Datensatzsuche
async function sendSearchToAI(resource, dataset, searchQuery) {
  try {
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
      `- Verwende HTML-Formatierung für bessere Struktur\n` +
      `- Falls keine exakten Treffer gefunden werden, schlage alternative Suchansätze vor\n` +
      `- Gib Hinweise für weiterführende Analysen\n\n` +
      `Konzentriere dich ausschließlich auf die Beantwortung der spezifischen Suchanfrage und liefere präzise, verwertbare Ergebnisse.`;

    const aiUrl = `${window.location.href.replace(/\/+$/, "")}/ai`;
    const aiResp = await fetch(aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileUrl: resourceUrl,
        prompt: promptText,
      }),
    });

    const result = await aiResp.json();
    return result;
  } catch (err) {
    console.error("Fehler beim KI-Suchaufruf:", err);
    return { result: `Fehler beim KI-Suchaufruf: ${err.message}` };
  }
}

function addToHead() {
  const fa = document.createElement("link");
  fa.rel = "stylesheet";
  fa.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
  document.head.appendChild(fa);

  const lottie = document.createElement("script");
  lottie.src =
    "https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js";
  document.head.appendChild(lottie);
}

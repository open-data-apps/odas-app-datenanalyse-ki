# ODAS App KI-Analyse

KI-Analyse-App für den Open Data App-Store (ODAP)

Die App KI-Analyse bietet eine Übersicht von Allgemeinen Informationen zu Datensätzen.

Die App ist eine "ODAP App V1".

## Systemvorraussetzungen

- Docker/Docker compose
- Make

Die Entwicklung wurde getestet unter Windows und Ubuntu

## Funktionen

Die APP ist eine Single Page Application Webapp. Mit:

- Logo Anzeige
- Menü
- Seiten für Impressum, Datenschutz, Beschreibung, Kontakt, Hauptinhalt
- Inhaltsbereich mit Auswahl der Ressource des Datensatzes und Analyse Button
- Fußzeile

Die Konfiguration wird vom ODAS geladen.

Die APP zeigt Ihre Konfiguration im JSON Format an.

## Entwicklung

    $ make build up

Die App wird dadurch gestartet und steht auf Port 8095 zur Verfügung:

http://localhost:8089

Weil die App mit localhost gestartet wird wird die Konfiguration lokal geladen.

### Aufbau der App

Inhaltsbereich wird in app.js erstellt. Ihr kann der eigene Code implementiert werden.

#### Desktop Version

![Alt-Text](/assets/Desktop_Screenshot.png)

## Autor

(C) 2025, Ondics GmbH

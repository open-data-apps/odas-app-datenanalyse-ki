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

## Betriebsarten

Die App kann lokal, eigenstaendig hinter einem Traefik-Reverse-Proxy oder ueber den ODAS
betrieben werden.

### Datenabruf: `proxyAktiv`

| Wert   | Bedeutung                                                                   |
| ------ | --------------------------------------------------------------------------- |
| `nein` | Direkter Abruf der Daten-URL. Standard fuer Entwicklung und Standalone.      |
| `ja`   | Abruf ueber den ODAS-Proxy `…/odp-data`. Nur im ODAS-Live-System verfuegbar. |

Bei `nein` muss die Datenquelle CORS freigeben.

### Standalone-Betrieb

> **Einschraenkung im Standalone-Betrieb.** Die Kernfunktion dieser App —
> Ausfuehren einer KI-Analyse — benoetigt den ODAS-Plattformdienst `…/ai` und
> steht **ohne ODAS nicht zur Verfuegung**. Die App ruft den ODAS-KI-Endpunkt `…/ai` auf. Den Zugang zum Sprachmodell haelt
ausschliesslich das ODAS-Backend; die App besitzt keinen eigenen Zugang.
> Die mitgelieferte `nginx.conf` kennt nur `/`, `= /config`, `/odas-config/` und
> `/assets/`; ein Request auf `…/ai` landet im Verzeichnis-Handler und
> ergibt 404. Die Schaltflaeche „Analyse starten!" ist im Standalone-Betrieb
> daher wirkungslos.
>
> Alle uebrigen Funktionen — Oberflaeche, Konfiguration, Anzeige — laufen standalone
> vollstaendig. Wer die App eigenstaendig betreiben will, muss `…/ai` durch
> einen eigenen Dienst ersetzen; das ist derzeit **nicht** ueber die Konfiguration
> moeglich, sondern erfordert eine Codeanpassung.

Voraussetzung: ein laufender Traefik mit dem externen Docker-Netzwerk `proxynet`,
dem EntryPoint `websecure` und dem Zertifikatsresolver `letsencrypt`.

1. In `docker-compose.standalone.yml` den Platzhalter `app1.example.com` durch den
   echten FQDN ersetzen.
2. In `odas-config/config.json` `proxyAktiv` auf `nein` belassen.
3. Starten:

```bash
STANDALONE=true make up
STANDALONE=true make logs
STANDALONE=true make down
```

Im Standalone-Betrieb entfaellt die lokale Portfreigabe; Traefik terminiert TLS und
leitet auf den internen Nginx-Port 80 weiter. Die Konfiguration wird aus derselben
`odas-config/config.json` gelesen wie in der Entwicklung und von Nginx unter `/config`
ausgeliefert.

### Beim Aufruf kontaktierte Drittanbieter

Beim Aufruf dieser App werden keine externen Server für Programmbibliotheken kontaktiert; alle Bibliotheken werden lokal aus `app/vendor/` ausgeliefert. Extern abgerufen wird ausschließlich die konfigurierte Datenquelle - direkt.
### Auslieferung an den ODAS

`make zip` erzeugt das Liefer-ZIP mit `app/`, `assets/`, `app-package.json` und
`CHANGELOG.md`. Die Infrastrukturdateien (`Dockerfile`, `docker-compose*.yml`,
`nginx.conf`, `Makefile`) sind nicht Teil der Auslieferung. Das ZIP ist ein Bauartefakt und wird nicht mitversioniert, sondern bei Bedarf mit `make zip` erzeugt.

## Autor

(C) 2025, Ondics GmbH

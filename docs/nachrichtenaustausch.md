# Nachrichtenaustausch im UYES Projekt

Dieses Dokument beschreibt die Kommunikation zwischen Client und Server im UYES Spiel. Sie basiert auf einer Kombination aus REST‑Endpunkten (HTTP) und Echtzeitnachrichten via Socket.IO. Alle Beispiele sind in vereinfachter Form angegeben.

## Übersicht

1. **HTTP‑Endpunkte** werden benutzt, um Lobbys zu erstellen oder beizutreten und die aktuelle Sitzungs‑ bzw. Spielinformation abzurufen.
2. **WebSocket‑Verbindung** (Socket.IO) ermöglicht den fortlaufenden Datenaustausch während Lobby‑ und Spielbetrieb.

Ein typischer Ablauf besteht darin, dass ein Spieler per HTTP eine Lobby erstellt oder ihr beitritt. Danach lädt der Browser die Lobbyseite, ruft `/api/lobbyData` ab und stellt eine Socket.IO‑Verbindung her. Anschließend erfolgen sämtliche Spielereignisse über diese WebSocket‑Verbindung.

## HTTP‑Kommunikation

| Methode/URL                 | Zweck                                        | Anfrage‑Beispielkörper            | Antwortbeispiel |
|-----------------------------|----------------------------------------------|-----------------------------------|-----------------|
| `POST /api/createGame`      | Neue Lobby anlegen                           | `{ "name": "Alice", "settings": {"players":5, "cards":7} }` | Weiterleitung auf `/lobby` |
| `POST /api/joinGame`        | Bestehender Lobby beitreten                  | `{ "code": "123456789", "playerName": "Bob" }` | Weiterleitung auf `/lobby` |
| `GET /api/lobbyData`        | Aktuelle Session‑ und Lobbydaten abrufen     | *(kein Body)*                     | `{ "code": "123456789", "name": "Bob", ... }` |
| `POST /api/updateSettings`  | Einstellungen der Lobby ändern (nur Host)    | `{ "settings": {"cards":5, "skip":true} }` | `{ "success": true }` |
| `PUT /api/gameCode`         | Game‑Code in der Session aktualisieren       | `{ "code": "987654321" }` | `{ "success": true }` |

## Socket.IO Nachrichten

Nach dem Aufruf von `io()` (siehe z.B. `public/scripts/gameplay.js`) beginnt der Echtzeitdatenaustausch. Im Folgenden sind die wichtigsten Ereignisse aufgelistet.

### Vom Client zum Server

| Ereignis            | Parameter                                                                    | Beschreibung |
|---------------------|-------------------------------------------------------------------------------|--------------|
| `join-lobby`        | `(gameCode, playerName, maxPlayers?)`                                         | Lobby erstellen oder beitreten. Beim Host wird zusätzlich `maxPlayers` übergeben. |
| `start-game`        | `(gameCode)`                                                                  | Host startet das Spiel. |
| `play-card`         | `(gameCode, { color, value, [chosenColor] })`                                 | Aktuelle Karte ausspielen. Bei Wild‑Karten wird `chosenColor` übergeben. |
| `draw-card`         | `(gameCode)`                                                                  | Eine oder mehrere Karten ziehen. |
| `uyes`              | `(gameCode)`                                                                  | Spieler meldet "UYES" (UNO). |
| `change-avatar`     | `(gameCode)`                                                                  | Zufälliges neues Avatarbild anfordern. |
| `kick-player`       | `(gameCode, playerId)`                                                         | Host entfernt Spieler aus der Lobby. |
| `close-lobby`       | `(gameCode)`                                                                  | Host löst die Lobby auf. |
| `change-code`       | `(oldCode, newCode)`                                                          | Host ändert den Game‑Code. |
| `leave-lobby`       | `(gameCode, playerId)`                                                         | Lobby verlassen (vor Spielstart). |
| `leave-game`        | `(gameCode, playerId)`                                                         | Spiel verlassen (während des Spiels). |

### Vom Server zum Client

| Ereignis                | Parameter/Format                                             | Bedeutung |
|-------------------------|--------------------------------------------------------------|-----------|
| `update-lobby`          | `(players, maxPlayers, avatars, hostName, hostId)`           | Aktuelle Spielerliste und Hostinformationen. `players` ist Array aus `{id, name}`. |
| `host-assigned`         | *(kein Payload)*                                             | Der aktuelle Client wurde zum Host erklärt. |
| `lobby-not-found`       | *(kein Payload)*                                             | Beim Beitreten wurde keine Lobby gefunden. |
| `lobby-full`            | *(kein Payload)*                                             | Lobby ist bereits voll. |
| `game-in-progress`      | *(kein Payload)*                                             | Lobby befindet sich bereits im Spiel. |
| `kicked`                | *(kein Payload)*                                             | Spieler wurde vom Host entfernt. |
| `update-code`           | `(newCode)`                                                  | Neuer Game‑Code nach Änderung. |
| `game-started`          | *(kein Payload)*                                             | Spiel beginnt. |
| `deal-cards`            | `([ {color, value, chosenColor?}, ... ])`                     | Aktuelle Kartenhand eines Spielers. |
| `player-turn`           | `({ player, startedAt, drawStack })`                          | Nächster Spieler ist am Zug, inkl. Zugbeginnzeit und Stapelanzahl für Draw‑2‑Ketten. |
| `card-played`           | `({ player, card })`                                         | Karte wurde ausgespielt. |
| `cards-drawn`           | `({ player, count })`                                        | Spieler hat Karten gezogen. |
| `order-reversed`        | `([ playerId, ... ])`                                        | Spielreihenfolge wurde umgedreht. |
| `player-skipped`        | `(playerId)`                                                 | Spieler wurde übersprungen. |
| `player-uyes`           | `({ player, active })`                                       | Anzeige, ob ein Spieler rechtzeitig "UYES" gerufen hat. |
| `update-hand-counts`    | `([ {id, name, count}, ... ])`                               | Kartenanzahl aller Spieler für die Anzeige. |
| `hand-limit-reached`    | *(kein Payload)*                                             | Spieler kann keine weiteren Karten ziehen. |
| `player-left`           | `({ players, counts, player })`                              | Spieler hat das Spiel verlassen. `players` enthält die neue Liste, `counts` die Handgrößen. |
| `game-end`              | `(winnerId)`                                                | Spiel ist beendet; Gewinner wird übermittelt. |
| `avatar-changed`        | `({ player, file })`                                        | Avatarbild eines Spielers hat sich geändert. |

### Beispielablauf

1. **Lobby erstellen**
   - Client sendet `POST /api/createGame` mit Name und Einstellungen.
   - Server legt Lobby an, speichert Daten in einem JWT‑Cookie und leitet auf `/lobby` weiter.
2. **Lobby beitreten**
   - Auf der Lobbyseite ruft der Client `GET /api/lobbyData` ab und verbindet sich per Socket.IO.
   - Danach sendet er `join-lobby` mit Game‑Code und Spielername.
   - Server bestätigt durch `update-lobby` an alle in der Lobby.
3. **Spielstart**
   - Host löst `start-game` aus.
   - Server teilt allen Spielern `game-started` mit, verteilt mit `deal-cards` die Hände und sendet `player-turn` für den ersten Zug.
4. **Spielzug**
   - Ein Spieler spielt eine Karte mittels `play-card`.
   - Server überprüft die Gültigkeit, aktualisiert den Stapel und sendet `card-played` sowie ggf. `player-turn`, `cards-drawn`, `order-reversed` usw.
5. **Spielende**
   - Sobald ein Spieler keine Karten mehr hat, sendet der Server `game-end`.
   - Die Lobby bleibt geöffnet, sodass der Host per `start-game` ein neues Spiel starten kann oder per `close-lobby` beendet.

## Datenformate

Kartenobjekte besitzen die Form:

```json
{
  "color": "red" | "yellow" | "green" | "blue" | "wild",
  "value": 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | "draw2" | "reverse" | "skip" | "wild" | "wild4",
  "chosenColor": "red" | "yellow" | "green" | "blue"   // optional bei ausgelegten Wild-Karten
}
```

Spielerlobby‑ und Handlisten bestehen jeweils aus Arrays von Objekten. Beispiel für `update-hand-counts`:

```json
[
  { "id": "playerA", "name": "Alice", "count": 5 },
  { "id": "playerB", "name": "Bob", "count": 7 }
]
```


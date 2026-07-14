# AI Assistant MVP – Funkcionális specifikáció

## Áttekintés

Az alkalmazás egy egyszerű webes AI asszisztens, amely Claude nyelvi modellt használ a háttérben. A felhasználó új beszélgetéseket indíthat, kérdéseket tehet fel, valamint később visszatérhet a korábban elmentett beszélgetésekhez.

A cél egy minimálisan működő (MVP) alkalmazás elkészítése, amely egy fél napos workshop során megvalósítható.

---

## 1. Chat felület

### Leírás

Az alkalmazás fő felülete egy chat, ahol a felhasználó üzeneteket küldhet az AI asszisztensnek és megtekintheti a válaszokat.

### Elvárt működés

- A felhasználó szöveges üzenetet írhat.
- Az üzenet elküldhető egy **Send** gombbal.
- Az elküldött üzenet azonnal megjelenik a beszélgetésben.
- Az AI válasza megjelenik az üzenetlista végén.
- Az üzenetek időrendi sorrendben jelennek meg.

---

## 2. AI válaszadás

### Leírás

Az alkalmazás a háttérben Claude modellt használ a felhasználó kérdéseinek megválaszolására.

### Elvárt működés

- Minden elküldött felhasználói üzenetre AI válasz érkezik.
- A válasz ugyanabban a beszélgetésben jelenik meg.
- Az AI mindig a teljes beszélgetési előzményt figyelembe véve válaszol.

---

## 3. Új beszélgetés létrehozása

### Leírás

A felhasználó bármikor új beszélgetést indíthat.

### Elvárt működés

- A **New Chat** gombra kattintva új, üres beszélgetés jön létre.
- Az új beszélgetés azonnal aktívvá válik.
- A korábbi beszélgetések változatlanul megmaradnak.

---

## 4. Beszélgetések mentése

### Leírás

Minden beszélgetés automatikusan mentésre kerül.

### Elvárt működés

- A felhasználói üzenetek mentésre kerülnek.
- Az AI válaszai szintén mentésre kerülnek.
- A beszélgetések az alkalmazás újraindítása után is elérhetők.

---

## 5. Beszélgetések listázása

### Leírás

Az alkalmazás megjeleníti a korábban létrehozott beszélgetések listáját.

### Elvárt működés

- A beszélgetések egy oldalsávban jelennek meg.
- Minden beszélgetéshez egy rövid cím tartozik.
- A lista automatikusan frissül új beszélgetés létrehozásakor.

---

## 6. Korábbi beszélgetés megnyitása

### Leírás

A felhasználó bármikor visszatérhet egy korábban mentett beszélgetéshez.

### Elvárt működés

- A listából kiválasztott beszélgetés megnyitható.
- Az összes korábbi üzenet betöltődik.
- A beszélgetés ugyanonnan folytatható, ahol korábban abbamaradt.

---

## 7. Beszélgetés automatikus elnevezése

### Leírás

Az alkalmazás automatikusan nevet ad az új beszélgetéseknek.

### Elvárt működés

- Az első felhasználói üzenet alapján automatikusan létrejön egy cím.
- A cím a beszélgetések listájában jelenik meg.
- Ha még nincs üzenet a beszélgetésben, ideiglenesen **New Chat** néven jelenik meg.

---

## Nem része a projektnek

Az alábbi funkciók nem részei a workshop során elkészítendő alkalmazásnak:

- Felhasználói regisztráció vagy bejelentkezés
- Többfelhasználós működés
- Valós idejű (streaming) válaszok
- Markdown vagy kódkiemelés
- Fájl- vagy képfeltöltés
- Hangalapú kommunikáció
- Képgenerálás
- Beszélgetések törlése vagy átnevezése
- Modellválasztás
- RAG (Retrieval-Augmented Generation)
- Tool Calling vagy MCP integráció
- Prompt sablonok
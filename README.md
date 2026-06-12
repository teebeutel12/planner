# Planner

Eine Familien-App als MVP mit diesen Funktionen:

- Login / Registrierung
- Partner- und Familienkonten über Einladungscode verknüpfen
- echter Monatskalender mit Termin-Detail-Popup
- Terminübersicht
- Einkaufsliste mit Bearbeiten/Löschen
- Wunschlisten nach Personen gegliedert mit Bearbeiten/Löschen
- Browser-Erinnerungen für Termine
- Cloud-Speicherung mit Supabase
- farbige Kennzeichnung je Person

## Tech-Stack

- React + TypeScript + Vite
- Supabase Auth
- Supabase Postgres als Cloud-Datenbank

## Setup

1. Ein Supabase-Projekt erstellen.
2. Für neue Projekte die Datei `supabase/schema.sql` im `SQL Editor` ausführen.
3. Wenn dein Projekt das alte Schema schon hat, zusätzlich `supabase/migrations/20260612_planner_upgrade.sql` ausführen.
4. `.env.example` nach `.env` kopieren.
5. In `.env` die Werte für `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` eintragen.
6. Abhängigkeiten installieren:

   ```bash
   npm install
   ```

7. Entwicklungsserver starten:

   ```bash
   npm run dev
   ```

## Erinnerungen / Push

- Die App unterstützt Browser-Erinnerungen für Termine.
- Nutzer können im Browser Benachrichtigungen erlauben und pro Termin eine Erinnerung setzen.
- Die aktuelle Umsetzung ist bewusst frontend-first: Erinnerungen funktionieren im geöffneten Browser bzw. in einer installierten Web-App, aber nicht als serverseitig ausgelöste Push-Nachricht bei komplett geschlossener App.
- Für echte Hintergrund-Pushs wären zusätzlich Supabase Edge Functions oder ein separater Push-Service sinnvoll.

## Datenmodell

- `profiles`: Nutzerprofil mit Name, E-Mail und Farbe
- `families`: Familienkonto mit Einladungscode
- `family_members`: Zuordnung von Personen zu einem Familienkonto
- `events`: Termine mit Teilnehmerliste und optionaler Erinnerung
- `shopping_items`: Einkaufsliste mit optionaler Zuständigkeit
- `wishes`: Wünsche je Person

## Deployment

### Vercel

1. Repository zu Vercel importieren.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Diese Environment Variables setzen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. `vercel.json` ist bereits für SPA-Rewrites vorbereitet.

### Netlify

1. Repository zu Netlify verbinden.
2. Build Command: `npm run build`
3. Publish Directory: `dist`
4. Environment Variables setzen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. `netlify.toml` enthält den nötigen SPA-Redirect.

## Hinweise

- Falls du E-Mail-Bestätigung in Supabase aktiv hast, müssen neue Nutzer ihre E-Mail erst bestätigen.
- Die App kann als statische Vite-App auf Vercel oder Netlify deployt werden.

# Plant log

My own plant tracker. Inspired by two things about me:

1. I cannot bring myself to not bother my plants every single day, whether it's watering them, checking their soil, rotating them, touching their leaves, or staring and oggling.
2. I know enough about plant care to know that everything wrong with my plants' wellbeing is something that is completely my fault, and that I need to change in order to keep them happy and healthy.

So... I build this in order to track all my plants' watering and repotting etc. schedules, so I don't have to keep guessing.

Watering plants should not be a routine thing, but rather a "when the plant actually needs it" thing. This plant tracker allows me to use my moisure meter to dictate when my plants are ready for more water, rather than me guessing or impulsively watering on a schedule.

Additionally, I wanted to be able to track the amount of light my plants are getting year-round, since the amount of light coming through my windows varies depending on the direction they're facing and the time of year.

It's served locally with a "database" as a plain JSON file and backups. I wanted it to be uncomplicated for easy editability and no issues with connectivity etc.

## Running it

**Node needs to be installed.** Check:

```
node --version
```

18+ is fine. If it says "command not found," grab the LTS installer from nodejs.org.

**Start the server:**

```
cd path/to/plant-tracker
node server.js
```

(On Mac: type** **`cd<span class="Apple-converted-space"> </span>`, drag the folder into Terminal, hit enter — saves typing the path.)

You'll see it print something like:

```
  Plant log is running.
  Open  http://localhost:4321
```

Open that URL, bookmark it. Leave the terminal window open — closing it kills the server.** **`Ctrl+C` to stop it on purpose. Run** **`node server.js` again whenever you want it back.

Port taken?** **`PORT=4322 node server.js` and use that port instead.

## Project layout

The front end used to be one long** **`app.js`. It's now split by concern under** **`public/js/`, loaded in this order (it matters — see the note at the end of this section) by** **`<script>` tags in** **`public/index.html`:

```
public/
  index.html          page shell, top bar buttons
  styles.css          colors/fonts, dark mode
  solar.js            sun-position math (loaded before everything in js/)
  js/
    constants.js      LOG_TYPES, WATER_METHODS, DIRECTIONS, DISTANCES, OBSTRUCTIONS, COLUMNS
    state.js          DB / route / ui globals, DOM element refs, lat()/lng()
    utils.js          date + text formatting helpers, toast()
    api.js            loadDB() / saveDB() — talks to /api/data
    plant-status.js   moisture helpers, log queries, checkStatus() (the "worth a check" logic)
    charts.js         the two SVG charts (year light curve, moisture-over-time)
    view-overview.js  the all-plants table (home page)
    view-history.js   the all-logs timeline (History page)
    view-plant.js     a single plant's detail page
    modal.js          modal open/close plumbing, the 0–10 meter picker
    forms.js          quick check, add/edit plant form, add/edit log form
    settings.js       the location settings modal
    actions.js        delete/archive a log or plant
    export.js         CSV/JSON export, the backup modal
    main.js           routing, all click handlers, boot — loaded last
```

Everything still shares one global scope (plain** **`<script>` tags, no bundler, no** **`import`/`export`) — same as the old single-file setup, just organized.** **`main.js` has to load last because it's the one that actually calls** **`loadDB().then(render)` to boot the app; everything before it just defines functions and constants for** **`main.js` to use.

If you add a new file, remember it goes in** **`public/js/`,** ****not** the project root —** **`server.js` only serves files that live under** **`public/`.

## All Features

**First time only:** open Settings (top bar) and set your location, either by letting the browser fill it in or typing lat/long yourself. That's what turns the light tracking on. If you ever want to turn it back off, there's a "Delete location" button right next to "Use my location" in that same modal — it clears it immediately (with an undo toast if you misclick), no need to also hit Save.** ***Files:** **`settings.js` (the modal),** **`state.js` (`lat()`/`lng()`),** **`main.js` (wires the Settings button).*

**Adding a plant:** only the name is required. Everything else can be filled in or left empty, and is always editable.** ***Files:** **`forms.js` (`plantForm()`).*

**Light/ Direction/ Location:** A plant is lit by a** ****window** or a** ****grow light**, not both— filling one in the form clears the other, since realistically a plant lives under one or the other. For a window plant, two fields are needed for the light score calculation (see light tracking section): which way it** ****faces**, and** ****how far** the plant sits from the glass. For a grow-light plant, it's just** ****hours a day**, and is treated as unchanging throughout the year.** ***Files:** **`forms.js` (the fields in** **`plantForm()`),** **`plant-status.js` (`lightNow()`),** **`charts.js` (`yearLightChart()`),** **`solar.js` (the actual sun math).*

**Checking a plant:** Check means check the soil. When measuring with a moisture meter, log the reading and click "log the reading" or "log it and watered." It tells you right there whether that number is at or below the line you set for that plant.** ***Files:** **`forms.js` (`quickCheck()`),** **`modal.js` (the meter-scale picker it uses).*

**Everything else** (fertilizing, repotting, neem oil, dusting, washing, pruning, propagating, pests, a random note) goes through "Log". You can back-date any of it.** ***Files:** **`forms.js` (`logForm()`),** **`constants.js` (`LOG_TYPES` — this is the list that drives the form's chips and every dropdown/label built from a log type).*

**Click a plant's row** to see its full page — light, moisture history, care card, and every log with the gap between entries.*Files:** **`view-plant.js` (`renderPlant()`),** **`main.js` (the row-click handler that routes there — this fires from both the overview table and the History page).*

### The "worth a check" column

It's a nudge to go** ***look*, nothing more — the meter is what actually decides whether to water. This is** **`checkStatus()` in** **`plant-status.js`, and it works in two modes:

* **You have a current reading** (a** **`check` log taken since the last watering): the bar scales smoothly from "just watered" down to your "water at" line, so a reading a couple units above the line shows as mostly-fine rather than jumping straight to red. Only a reading actually at or below your line reads as fully "due."
* **No current reading yet:** falls back to a calendar guess — days since you last touched the plant vs. how fast it usually dries out (average of its last 6 watering gaps, so it drifts with the seasons instead of getting stuck on a yearly average).
* **Never checked at all:** shows "Never checked." Checked once but no watering logged yet to establish a rhythm: shows "Learning."

*Files:** **`plant-status.js` (`checkStatus()` does the actual math),** **`view-overview.js` and** **`view-plant.js` (both render the resulting meter/pill),** **`constants.js` (`DEFAULT_WATER_AT`,** **`MOISTURE_MAX`).*

You** ***can* set an explicit "remind me every N days," which overrides the learned number — but leaving it blank is better, that's the whole point of the app.

### Grow lights count as light too

A grow light hour is treated like a strong direct-sun hour — specifically, calibrated so that running the light for as many hours as your** ****longest natural day of the year** scores the same as a perfect south sill on that day (100). So at my latitude (longest day \~15.7h), 14h of grow light scores in the high 80s/90s; 8h scores around 50. Since it's not sun-tracking, the score is flat all year — no seasonal chart, no "peaks in June," just "here's your score, change the schedule to change it."** ***Files:** **`solar.js` (the calibration math),** **`plant-status.js` (`lightNow()` calls into it).*

**Archive, don't delete**, when a plant dies or gets given away — archiving keeps the history around, deleting nukes it for good.** ***Files:** **`actions.js` (`archivePlant()`,** **`deletePlant()`).*

**History page:** Trace back every log made for every plant, newest first, filterable by plant or by log type. Clicking a row jumps to that plant's page, same as the overview table.** ***Files:** **`view-history.js` (`renderHistory()`),** **`main.js` (the History nav button + the** **`route.name === 'history'` branch in** **`render()`).*

## Seasonal Light Tracking

Given lat/long and the date, sun position isn't a guess, it's just math — the app steps through each day in 10-minute chunks and works out if the sun is up and in view of each plant's window, weighting by how high the sun is (low winter sun = same light spread over way more floor = weaker).** ***File:** **`solar.js` for all of this;** **`charts.js` draws the resulting curve.*

Comes out as a** ****light score**, 0–100, where 100 = south sill at midsummer. It's relative, not lux — good for comparing my own plants/months, not for matching a plant-care-website's numbers.

Stuff this surfaces that's easy to not realize:

* North windows get real direct sun in June (both ends of the day, gap at noon), then** ****exactly zero** direct sun roughly October–March.
* A plant across the room from a window gets way less light than it looks like it should. Distance falls off fast indoors.
* East and west windows get about the same** ***total* light — the difference is timing (west = hotter, later) not quantity.
* At 45°N, a south sill in late December is under 30% of its own June light. Same window, same plant, same room temp — just less sun angle.

Each plant's page has a** ****year chart** (today marked, waterings ticked along the bottom) and, once there's enough history, a** ****long days vs. short days** panel comparing average watering gap in each — the actual answer to "does light change how often I water this."** ***Files:** **`view-plant.js` (assembles the panel),** **`charts.js` (`yearLightChart()`),** **`plant-status.js` (`dryDownByDaylight()` does the long-day/short-day split).*

**What it doesn't account for:** temperature, humidity, airflow, or clouds (the curve assumes clear sky, so an overcast week just sits below it). Distance/obstruction settings are reasonable multipliers, not measured values. Treat the number as directionally right, not an instrument reading.

## Storage & Backups

It's all in** ****`data.json`** in the project folder (handled entirely by** **`server.js` —** **`readDB()`,** **`writeDB()`,** **`backup()`).

Every save copies the current** **`data.json` into** **`backups/` first, keeps the last 20. If something goes sideways: stop the server, copy a backup over** **`data.json`, restart.

**Backup button** (top bar) also does: download a copy of** **`data.json`, export everything as CSV, or load a** **`data.json`you saved earlier back in.** ***File:** **`export.js` (`backupModal()`,** **`exportLogsCSV()`).*

**Export table** dumps the overview grid as CSV if I want to mess with it in a spreadsheet.** ***File:** **`export.js`(`exportCSV()`).*

## If I want to change something later

**`public/js/constants.js`** —** **`LOG_TYPES`,** **`WATER_METHODS`,** **`DISTANCES`,** **`OBSTRUCTIONS` control every dropdown. New care type = one line, e.g.** **`{ id: 'humidity', label: 'Misted for humidity', detailLabel: 'Details' }` in`LOG_TYPES`, and it just shows up everywhere including stats. Meter doesn't go 1–10? Change** **`MOISTURE_MAX` here too. Default "water at" line is** **`DEFAULT_WATER_AT` (currently 3).

**`public/js/`** (the rest) — everything else the app does. See "Project layout" above for what lives where; the short version is state/helpers/api at the top of the load order, the three page renderers (`view-overview.js`,** **`view-history.js`,** **`view-plant.js`) in the middle, and the interactive bits (`modal.js`,** **`forms.js`,** **`settings.js`,** **`actions.js`,** **`export.js`,`main.js`) after that.

**`public/solar.js`** — the actual sun math.** **`DISTANCE_FACTOR`,** **`OBSTRUCTION_FACTOR`,** **`AMBIENT_SHARE` near the top are the hand-wavy estimated parts; the rest is real astronomy. If I ever get an actual lux meter, those three constants are what to tune against real numbers.

**`public/styles.css`** — colors/fonts. Variables at the top (`--leaf`,** **`--amber`,** **`--plum`, etc.) control the palette everywhere. There's a dark-mode block further down that follows the OS setting.

**`public/index.html`** — page shell, top bar buttons, and the** **`<script>` tags that load** **`public/js/*.js` in order. If I add a new** **`js/` file, it needs a** **`<script>` line here too, placed according to what it depends on (see "Project layout").

**`server.js`** — reads/writes** **`data.json`, handles backups, serves everything under** **`public/` (including** **`public/js/`). Shouldn't need to touch it.

### Data shape, if I need to hand-edit something

A plant:

```json
{
  "id": "m8xk2p",
  "name": "Big monstera",
  "species": "Monstera deliciosa",
  "windowDirection": "S",
  "distance": "Within 3 feet",
  "obstruction": "Nothing in the way",
  "growLightHours": "",
  "waterMethod": "Drench & drain",
  "waterAt": "3",
  "checkEveryDays": "",
  "potSize": "10\"",
  "potColor": "cream speckled",
  "location": "Bedroom, left of the dresser",
  "soil": "Chunky aroid mix",
  "acquired": "2024-03-11",
  "careNotes": "Fertilize monthly Mar–Sep at half strength.",
  "notes": "",
  "archived": false
}
```

A log entry:

```json
{
  "id": "m8xk9q",
  "plantId": "m8xk2p",
  "type": "water",
  "date": "2026-09-14",
  "moisture": 2,
  "method": "Drench & drain",
  "detail": "Ran water through until it drained",
  "notes": "Soil was bone dry."
}
```

`type` is** **`check` for a reading with no watering,** **`water` when I watered too, or any other id from** **`LOG_TYPES` (in** **`constants.js`).** **`moisture` only shows up on checks and waterings, and it's optional.

Settings (location) live in a top-level** **`settings` object in the same file:

```json
{ "latitude": 45.52, "longitude": -122.68 }
```

Empty/missing means light tracking is off — that's what "Delete location" clears.

To add a new plant field: touch three spots — the form in** **`forms.js` (`plantForm()`), the** **`data` object that form saves, and wherever I want it to show up (the row in** **`view-overview.js`'s** **`renderOverview()`, or the care card in** **`view-plant.js`'s** **`renderPlant()`).

## Things to Remember

* Server only binds** **`127.0.0.1` — nothing outside this machine can hit it.
* Dates are** **`YYYY-MM-DD`, handled in local time on purpose, so nothing slips a day.
* Sunrise/sunset account for atmospheric refraction (matches real published times, not the raw geometric answer which runs \~12 min short).
* If my system timezone doesn't roughly match the longitude I set, the app just skips showing clock times instead of printing something like "sunset at 2am."
* No login, single user. Two tabs open at once and editing = last save wins, no merging.
* Delete** **`data.json` = fresh start. Server recreates an empty one automatically.
* All the front-end** **`.js` files have to live under** **`public/js/` —** **`server.js` only serves files that live somewhere under** **`public/`.

## To Do/ Future

* A morning list/ daily summary/ agenda — just "here's what's worth checking today," phone-sized.
* Cloud cover from a weather API, so the light curve reflects what actually happened instead of assuming clear sky. Only feature that would need internet access.
  * Or maybe a personal weather log so it's not constantly tracking my location. Log "rainy" vs. "sunny" etc. to track cloud cover.
* A per-species light floor ("this one wants a score above 30") so it can flag a plantthat's quietly gotten too little light before I notice in March.
* Photos per plant — stick them in an** **`uploads/` folder next to** **`data.json`.
* A growth log (height/leaf count) charted against the light curve.
* A potting soil mix log — to track what I'm putting in each plant's soil, where I'm getting it from, and what I currently have on hand versus need to buy.

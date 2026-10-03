/* ---------------- quick check ---------------- */

function quickCheck(plantId) {
  const p = plantById(plantId);
  if (!p) return;
  const reading = lastReading(plantId);
  let value = null;

  openModal(`Check ${p.name}`, `
    <p class="modal-lede">What does the meter say?</p>
    ${scaleWidget('qc-scale', null)}
    <p class="modal-hint" id="qc-hint">
      You water this one at ${waterAt(p)} or below.${reading ? ` Last reading was ${reading.moisture}, ${agoPhrase(daysSince(reading.date))}.` : ''}
    </p>
    <div class="form-actions">
      <button class="btn" type="button" data-close-modal>Cancel</button>
      <button class="btn" type="button" id="qc-dry" disabled>Log the reading</button>
      <button class="btn btn-primary" type="button" id="qc-water" disabled>Log it and watered</button>
    </div>`);

  wireScale('qc-scale', (v) => {
    value = v;
    document.getElementById('qc-dry').disabled = false;
    document.getElementById('qc-water').disabled = false;
    const verdict = v <= waterAt(p)
      ? `${v} — ${moistureLabel(v)}. That's at or below your line, so this one's ready for water.`
      : `${v} — ${moistureLabel(v)}. Still above your line of ${waterAt(p)}; it can wait.`;
    document.getElementById('qc-hint').textContent = verdict;
    document.getElementById('qc-water').classList.toggle('btn-primary', v <= waterAt(p));
    document.getElementById('qc-dry').classList.toggle('btn-primary', v > waterAt(p));
  });

  const write = async (watered) => {
    const entry = {
      id: uid(),
      plantId,
      type: watered ? 'water' : 'check',
      date: todayISO(),
      moisture: value,
      method: watered ? (p.waterMethod || '') : '',
      detail: '',
      notes: '',
      createdAt: new Date().toISOString(),
    };
    DB.logs.push(entry);
    await saveDB();
    closeModal();
    render();
    toast(watered ? `${p.name} read ${value} and was watered.` : `${p.name} read ${value}.`, async () => {
      DB.logs = DB.logs.filter((l) => l.id !== entry.id);
      await saveDB();
    });
  };

  document.getElementById('qc-dry').onclick = () => write(false);
  document.getElementById('qc-water').onclick = () => write(true);
}

/* ---------------- plant form ---------------- */

function plantForm(plant) {
  const p = plant || {};
  const editing = Boolean(plant);

  openModal(editing ? `Edit ${p.name}` : 'Add a plant', `
    <div class="form-grid">
      <div class="form-section">The basics</div>
      <div class="field span-2">
        <label for="f-name">What do you call it</label>
        <input id="f-name" value="${esc(p.name)}" placeholder="Big monstera by the desk">
        <div class="hint">A nickname beats a species name when you own three of the same thing.</div>
      </div>
      <div class="field"><label for="f-species">Plant type</label>
        <input id="f-species" value="${esc(p.species)}" placeholder="Monstera deliciosa"></div>
      <div class="field"><label for="f-acquired">In my care since</label>
        <input id="f-acquired" type="date" value="${esc(p.acquired)}"></div>

      <div class="form-section">Light — for seasonal tracking</div>
      <div class="field"><label for="f-direction">Nearest window faces</label>
        <select id="f-direction"><option value=""></option>${options(DIRECTIONS, p.windowDirection)}</select></div>
      <div class="field"><label for="f-distance">How far from the glass</label>
        <select id="f-distance"><option value=""></option>${options(DISTANCES, p.distance)}</select>
        <div class="hint">Light drops off fast. Across the room is a fraction of the sill.</div></div>
      <div class="field"><label for="f-obstruction">Anything in the way</label>
        <select id="f-obstruction"><option value=""></option>${options(OBSTRUCTIONS, p.obstruction)}</select></div>
      <div class="field"><label for="f-growhours">Grow light hours a day</label>
        <input id="f-growhours" type="number" min="0" max="24" step="0.5" value="${esc(p.growLightHours)}"></div>

      <div class="form-section">Water</div>
      <div class="field"><label for="f-method">How it should be watered</label>
        <select id="f-method"><option value=""></option>${options(WATER_METHODS, p.waterMethod)}</select></div>
      <div class="field"><label for="f-waterat">Water when the meter reads … or below</label>
        <input id="f-waterat" type="number" min="0" max="${MOISTURE_MAX}" step="1"
               value="${esc(p.waterAt || DEFAULT_WATER_AT)}"></div>
      <div class="field span-2"><label for="f-checkevery">Remind me to check every … days</label>
        <input id="f-checkevery" type="number" min="0" step="1" value="${esc(p.checkEveryDays)}" placeholder="leave blank">
        <div class="hint">Blank is best because the app works out how fast this one dries from your own logs,
          and keeps up as the seasons change!</div></div>

      <div class="form-section">Pot and place</div>
      <div class="field"><label for="f-potsize">Pot size</label>
        <input id="f-potsize" value="${esc(p.potSize)}" placeholder='6"'></div>
      <div class="field"><label for="f-potcolor">Pot colour or style</label>
        <input id="f-potcolor" value="${esc(p.potColor)}" placeholder="Speckled cream, no drainage"></div>
      <div class="field"><label for="f-location">Where it lives</label>
        <input id="f-location" value="${esc(p.location)}" placeholder="Bedroom, left of the dresser"></div>
      <div class="field"><label for="f-soil">Soil mix</label>
        <input id="f-soil" value="${esc(p.soil)}" placeholder="Chunky aroid mix"></div>

      <div class="form-section">Care notes</div>
      <div class="field span-2"><label for="f-carenotes">Care instructions</label>
        <textarea id="f-carenotes" placeholder="Fertilize monthly Mar–Sep at half strength. Neem in spring. Dust the big leaves.">${esc(p.careNotes)}</textarea></div>
      <div class="field span-2"><label for="f-notes">Anything else</label>
        <textarea id="f-notes" placeholder="Propagated from Nat's plant. Drops a leaf if it gets cold.">${esc(p.notes)}</textarea></div>
    </div>

    <div class="form-actions">
      <button class="btn" type="button" data-close-modal>Cancel</button>
      <button class="btn btn-primary" type="button" id="save-plant">${editing ? 'Save changes' : 'Add plant'}</button>
    </div>`);

  document.getElementById('save-plant').onclick = async () => {
    const name = val('f-name');
    if (!name) { document.getElementById('f-name').focus(); toast('Give the plant a name first.'); return; }

    const data = {
      name,
      species: val('f-species'),
      acquired: val('f-acquired'),
      windowDirection: val('f-direction'),
      distance: val('f-distance'),
      obstruction: val('f-obstruction'),
      growLightHours: val('f-growhours'),
      waterMethod: val('f-method'),
      waterAt: val('f-waterat'),
      checkEveryDays: val('f-checkevery'),
      potSize: val('f-potsize'),
      potColor: val('f-potcolor'),
      location: val('f-location'),
      soil: val('f-soil'),
      careNotes: val('f-carenotes'),
      notes: val('f-notes'),
    };

    if (editing) Object.assign(plant, data);
    else DB.plants.push({ id: uid(), archived: false, createdAt: new Date().toISOString(), ...data });

    await saveDB();
    closeModal();
    toast(editing ? 'Saved.' : `${name} added.`);
    render();
  };
}

/* ---------------- full log form ---------------- */

function logForm(existing, presetPlantId) {
  const l = existing || {};
  const editing = Boolean(existing);
  const plantId = l.plantId || presetPlantId || (DB.plants.find((p) => !p.archived) || {}).id || '';
  let current = l.type || 'check';
  let moisture = typeof l.moisture === 'number' ? l.moisture : null;

  const plantOptions = DB.plants
    .map((p) => `<option value="${esc(p.id)}"${p.id === plantId ? ' selected' : ''}>${esc(p.name)}${p.archived ? ' (archived)' : ''}</option>`)
    .join('');

  openModal(editing ? 'Edit entry' : 'Log something', `
    <div class="form-grid">
      <div class="field"><label for="l-plant">Plant</label><select id="l-plant">${plantOptions}</select></div>
      <div class="field"><label for="l-date">Date</label>
        <input id="l-date" type="date" value="${esc(l.date || todayISO())}" max="${todayISO()}"></div>
      <div class="field span-2">
        <label>What happened</label>
        <div class="chips" id="l-types">
          ${LOG_TYPES.map((t) => `<button class="chip" type="button" data-type="${t.id}" aria-pressed="${t.id === current}">${esc(t.label)}</button>`).join('')}
        </div>
      </div>
      <div class="field span-2" id="l-moisture-field">
        <label>Meter reading</label>
        ${scaleWidget('l-scale', moisture)}
      </div>
      <div class="field span-2" id="l-method-field">
        <label for="l-method">Method used</label>
        <select id="l-method"><option value=""></option>${options(WATER_METHODS, l.method)}</select>
      </div>
      <div class="span-2" id="l-moved-fields" hidden>
        <div class="form-section" style="padding-top:0;border-top:0;margin-top:0">New light &amp; location</div>
        <div class="form-grid" style="margin-top:10px">
          <div class="field span-2"><label for="l-location">Where it lives now</label>
            <input id="l-location" placeholder="Bedroom, left of the dresser"></div>
          <div class="field"><label for="l-direction">Nearest window faces</label>
            <select id="l-direction"><option value=""></option>${options(DIRECTIONS, '')}</select></div>
          <div class="field"><label for="l-distance">How far from the glass</label>
            <select id="l-distance"><option value=""></option>${options(DISTANCES, '')}</select></div>
          <div class="field"><label for="l-obstruction">Anything in the way</label>
            <select id="l-obstruction"><option value=""></option>${options(OBSTRUCTIONS, '')}</select></div>
          <div class="field"><label for="l-growhours">Grow light hours a day</label>
            <input id="l-growhours" type="number" min="0" max="24" step="0.5"></div>
        </div>
        <div class="hint" style="margin-top:8px">These start out matching the plant's current
          settings. Saving updates the plant's care card, not just this log entry!</div>
      </div>
      <div class="field span-2">
        <label for="l-detail" id="l-detail-label">Details</label>
        <input id="l-detail" value="${esc(l.detail)}" placeholder="Ran water through until it drained">
      </div>
      <div class="field span-2"><label for="l-notes">Notes</label>
        <textarea id="l-notes" placeholder="Soil was bone dry. New leaf unfurling.">${esc(l.notes)}</textarea></div>
      <div class="field span-2" id="l-repot-sync" hidden>
        <label style="display:flex;gap:8px;align-items:center;font-weight:400">
          <input type="checkbox" id="l-sync-pot" style="width:auto;margin:0">
          Update this plant's pot size to what I typed above
        </label>
      </div>
    </div>

    <div class="form-actions">
      ${editing ? '<button class="btn btn-danger left" type="button" id="delete-this-log">Delete entry</button>' : ''}
      <button class="btn" type="button" data-close-modal>Cancel</button>
      <button class="btn btn-primary" type="button" id="save-log">${editing ? 'Save changes' : 'Add entry'}</button>
    </div>`);

  function syncType() {
    const meta = typeMeta(current);
    document.getElementById('l-detail-label').textContent = meta.detailLabel;
    document.getElementById('l-moisture-field').hidden = !meta.moisture;
    document.getElementById('l-method-field').hidden = current !== 'water';
    document.getElementById('l-repot-sync').hidden = current !== 'repot';
    document.getElementById('l-moved-fields').hidden = current !== 'moved';
    if (current === 'moved') refreshMovedFields();
    modalBody.querySelectorAll('#l-types .chip').forEach((c) =>
      c.setAttribute('aria-pressed', String(c.dataset.type === current)));
  }
  syncType();

  /** Fill the moved-log fields with whatever the currently-selected plant has now. */
  function refreshMovedFields() {
    const p = plantById(val('l-plant'));
    document.getElementById('l-location').value = p ? (p.location || '') : '';
    document.getElementById('l-direction').value = p ? (p.windowDirection || '') : '';
    document.getElementById('l-distance').value = p ? (p.distance || '') : '';
    document.getElementById('l-obstruction').value = p ? (p.obstruction || '') : '';
    document.getElementById('l-growhours').value = p ? (p.growLightHours || '') : '';
  }

  document.getElementById('l-plant').addEventListener('change', () => {
    if (current === 'moved') refreshMovedFields();
  });

  wireScale('l-scale', (v) => { moisture = v; });
  document.getElementById('l-types').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    current = chip.dataset.type;
    syncType();
  });

  document.getElementById('save-log').onclick = async () => {
    const date = val('l-date');
    const pid = val('l-plant');
    if (!pid) { toast('Add a plant first.'); return; }
    if (!date) { toast('Pick a date.'); return; }

    const data = {
      plantId: pid,
      type: current,
      date,
      method: current === 'water' ? val('l-method') : '',
      detail: val('l-detail'),
      notes: val('l-notes'),
    };
    if (typeMeta(current).moisture && moisture !== null) data.moisture = moisture;
    else delete data.moisture;

    if (editing) {
      delete existing.moisture;
      Object.assign(existing, data);
    } else {
      DB.logs.push({ id: uid(), createdAt: new Date().toISOString(), ...data });
    }

    if (current === 'repot' && document.getElementById('l-sync-pot')?.checked && data.detail) {
      const p = plantById(pid);
      if (p) p.potSize = data.detail;
    }

    if (current === 'moved') {
      const p = plantById(pid);
      if (p) {
        p.location = val('l-location');
        p.windowDirection = val('l-direction');
        p.distance = val('l-distance');
        p.obstruction = val('l-obstruction');
        p.growLightHours = val('l-growhours');
      }
    }

    await saveDB();
    closeModal();
    toast(editing ? 'Entry saved.' : `${typeLabel(current)} — logged.`);
    render();
  };

  const del = document.getElementById('delete-this-log');
  if (del) del.onclick = () => deleteLog(existing.id);
}

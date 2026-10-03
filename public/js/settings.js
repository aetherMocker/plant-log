/* ---------------- settings ---------------- */

function settingsModal() {
  openModal('Settings', `
    <p class="modal-lede">Set a one-time record of your Latitude for light-tracking measurements.</p>
    <div class="form-grid">
      <div class="field"><label for="s-lat">Latitude</label>
        <input id="s-lat" type="number" step="0.01" min="-90" max="90"
               value="${lat() ?? ''}" placeholder="45.52"></div>
      <div class="field"><label for="s-lng">Longitude</label>
        <input id="s-lng" type="number" step="0.01" min="-180" max="180"
               value="${lng() ?? ''}" placeholder="-122.68">
        <div class="hint">Optional. Only used to turn solar time into clock time.</div></div>
      <div class="field span-2">
        <button class="btn" type="button" id="s-locate" style="width:auto">Use my location</button>
        ${lat() !== null ? `<button class="btn btn-danger" type="button" id="s-delete" style="width:auto">Delete location</button>` : ''}
        <span class="hint" id="s-locate-note" style="margin-left:8px"></span>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn" type="button" data-close-modal>Cancel</button>
      <button class="btn btn-primary" type="button" id="s-save">Save</button>
    </div>`);

  document.getElementById('s-locate').onclick = () => {
    const note = document.getElementById('s-locate-note');
    if (!navigator.geolocation) { note.textContent = 'This browser has no location support. Type it in instead.'; return; }
    note.textContent = 'Asking the browser…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById('s-lat').value = pos.coords.latitude.toFixed(2);
        document.getElementById('s-lng').value = pos.coords.longitude.toFixed(2);
        note.textContent = 'Filled in. Save to keep it.';
      },
      () => { note.textContent = 'The browser declined. Type it in instead.'; }
    );
  };

  const deleteBtn = document.getElementById('s-delete');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      const prevLat = DB.settings.latitude;
      const prevLng = DB.settings.longitude;
      DB.settings.latitude = undefined;
      DB.settings.longitude = undefined;
      await saveDB();
      closeModal();
      render();
      toast('Location removed. Light tracking is off.', async () => {
        DB.settings.latitude = prevLat;
        DB.settings.longitude = prevLng;
        await saveDB();
      });
    };
  }

  document.getElementById('s-save').onclick = async () => {
    const latRaw = val('s-lat');
    if (!latRaw) {
      DB.settings.latitude = undefined;
      DB.settings.longitude = undefined;
      await saveDB();
      closeModal();
      toast('Location cleared. Light tracking is off.');
      return render();
    }
    const la = parseFloat(latRaw);
    const lo = parseFloat(val('s-lng'));
    if (Number.isNaN(la) || la < -90 || la > 90) { toast('Latitude needs to be between -90 and 90.'); return; }
    DB.settings.latitude = la;
    DB.settings.longitude = Number.isNaN(lo) ? undefined : lo;
    await saveDB();
    closeModal();
    toast('Location saved. Light tracking is on.');
    render();
  };
}

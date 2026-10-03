/* ---------------- actions ---------------- */

async function deleteLog(logId) {
  const entry = DB.logs.find((l) => l.id === logId);
  if (!entry) return;
  DB.logs = DB.logs.filter((l) => l.id !== logId);
  await saveDB();
  closeModal();
  render();
  toast('Entry deleted.', async () => { DB.logs.push(entry); await saveDB(); });
}

async function archivePlant(plantId) {
  const p = plantById(plantId);
  if (!p) return;
  p.archived = !p.archived;
  await saveDB();
  render();
  toast(p.archived ? `${p.name} archived. Its history is kept.` : `${p.name} is back on the list.`);
}

async function deletePlant(plantId) {
  const p = plantById(plantId);
  if (!p) return;
  const n = logsFor(plantId).length;
  if (!confirm(`Delete ${p.name} and its ${n} log ${n === 1 ? 'entry' : 'entries'}? This cannot be undone.\n\nTo keep the history, archive it instead.`)) return;
  DB.plants = DB.plants.filter((x) => x.id !== plantId);
  DB.logs = DB.logs.filter((l) => l.plantId !== plantId);
  await saveDB();
  route = { name: 'overview' };
  render();
  toast(`${p.name} deleted.`);
}

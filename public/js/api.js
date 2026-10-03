/* ---------------- server ---------------- */

async function loadDB() {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error('Could not load data.json');
  DB = await res.json();
  DB.settings = DB.settings || {};
}

async function saveDB() {
  try {
    const res = await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plants: DB.plants, logs: DB.logs, settings: DB.settings }),
    });
    if (!res.ok) throw new Error('Save failed');
  } catch (err) {
    toast('Could not save. Is the server still running?');
    throw err;
  }
}

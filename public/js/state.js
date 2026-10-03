/* ==================================================================
   Shared app state and DOM references. Loaded early so every other
   file can rely on DB, route, ui, and the modal/toast elements
   already existing.
   ================================================================== */

let DB = { plants: [], logs: [], settings: {} };
let route = { name: 'overview', plantId: null };
let ui = {
  query: '', filter: 'all', sort: 'check', dir: 'desc',
  logFilter: 'all',        // type filter on a single plant's history table
  historyFilter: 'all',    // type filter on the all-plants history page
  historyPlant: 'all',     // plant filter on the all-plants history page
};

const app = document.getElementById('app');
const modalLayer = document.getElementById('modal-layer');
const modalBody = document.getElementById('modal-body');
const modalTitle = document.getElementById('modal-title');
const toastEl = document.getElementById('toast');

const lat = () => (typeof DB.settings.latitude === 'number' ? DB.settings.latitude : null);
const lng = () => (typeof DB.settings.longitude === 'number' ? DB.settings.longitude : null);

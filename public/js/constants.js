/* ==================================================================
   Vocabulary and static config for the plant log.
   Edit these lists to change the dropdowns and columns anywhere in
   the app.
   ================================================================== */

const LOG_TYPES = [
  { id: 'check',     label: 'Checked soil',   detailLabel: 'Details',                 moisture: true },
  { id: 'water',     label: 'Watered',        detailLabel: 'How much / how',          moisture: true },
  { id: 'fertilize', label: 'Fertilized',     detailLabel: 'Fertilizer & strength' },
  { id: 'repot',     label: 'Repotted',       detailLabel: 'New pot & soil' },
  { id: 'neem',      label: 'Neem oil',       detailLabel: 'Mix & coverage' },
  { id: 'pest',      label: 'Pest treatment', detailLabel: 'Pest & treatment' },
  { id: 'dust',      label: 'Dusted leaves',  detailLabel: 'Details' },
  { id: 'wash',      label: 'Washed leaves',  detailLabel: 'Details' },
  { id: 'prune',     label: 'Pruned',         detailLabel: 'What was cut' },
  { id: 'propagate', label: 'Propagated',     detailLabel: 'Method & count' },
  { id: 'moved',     label: 'Moved it',       detailLabel: 'From where, to where' },
  { id: 'rotate',    label: 'Rotated',        detailLabel: 'Details' },
  { id: 'note',      label: 'Note',           detailLabel: 'Details' },
];

/** Most soil meters read 1–10. Change this if yours doesn't. */
const MOISTURE_MAX = 10;
const DEFAULT_WATER_AT = 3;

/** How many meter units above the water-at line still count as "comfortable"
    before the "worth a check" meter starts climbing. Standard plants get a
    modest gradient; drought-tolerant plants (succulents, cacti) get a much
    narrower one, since for them there isn't much of a gradual "getting
    close" phase — they're fine right up until they're actually at the line. */
const STANDARD_CHECK_BUFFER = 3;
const DROUGHT_TOLERANT_CHECK_BUFFER = 2;

const WATER_METHODS = [
  'Top water',
  'Bottom water (soak)',
  'Drench & drain',
  'Shower / rinse',
  'Misting only',
  'Self-watering reservoir',
];

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const DISTANCES = ['On the sill', 'Within 3 feet', '3 to 6 feet', 'Across the room'];
const OBSTRUCTIONS = ['Nothing in the way', 'Sheer curtain or blinds', 'Tree or building outside', 'Mostly blocked'];

/** Columns for the "all plants" overview table. */
const COLUMNS = [
  { key: 'name',      label: 'Plant',      sortable: true },
  { key: 'moisture',  label: 'Soil',       sortable: true },
  { key: 'check',     label: 'Worth a check', sortable: true },
  { key: 'light',     label: 'Light today', sortable: true },
  { key: 'lastWater', label: 'Last watered', sortable: true },
  { key: 'dryDown',   label: 'Dries out in', sortable: true, num: true },
  { key: 'pot',       label: 'Pot' },
  { key: 'location',  label: 'Where',      sortable: true },
  { key: 'lastRepot', label: 'Last repot', sortable: true },
  { key: 'actions',   label: '' },
];
// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://cykzojjvbtjrpveqcftc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5a3pvamp2YnRqcnB2ZXFjZnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDMzODEsImV4cCI6MjA4ODM3OTM4MX0.FFFiF0-6P-KvJ-0q1Hnz6do0x8TYFjJS1Gyf_gjCdz8';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CHROMATIC   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const MASS_PARTS  = ['Entrance','Lord Have Mercy','Glory','Psalm','Acclamation','Offertory','Holy','Proclamation','Peace / Lamb of God','Communion 1','Communion 2','Recessional'];
const OCCASIONS   = ['Ordinary Sunday','Lent','Advent','Feast','Holy Week','Christmas','Easter','Other'];
const BEAT_FOLDERS = ['Ballad','Ballroom','Country','Dance','Entertainer','Latin','Movie & Show','Pop & Rock','R&B','Sing & Jazz','World'];
const PAGES       = ['P1','P2','P3','P4','P5','P6'];
const SLOTS       = [1,2,3,4,5,6,7,8,9,10];
const CAN_EDIT_ROLES = ['choir_master','senior_member'];
const ROLE_LABELS = { choir_master: 'CHOIR MASTER', senior_member: 'SENIOR MEMBER', member: 'MEMBER' };
const ROLE_CLASSES = { choir_master: 'role-choir_master', senior_member: 'role-senior_member', member: 'role-member' };

// ─── APP STATE ────────────────────────────────────────────────────────────────
let currentUser    = null;
let currentMassId  = null;
let editingSongId  = null;
let mBeat = '', mPage = '', mSlot = '', editOccasion = '';
let selectedOccasion = 'Ordinary Sunday';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function canEdit() {
  return currentUser && CAN_EDIT_ROLES.includes(currentUser.role);
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDateShort(d) {
  if (!d) return '—';
  try {
    const str = String(d).substring(0, 10);
    const [y, mo, day] = str.split('-');
    if (!y || !mo || !day) return d;
    return `${day}/${mo}/${y}`;
  } catch { return d; }
}

function formatName(d) {
  if (!d) return '';
  const str = String(d).substring(0, 10);
  const [y, m, day] = str.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function transposeKey(scale) {
  if (!scale || !scale.trim()) return '';
  const m = scale.trim().match(/^([A-G]#?)(([+-])(\d+))?$/);
  if (!m) return scale;
  const base = m[1], sign = m[3], steps = m[4] ? parseInt(m[4]) : 0;
  const idx = CHROMATIC.indexOf(base);
  if (idx === -1) return scale;
  if (!sign || steps === 0) return base;
  const ni = sign === '+' ? (idx+steps)%12 : ((idx-steps)%12+12)%12;
  return CHROMATIC[ni];
}

// ─── SUPABASE API ─────────────────────────────────────────────────────────────
async function sb(table, method = 'GET', body = null, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    },
    body: body ? JSON.stringify(body) : null
  });
  if (method === 'GET' || (method === 'POST' && res.headers.get('content-type')?.includes('json'))) {
    return await res.json();
  }
  return res.ok;
}

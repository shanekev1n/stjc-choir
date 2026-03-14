// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://cykzojjvbtjrpveqcftc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5a3pvamp2YnRqcnB2ZXFjZnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDMzODEsImV4cCI6MjA4ODM3OTM4MX0.FFFiF0-6P-KvJ-0q1Hnz6do0x8TYFjJS1Gyf_gjCdz8';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CHROMATIC   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const MASS_PARTS  = ['Entrance','Lord Have Mercy','Glory','Psalm','Acclamation','Offertory','Holy','Proclamation','Peace / Lamb of God','Communion 1','Communion 2','Recessional'];
const WEDDING_PARTS = ['Entrance','Lord Have Mercy','Glory','Psalm','Acclamation','Nuptial Song','Offertory','Holy','Proclamation','Peace / Lamb of God','Communion 1','Communion 2','Recessional'];
const OCCASIONS   = ['Ordinary Sunday','Lenten Sunday','Easter Sunday','Advent Sunday','Christmas','Holy Week','Feast','Wedding Mass','Custom'];
const BEAT_FOLDERS = ['Ballad','Ballroom','Country','Dance','Entertainer','Latin','Movie & Show','Pop & Rock','R&B','Sing & Jazz','World'];
const PAGES       = ['P1','P2','P3','P4','P5','P6'];
const SLOTS       = [1,2,3,4,5,6,7,8,9,10];
const CAN_EDIT_ROLES        = ['admin', 'choir_master', 'senior_member'];
const CAN_MARK_ATTENDANCE   = ['admin', 'choir_master'];
const ROLE_LABELS  = { admin: 'ADMIN', choir_master: 'CHOIR MASTER', senior_member: 'SENIOR MEMBER', member: 'MEMBER' };
const ROLE_CLASSES = { admin: 'role-admin', choir_master: 'role-choir_master', senior_member: 'role-senior_member', member: 'role-member' };

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
  // Match: root (e.g. C, C#, Eb) + optional minor (m) + optional shift (+2, -5)
  const m = scale.trim().match(/^([A-G][b#]?)(m?)(([+-])(\d+))?$/);
  if (!m) return scale;

  const base  = m[1];           // e.g. "G", "C#", "Eb"
  const minor = m[2];           // "m" or ""
  const sign  = m[4];           // "+" or "-" or undefined
  const steps = m[5] ? parseInt(m[5]) : 0;

  // Support both sharps and flats
  const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FLATS  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

  // Find index — check both sharps and flats
  let idx = SHARPS.indexOf(base);
  let useFlats = false;
  if (idx === -1) {
    idx = FLATS.indexOf(base);
    useFlats = true;
  }
  if (idx === -1) return scale; // unrecognised root

  if (!sign || steps === 0) return base + minor;

  const ni = sign === '+'
    ? (idx + steps) % 12
    : ((idx - steps) % 12 + 12) % 12;

  // Prefer flats if original was flat, otherwise sharps
  const result = useFlats ? FLATS[ni] : SHARPS[ni];
  return result + minor;
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

// ─── SONG EDIT ────────────────────────────────────────────────────────────────

let autofillData = null;   // holds the found previous song record
let songSearchTimer = null;

async function openSongEdit(songId) {
  const songs = await sb('mass_songs', 'GET', null, `?id=eq.${songId}&select=*`);
  const song = songs[0]; if (!song) return;
  editingSongId = songId;
  autofillData  = null;
  document.getElementById('autofillBanner').style.display = 'none';
  document.getElementById('modalPartTitle').textContent = song.part;
  document.getElementById('mSong').value  = song.song  || '';
  mBeat = song.beat_folder || '';
  mPage = song.page  || '';
  mSlot = song.slot != null ? String(song.slot) : '';
  document.getElementById('mTempo').value = song.tempo != null ? song.tempo : '';
  document.getElementById('mScale').value = song.scale || '';
  document.getElementById('mNotes').value = song.notes || '';
  renderBeatChips(); renderPageChips(); renderSlotChips(); updateTransposed();
  document.getElementById('songModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ─── AUTOFILL ─────────────────────────────────────────────────────────────────

function onSongNameInput(val) {
  clearTimeout(songSearchTimer);
  document.getElementById('autofillBanner').style.display = 'none';
  autofillData = null;
  const q = val.trim();
  if (q.length < 2) return;
  songSearchTimer = setTimeout(() => searchPreviousSong(q), 500);
}

async function searchPreviousSong(q) {
  try {
    const encoded = encodeURIComponent(q);
    const massFilter = currentMassId ? `&mass_id=neq.${currentMassId}` : '';
    const results = await sb('mass_songs', 'GET', null,
      `?song=ilike.*${encoded}*${massFilter}&select=*,mass_services(id,date,occasion)&order=mass_services(date).desc&limit=1`
    );
    if (!results || results.length === 0) return;

    const found = results[0];
    // Only show banner if it has at least some settings saved
    const hasSettings = found.beat_folder || found.tempo || found.scale || found.page;
    if (!hasSettings) return;

    autofillData = found;
    const mass   = found.mass_services;
    const key    = found.scale ? transposeKey(found.scale) : null;

    // Build preview tags
    const tags = [
      found.beat_folder ? `<span class="autofill-tag">${esc(found.beat_folder)}</span>` : '',
      found.page        ? `<span class="autofill-tag">${esc(found.page)}</span>` : '',
      found.slot        ? `<span class="autofill-tag">Slot ${found.slot}</span>` : '',
      found.tempo       ? `<span class="autofill-tag green">♩ ${found.tempo} BPM</span>` : '',
      found.scale       ? `<span class="autofill-tag">${esc(found.scale)}</span>` : '',
      key               ? `<span class="autofill-tag blue">Key: ${esc(key)}</span>` : '',
    ].filter(Boolean).join('');

    document.getElementById('autofillSub').textContent =
      `From ${formatDateShort(mass?.date)} · ${mass?.occasion || ''}`;
    document.getElementById('autofillTags').innerHTML = tags;
    document.getElementById('autofillBanner').style.display = 'block';
  } catch(e) { /* silently fail */ }
}

function applyAutofill() {
  if (!autofillData) return;
  mBeat = autofillData.beat_folder || '';
  mPage = autofillData.page || '';
  mSlot = autofillData.slot != null ? String(autofillData.slot) : '';
  document.getElementById('mTempo').value = autofillData.tempo != null ? autofillData.tempo : '';
  document.getElementById('mScale').value = autofillData.scale || '';
  renderBeatChips(); renderPageChips(); renderSlotChips(); updateTransposed();
  document.getElementById('autofillBanner').style.display = 'none';
  autofillData = null;
}

function dismissAutofill() {
  document.getElementById('autofillBanner').style.display = 'none';
  autofillData = null;
}

// ─── MODAL ACTIONS ────────────────────────────────────────────────────────────

function closeModal() {
  document.getElementById('songModal').classList.remove('open');
  document.getElementById('autofillBanner').style.display = 'none';
  document.body.style.overflow = '';
  editingSongId = null;
  autofillData  = null;
}

async function saveModal() {
  if (!editingSongId) { closeModal(); return; }
  const tempoVal = document.getElementById('mTempo').value;
  await sb(`mass_songs?id=eq.${editingSongId}`, 'PATCH', {
    song:        document.getElementById('mSong').value,
    beat_folder: mBeat,
    page:        mPage,
    slot:        mSlot !== '' ? parseInt(mSlot) : null,
    tempo:       tempoVal !== '' ? parseInt(tempoVal) : null,
    scale:       document.getElementById('mScale').value,
    notes:       document.getElementById('mNotes').value
  });
  closeModal();
  const mass = (await sb('mass_services', 'GET', null, `?id=eq.${currentMassId}&select=*`))[0];
  renderDetail(mass);
}

function clearSongFields() {
  document.getElementById('mSong').value  = '';
  document.getElementById('mTempo').value = '';
  document.getElementById('mScale').value = '';
  document.getElementById('mNotes').value = '';
  document.getElementById('autofillBanner').style.display = 'none';
  mBeat = ''; mPage = ''; mSlot = ''; autofillData = null;
  renderBeatChips(); renderPageChips(); renderSlotChips(); updateTransposed();
}

// ─── CHIP RENDERERS ───────────────────────────────────────────────────────────
function renderOccasionChips(containerId, selected, onClick) {
  const c = document.getElementById(containerId);
  c.innerHTML = OCCASIONS.map(o =>
    `<div class="chip ${o === selected ? 'active' : ''}" data-v="${o}">${o}</div>`
  ).join('');
  c.querySelectorAll('.chip').forEach(el => el.addEventListener('click', () => onClick(el.dataset.v)));
}

function renderChips(containerId, options, selected) {
  document.getElementById(containerId).innerHTML = options.map(o =>
    `<div class="chip ${String(o) === String(selected) ? 'active' : ''}" data-value="${o}">${o}</div>`
  ).join('');
}

function renderBeatChips() {
  renderChips('mBeatChips', BEAT_FOLDERS, mBeat);
  document.getElementById('mBeatChips').querySelectorAll('.chip').forEach(el =>
    el.onclick = () => { mBeat = el.dataset.value; renderBeatChips(); }
  );
}

function renderPageChips() {
  renderChips('mPageChips', PAGES, mPage);
  document.getElementById('mPageChips').querySelectorAll('.chip').forEach(el =>
    el.onclick = () => { mPage = el.dataset.value; renderPageChips(); }
  );
}

function renderSlotChips() {
  renderChips('mSlotChips', SLOTS, mSlot);
  document.getElementById('mSlotChips').querySelectorAll('.chip').forEach(el =>
    el.onclick = () => { mSlot = el.dataset.value; renderSlotChips(); }
  );
}

function updateTransposed() {
  const scale = document.getElementById('mScale').value;
  const key   = transposeKey(scale);
  const badge = document.getElementById('transposedBadge');
  if (scale && key) {
    badge.style.display = 'flex';
    document.getElementById('transposedValue').textContent = key;
  } else {
    badge.style.display = 'none';
  }
}

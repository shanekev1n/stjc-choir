// ─── SONG EDIT ────────────────────────────────────────────────────────────────

async function openSongEdit(songId) {
  const songs = await sb('mass_songs', 'GET', null, `?id=eq.${songId}&select=*`);
  const song = songs[0]; if (!song) return;
  editingSongId = songId;
  document.getElementById('modalPartTitle').textContent = song.part;
  document.getElementById('mSong').value  = song.song  || '';
  mBeat = song.beat_folder || '';
  mPage = song.page  || '';
  mSlot = song.slot != null ? String(song.slot) : '';
  document.getElementById('mTempo').value = song.tempo != null ? song.tempo : '';
  document.getElementById('mScale').value = song.scale || '';
  renderBeatChips(); renderPageChips(); renderSlotChips(); updateTransposed();
  document.getElementById('songModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('songModal').classList.remove('open');
  document.body.style.overflow = '';
  editingSongId = null;
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
    scale:       document.getElementById('mScale').value
  });
  closeModal();
  const mass = (await sb('mass_services', 'GET', null, `?id=eq.${currentMassId}&select=*`))[0];
  renderDetail(mass);
}

function clearSongFields() {
  document.getElementById('mSong').value  = '';
  document.getElementById('mTempo').value = '';
  document.getElementById('mScale').value = '';
  mBeat = ''; mPage = ''; mSlot = '';
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

// ─── SONG LYRICS LIBRARY ────────────────────────────────────────────────────────

// Reuse the same Mass parts vocabulary as the rest of the app
const LYRICS_PARTS = ['Entrance','Lord Have Mercy','Glory','Psalm','Acclamation','Offertory','Holy','Proclamation','Peace / Lamb of God','Communion','Recessional'];

let allLyrics          = [];
let libraryLoaded       = false;
let activeLibCategory   = '';
let libSearchTimer      = null;
let currentLyricsId      = null;
let pickerOpen            = false;

async function initLibrary() {
  // Show "Add Lyrics" button for admin only
  const addBtn = document.getElementById('addLyricsBtn');
  if (addBtn) addBtn.style.display = (currentUser && currentUser.role === 'admin') ? 'block' : 'none';

  if (libraryLoaded) {
    renderLibraryCategoryChips();
    renderLibraryResults(document.getElementById('libraryInput').value.trim());
    return;
  }
  const el = document.getElementById('libraryResults');
  el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;
  try {
    allLyrics = await sb('song_lyrics', 'GET', null, '?select=*&order=title.asc');
    libraryLoaded = true;
    renderLibraryCategoryChips();
    renderLibraryResults('');
  } catch (e) {
    el.innerHTML = `<div class="search-empty">Failed to load library. Check connection.</div>`;
  }
}

// ─── ADD NEW LYRICS (admin only) ─────────────────────────────────────────────────

let newLyricsSelectedParts = [];

function showAddLyricsModal() {
  document.getElementById('newLyricsTitle').value = '';
  document.getElementById('newLyricsBody').value = '';
  document.getElementById('newLyricsTitleError').style.display = 'none';
  newLyricsSelectedParts = [];
  renderNewLyricsPartsChips();
  document.getElementById('addLyricsModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('newLyricsTitle').focus(), 300);
}

function closeAddLyricsModal() {
  document.getElementById('addLyricsModal').classList.remove('open');
  document.body.style.overflow = '';
}

function renderNewLyricsPartsChips() {
  const el = document.getElementById('newLyricsPartsChips');
  el.innerHTML = LYRICS_PARTS.map(p => `
    <div class="chip ${newLyricsSelectedParts.includes(p) ? 'active' : ''}"
      onclick="toggleNewLyricsPart('${p.replace(/'/g,"\\'")}')">${p}</div>
  `).join('');
}

function toggleNewLyricsPart(part) {
  if (newLyricsSelectedParts.includes(part)) {
    newLyricsSelectedParts = newLyricsSelectedParts.filter(p => p !== part);
  } else {
    newLyricsSelectedParts.push(part);
  }
  renderNewLyricsPartsChips();
}

async function confirmAddLyrics() {
  const title  = document.getElementById('newLyricsTitle').value.trim();
  const lyrics = document.getElementById('newLyricsBody').value.trim();
  const errEl  = document.getElementById('newLyricsTitleError');

  if (!title) {
    errEl.textContent = 'Please enter a song title.';
    errEl.style.display = 'block';
    document.getElementById('newLyricsTitle').focus();
    return;
  }
  if (!lyrics) {
    document.getElementById('newLyricsBody').focus();
    return;
  }

  // Check for duplicate title
  const dup = allLyrics.find(s => s.title.trim().toLowerCase() === title.toLowerCase());
  if (dup) {
    errEl.textContent = `"${title}" already exists in the library.`;
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  const rows = await sb('song_lyrics', 'POST', {
    title, lyrics, categories: newLyricsSelectedParts
  });

  if (rows && rows[0]) {
    allLyrics.unshift(rows[0]);
    allLyrics.sort((a, b) => a.title.localeCompare(b.title));
  }

  closeAddLyricsModal();
  renderLibraryCategoryChips();
  renderLibraryResults(document.getElementById('libraryInput').value.trim());
}

function renderLibraryCategoryChips() {
  const el = document.getElementById('libraryCategoryChips');
  if (!el) return;
  // Build category list from actual tagged data + the standard part vocabulary
  const dataCats = [...new Set(allLyrics.flatMap(s => s.categories || []))];
  const cats = [...new Set([...LYRICS_PARTS, ...dataCats])];
  el.innerHTML = ['', ...cats].map(c => `
    <div class="search-chip ${c === activeLibCategory ? 'search-chip-active' : ''}"
      onclick="selectLibCategory('${c.replace(/'/g,"\\'")}')">
      ${c === '' ? 'All' : c}
    </div>`).join('');
}

function selectLibCategory(cat) {
  activeLibCategory = cat;
  renderLibraryCategoryChips();
  renderLibraryResults(document.getElementById('libraryInput').value.trim());
}

function onLibraryInput(val) {
  clearTimeout(libSearchTimer);
  libSearchTimer = setTimeout(() => renderLibraryResults(val.trim()), 250);
}

function renderLibraryResults(query) {
  const container = document.getElementById('libraryResults');
  let filtered = allLyrics;

  if (activeLibCategory) {
    filtered = filtered.filter(s => (s.categories || []).includes(activeLibCategory));
  }
  if (query.length > 0) {
    const q = query.toLowerCase();
    filtered = filtered.filter(s => s.title.toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="search-empty">
        <span class="search-empty-icon">📖</span>
        ${query ? `No songs found for "<strong>${esc(query)}</strong>"` : 'No songs tagged for this part yet'}
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="font-family:'Cinzel',serif;font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:14px;">
      ${filtered.length} SONG${filtered.length !== 1 ? 'S' : ''}
    </div>
    <div class="lyrics-card-grid" id="libraryCardGrid"></div>`;

  const grid = document.getElementById('libraryCardGrid');
  filtered.forEach(s => {
    const cats = s.categories || [];
    const card = document.createElement('div');
    card.className = 'lyrics-card';
    card.innerHTML = `
      <div class="lyrics-card-main">
        <div class="lyrics-card-title">${esc(s.title)}</div>
        ${cats.length ? `<div class="lyrics-card-cats">${cats.map(c => `<span class="lyrics-mini-tag">${esc(c)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="lyrics-card-actions">
        <button class="lyrics-icon-btn" title="Copy" onclick="event.stopPropagation(); quickCopyLyrics('${s.id}')">📋</button>
        <button class="lyrics-icon-btn" title="Share" onclick="event.stopPropagation(); quickShareLyrics('${s.id}')">📤</button>
      </div>`;
    card.addEventListener('click', () => openLyricsModal(s.id));
    grid.appendChild(card);
  });
}

// ─── LYRICS MODAL ───────────────────────────────────────────────────────────────

function openLyricsModal(id) {
  const song = allLyrics.find(s => s.id === id);
  if (!song) return;
  currentLyricsId = id;
  pickerOpen = false;

  document.getElementById('lyricsModalTitle').textContent = song.title;
  renderLyricsCategoryBadges(song);

  // Only admin can categorize
  const isAdmin = currentUser && currentUser.role === 'admin';
  const catBtn = document.getElementById('lyricsCategorizeBtn');
  catBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  document.getElementById('lyricsCategoryPicker').style.display = 'none';
  if (isAdmin) renderCategoryPicker(song);

  document.getElementById('lyricsModalBody').innerHTML =
    esc(song.lyrics).split('\n').map(line => line.trim() === ''
      ? '<div style="height:10px"></div>'
      : `<div>${line}</div>`).join('');
  document.getElementById('lyricsModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderLyricsCategoryBadges(song) {
  const cats = song.categories || [];
  document.getElementById('lyricsModalCategory').innerHTML = cats.length
    ? cats.map(c => `<span class="autofill-tag gold">${esc(c)}</span>`).join('')
    : `<span style="font-size:12px; color:var(--text-faint); font-style:italic;">Not tagged to any part yet</span>`;
}

function toggleCategoryPicker() {
  pickerOpen = !pickerOpen;
  document.getElementById('lyricsCategoryPicker').style.display = pickerOpen ? 'block' : 'none';
}

function renderCategoryPicker(song) {
  const cats = song.categories || [];
  const el = document.getElementById('lyricsCategoryPicker');
  el.innerHTML = `
    <div class="lyrics-picker-label">Tag this song to Mass part(s)</div>
    <div class="lyrics-picker-chips">
      ${LYRICS_PARTS.map(p => `
        <div class="chip ${cats.includes(p) ? 'active' : ''}" onclick="toggleSongCategory('${p.replace(/'/g,"\\'")}')">${p}</div>
      `).join('')}
    </div>`;
}

async function toggleSongCategory(part) {
  const song = allLyrics.find(s => s.id === currentLyricsId);
  if (!song) return;
  const isAdmin = currentUser && currentUser.role === 'admin';
  if (!isAdmin) return;

  let cats = song.categories || [];
  if (cats.includes(part)) {
    cats = cats.filter(c => c !== part);
  } else {
    cats = [...cats, part];
  }

  // Optimistic local update
  song.categories = cats;
  renderLyricsCategoryBadges(song);
  renderCategoryPicker(song);

  await sb(`song_lyrics?id=eq.${song.id}`, 'PATCH', { categories: cats });

  // Refresh category filter chips in case a brand new tag was used
  renderLibraryCategoryChips();
}

function closeLyricsModal() {
  document.getElementById('lyricsModal').classList.remove('open');
  document.body.style.overflow = '';
  currentLyricsId = null;
  pickerOpen = false;
  // Re-render grid so any new tags reflect immediately on the card
  renderLibraryResults(document.getElementById('libraryInput').value.trim());
}

// ─── COPY / SHARE ───────────────────────────────────────────────────────────────

function buildLyricsShareText(song) {
  return `🎵 ${song.title}\n\n${song.lyrics}`;
}

async function copyToClipboardOrShare(text, mode, btn) {
  const originalText = btn ? btn.textContent : '';
  try {
    if (mode === 'share' && navigator.share) {
      await navigator.share({ text });
      return;
    }
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); copied = true; }
      catch(e) { copied = false; }
    }
    if (!copied) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      ta.setSelectionRange(0, 99999);
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (btn) {
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = originalText; }, 1500);
    }
  } catch(e) { /* user cancelled share — ignore */ }
}

function copyLyrics() {
  const song = allLyrics.find(s => s.id === currentLyricsId);
  if (!song) return;
  copyToClipboardOrShare(buildLyricsShareText(song), 'copy', event.target);
}

function shareLyrics() {
  const song = allLyrics.find(s => s.id === currentLyricsId);
  if (!song) return;
  copyToClipboardOrShare(buildLyricsShareText(song), 'share', null);
}

function quickCopyLyrics(id) {
  const song = allLyrics.find(s => s.id === id);
  if (!song) return;
  copyToClipboardOrShare(buildLyricsShareText(song), 'copy', event.target);
}

function quickShareLyrics(id) {
  const song = allLyrics.find(s => s.id === id);
  if (!song) return;
  copyToClipboardOrShare(buildLyricsShareText(song), 'share', null);
}

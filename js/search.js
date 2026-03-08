// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────

function setBottomNav(visible) {
  document.getElementById('bottomNav').classList.toggle('visible', visible);
}

function switchTab(tab) {
  document.getElementById('navMasses').classList.toggle('active', tab === 'masses');
  document.getElementById('navSearch').classList.toggle('active', tab === 'search');
  if (tab === 'masses') {
    renderMassList();
    showScreen('screenList', 'STJC – Song Tracker', false);
  } else {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = `
      <div class="search-empty">
        <span class="search-empty-icon">🎵</span>
        Type a song name to search across all Masses
      </div>`;
    showScreen('screenSearch', 'Song Search', false);
  }
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────

let searchTimer = null;

function onSearchInput(val) {
  clearTimeout(searchTimer);
  const q = val.trim();
  if (q.length < 2) {
    document.getElementById('searchResults').innerHTML = `
      <div class="search-empty">
        <span class="search-empty-icon">🎵</span>
        Type at least 2 characters to search
      </div>`;
    return;
  }
  document.getElementById('searchResults').innerHTML =
    `<div class="loading-wrap"><div class="spinner"></div></div>`;
  searchTimer = setTimeout(() => doSearch(q), 350);
}

async function doSearch(q) {
  try {
    const results = await sb('mass_songs', 'GET', null,
      `?song=ilike.*${encodeURIComponent(q)}*&select=*,mass_services(id,date,occasion,name)&order=mass_services(date).desc`
    );

    const container = document.getElementById('searchResults');
    if (!results || results.length === 0) {
      container.innerHTML = `
        <div class="search-empty">
          <span class="search-empty-icon">🔍</span>
          No songs found for "<strong>${esc(q)}</strong>"
        </div>`;
      return;
    }

    function highlight(text, query) {
      if (!text) return '—';
      const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return esc(text).replace(re, '<em>$1</em>');
    }

    container.innerHTML = `
      <div style="font-family:'Cinzel',serif;font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:14px;">
        ${results.length} RESULT${results.length !== 1 ? 'S' : ''} FOUND
      </div>`;

    results.forEach(s => {
      const mass = s.mass_services;
      const key  = s.scale ? transposeKey(s.scale) : null;
      const card = document.createElement('div');
      card.className = 'search-result-card';
      card.innerHTML = `
        <div class="sr-song">${highlight(s.song, q)}</div>
        <div class="sr-mass">📅 ${esc(formatDateShort(mass?.date))} · ${esc(mass?.occasion || '')}</div>
        <div class="sr-tags">
          <span class="sr-tag gold">${esc(s.part)}</span>
          ${s.beat_folder ? `<span class="sr-tag">${esc(s.beat_folder)}</span>` : ''}
          ${s.page        ? `<span class="sr-tag">${esc(s.page)}</span>`        : ''}
          ${s.slot        ? `<span class="sr-tag">Slot ${s.slot}</span>`        : ''}
          ${s.tempo       ? `<span class="sr-tag green">♩ ${s.tempo} BPM</span>` : ''}
          ${s.scale       ? `<span class="sr-tag">${esc(s.scale)}</span>`       : ''}
          ${key           ? `<span class="sr-tag blue">Key: ${esc(key)}</span>` : ''}
        </div>`;
      card.addEventListener('click', () => {
        if (mass) {
          setBottomNav(false);
          openMass(mass.id, mass);
        }
      });
      container.appendChild(card);
    });
  } catch (e) {
    document.getElementById('searchResults').innerHTML =
      `<div class="search-empty">Search failed. Check connection.</div>`;
  }
}

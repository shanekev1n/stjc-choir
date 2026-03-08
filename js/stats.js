// ─── STATS DASHBOARD ──────────────────────────────────────────────────────────

async function renderStats() {
  const el = document.getElementById('statsContainer');
  el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;
  try {
    const [masses, songs] = await Promise.all([
      sb('mass_services', 'GET', null, '?select=*'),
      sb('mass_songs',    'GET', null, '?select=*')
    ]);

    const filledSongs = songs.filter(s => s.song && s.song.trim() !== '');

    // Song frequency map
    const songCount = {};
    filledSongs.forEach(s => {
      const k = s.song.trim().toLowerCase();
      if (!songCount[k]) songCount[k] = { name: s.song.trim(), count: 0 };
      songCount[k].count++;
    });
    const sorted    = Object.values(songCount).sort((a, b) => b.count - a.count);
    const topSongs  = sorted.slice(0, 5);
    const leastSongs = [...sorted].sort((a, b) => a.count - b.count).slice(0, 5);

    el.innerHTML = `
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${masses.length}</div>
          <div class="stat-label">Total Masses</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${filledSongs.length}</div>
          <div class="stat-label">Songs Filled</div>
        </div>
      </div>

      <!-- Most Used Songs -->
      <div class="stats-section">
        <div class="stats-section-title">🎵 Most Used Songs</div>
        ${topSongs.length === 0
          ? `<div class="stats-empty">No songs filled yet</div>`
          : topSongs.map((s, i) => `
            <div class="stats-row">
              <span class="stats-rank">${i + 1}</span>
              <span class="stats-row-name">${esc(s.name)}</span>
              <span class="stats-row-count">${s.count}×</span>
            </div>`).join('')}
      </div>

      <!-- Least Used Songs -->
      <div class="stats-section">
        <div class="stats-section-title">📉 Least Used Songs</div>
        ${leastSongs.length === 0
          ? `<div class="stats-empty">No songs filled yet</div>`
          : leastSongs.map((s, i) => `
            <div class="stats-row">
              <span class="stats-rank">${i + 1}</span>
              <span class="stats-row-name">${esc(s.name)}</span>
              <span class="stats-row-count" style="color:var(--text-dim)">${s.count}×</span>
            </div>`).join('')}
      </div>`;

  } catch(e) {
    el.innerHTML = `<div class="stats-empty">Failed to load stats.</div>`;
  }
}

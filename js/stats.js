// ─── STATS DASHBOARD ──────────────────────────────────────────────────────────

async function renderStats() {
  const el = document.getElementById('statsContainer');
  el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;
  try {
    const [masses, songs, users] = await Promise.all([
      sb('mass_services', 'GET', null, '?select=*'),
      sb('mass_songs',    'GET', null, '?select=*'),
      sb('users',         'GET', null, '?select=id,display_name,role')
    ]);

    const filledSongs = songs.filter(s => s.song && s.song.trim() !== '');
    const totalSongs  = songs.length;
    const fillRate    = totalSongs > 0 ? Math.round((filledSongs.length / totalSongs) * 100) : 0;

    // Top songs
    const songCount = {};
    filledSongs.forEach(s => {
      const k = s.song.trim().toLowerCase();
      songCount[k] = { name: s.song.trim(), count: (songCount[k]?.count || 0) + 1 };
    });
    const topSongs = Object.values(songCount).sort((a,b) => b.count - a.count).slice(0, 5);

    // Top beat folders
    const beatCount = {};
    songs.filter(s => s.beat_folder).forEach(s => {
      beatCount[s.beat_folder] = (beatCount[s.beat_folder] || 0) + 1;
    });
    const topBeats = Object.entries(beatCount).sort((a,b) => b[1] - a[1]).slice(0, 5);

    // Most active creator
    const creatorCount = {};
    masses.forEach(m => {
      if (m.created_by) creatorCount[m.created_by] = (creatorCount[m.created_by] || 0) + 1;
    });
    const topCreatorId = Object.entries(creatorCount).sort((a,b) => b[1] - a[1])[0]?.[0];
    const topCreator   = users.find(u => u.id === topCreatorId);

    // Songs used only once vs multiple times
    const reused = Object.values(songCount).filter(s => s.count > 1).length;
    const unique  = Object.values(songCount).filter(s => s.count === 1).length;

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
        <div class="stat-card">
          <div class="stat-number">${fillRate}%</div>
          <div class="stat-label">Fill Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${reused}</div>
          <div class="stat-label">Reused Songs</div>
        </div>
      </div>

      <!-- Most Active Creator -->
      ${topCreator ? `
      <div class="stats-section">
        <div class="stats-section-title">🏆 Most Active</div>
        <div class="stat-highlight-card">
          <div class="stat-highlight-name">${esc(topCreator.display_name)}</div>
          <div class="stat-highlight-sub">${creatorCount[topCreatorId]} Mass${creatorCount[topCreatorId] !== 1 ? 'es' : ''} created · ${ROLE_LABELS[topCreator.role]}</div>
        </div>
      </div>` : ''}

      <!-- Top Songs -->
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

      <!-- Top Beat Folders -->
      <div class="stats-section">
        <div class="stats-section-title">🎛 Top Beat Folders</div>
        ${topBeats.length === 0
          ? `<div class="stats-empty">No beat folders set yet</div>`
          : topBeats.map(([name, count], i) => `
            <div class="stats-row">
              <span class="stats-rank">${i + 1}</span>
              <span class="stats-row-name">${esc(name)}</span>
              <div class="stats-bar-wrap">
                <div class="stats-bar-fill" style="width:${Math.round((count/topBeats[0][1])*100)}%"></div>
              </div>
              <span class="stats-row-count">${count}</span>
            </div>`).join('')}
      </div>

      <!-- Unique vs Reused -->
      <div class="stats-section">
        <div class="stats-section-title">📊 Song Usage</div>
        <div class="stats-grid" style="margin-top:10px;">
          <div class="stat-card">
            <div class="stat-number" style="color:var(--blue)">${unique}</div>
            <div class="stat-label">Used Once</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color:var(--gold)">${reused}</div>
            <div class="stat-label">Used Again</div>
          </div>
        </div>
      </div>`;
  } catch(e) {
    el.innerHTML = `<div class="stats-empty">Failed to load stats.</div>`;
  }
}

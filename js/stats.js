// ─── STATS DASHBOARD ──────────────────────────────────────────────────────────

async function renderStats() {
  const el = document.getElementById('statsContainer');
  el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;
  try {
    const [masses, songs, allMembers, allAttendance] = await Promise.all([
      sb('mass_services', 'GET', null, '?select=*'),
      sb('mass_songs',    'GET', null, '?select=*'),
      sb('users',         'GET', null, '?select=id,display_name&role=neq.admin&order=display_name.asc'),
      sb('attendance',    'GET', null, '?select=*')
    ]);

    const filledSongs = songs.filter(s => s.song && s.song.trim() !== '');
    const totalMasses = masses.length;

    // ── Song frequency ────────────────────────────────────────────────────────
    const songCount = {};
    filledSongs.forEach(s => {
      const k = s.song.trim().toLowerCase();
      if (!songCount[k]) songCount[k] = { name: s.song.trim(), count: 0 };
      songCount[k].count++;
    });
    const sorted     = Object.values(songCount).sort((a, b) => b.count - a.count);
    const topSongs   = sorted.slice(0, 5);
    const leastSongs = [...sorted].sort((a, b) => a.count - b.count).slice(0, 5);

    // ── Attendance % ──────────────────────────────────────────────────────────
    const attStats = allMembers.map(m => {
      const records  = allAttendance.filter(a => a.user_id === m.id);
      const attended = records.filter(a => a.status === 'present' || a.status === 'late').length;
      const marked   = records.filter(a => a.status !== '').length;
      const pct      = marked > 0 ? Math.round((attended / marked) * 100) : null;
      return { name: m.display_name, attended, marked, totalMasses, pct };
    }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

    const attHtml = attStats.length === 0
      ? `<div class="stats-empty">No members found.</div>`
      : attStats.map(a => {
          const pct     = a.pct ?? 0;
          const barColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--red)';
          const label   = a.pct === null ? 'No data' : `${a.attended} / ${a.marked} · ${pct}%`;
          return `
            <div class="att-stat-row">
              <div class="att-stat-header">
                <span class="att-stat-name">${esc(a.name)}</span>
                <span class="att-stat-pct" style="color:${barColor}">${label}</span>
              </div>
              <div class="att-stat-bar-wrap">
                <div class="att-stat-bar" style="width:${pct}%; background:${barColor};"></div>
              </div>
            </div>`;
        }).join('');

    el.innerHTML = `
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${totalMasses}</div>
          <div class="stat-label">Total Masses</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${filledSongs.length}</div>
          <div class="stat-label">Songs Filled</div>
        </div>
      </div>

      <!-- Attendance % -->
      <div class="stats-section">
        <div class="stats-section-title">👥 Attendance</div>
        <div class="att-stat-note">Present + Late counted as attended</div>
        ${attHtml}
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

// ─── STATS DASHBOARD ──────────────────────────────────────────────────────────

async function renderStats() {
  const el = document.getElementById('statsContainer');
  el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;
  const isAdmin = currentUser && currentUser.role === 'admin';

  try {
    const fetches = [
      sb('mass_services', 'GET', null, '?select=*'),
      sb('mass_songs',    'GET', null, '?select=*'),
    ];
    // Only fetch member/attendance data if admin — members shouldn't see it at all
    if (isAdmin) {
      fetches.push(
        sb('users',      'GET', null, '?select=id,display_name&role=neq.admin&order=display_name.asc'),
        sb('attendance', 'GET', null, '?select=*')
      );
    }
    const [masses, songs, allMembers, allAttendance] = await Promise.all(fetches);

    const filledSongs = songs.filter(s => s.song && s.song.trim() !== '');
    const totalMasses = masses.length;

    // ── Most used per part (exclude Proclamation) ─────────────────────────────
    const EXCLUDED_PARTS = ['Proclamation'];

    const allParts = [...new Set(filledSongs.map(s => s.part))]
      .filter(p => !EXCLUDED_PARTS.includes(p))
      .sort((a, b) => {
        function key(part) {
          const m = part.match(/^(.+?)\s+(\d+)$/);
          if (m) {
            const anchor = MASS_PARTS.findIndex(p => p === m[1]+' 1' || p === m[1]+' 2' || p === m[1]);
            return (anchor !== -1 ? anchor : MASS_PARTS.length) * 1000 + parseInt(m[2]);
          }
          const idx = MASS_PARTS.indexOf(part);
          return idx !== -1 ? idx * 1000 + 1 : 9999;
        }
        return key(a) - key(b);
      });

    const perPartHtml = allParts.map(part => {
      const partSongs = filledSongs.filter(s => s.part === part);
      const countMap  = {};
      partSongs.forEach(s => {
        const k = s.song.trim().toLowerCase();
        if (!countMap[k]) countMap[k] = { name: s.song.trim(), count: 0 };
        countMap[k].count++;
      });
      const top = Object.values(countMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      if (top.length === 0) return '';

      return `
        <div class="stats-part-block">
          <div class="stats-part-title">${esc(part)}</div>
          ${top.map((s, i) => `
            <div class="stats-row">
              <span class="stats-rank">${i + 1}</span>
              <span class="stats-row-name">${esc(s.name)}</span>
              <span class="stats-row-count">${s.count}×</span>
            </div>`).join('')}
        </div>`;
    }).join('');

    let attHtml = '', lateHtml = '';

    if (isAdmin) {
      // ── Attendance % ──────────────────────────────────────────────────────
      const attStats = allMembers.map(m => {
        const records  = allAttendance.filter(a => a.user_id === m.id);
        const attended = records.filter(a => a.status === 'present' || a.status === 'late').length;
        const marked   = records.filter(a => a.status !== '').length;
        const pct      = marked > 0 ? Math.round((attended / marked) * 100) : null;
        return { name: m.display_name, attended, marked, pct };
      }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

      attHtml = attStats.length === 0
        ? `<div class="stats-empty">No members found.</div>`
        : attStats.map(a => {
            const pct      = a.pct ?? 0;
            const barColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--red)';
            const label    = a.pct === null ? 'No data' : `${a.attended} / ${a.marked} · ${pct}%`;
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

      // ── Late Count ───────────────────────────────────────────────────────
      const lateStats = allMembers
        .map(m => {
          const lateCount = allAttendance.filter(a => a.user_id === m.id && a.status === 'late').length;
          return { name: m.display_name, lateCount };
        })
        .filter(m => m.lateCount > 0)
        .sort((a, b) => b.lateCount - a.lateCount);

      lateHtml = lateStats.length === 0
        ? `<div class="stats-empty">No late marks recorded.</div>`
        : lateStats.map((m, i) => `
            <div class="stats-row">
              <span class="stats-rank">${i + 1}</span>
              <span class="stats-row-name">${esc(m.name)}</span>
              <span class="stats-row-count" style="color:var(--gold)">${m.lateCount}×</span>
            </div>`).join('');
    }

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

      ${isAdmin ? `
      <!-- Attendance -->
      <div class="stats-section">
        <div class="stats-section-title">👥 Attendance</div>
        <div class="att-stat-note">Present + Late counted as attended</div>
        ${attHtml}
      </div>

      <!-- Late Count -->
      <div class="stats-section">
        <div class="stats-section-title">⏰ Late Count</div>
        <div class="att-stat-note">Total times marked Late, across all masses</div>
        ${lateHtml}
      </div>` : ''}

      <!-- Most Used Per Part -->
      <div class="stats-section">
        <div class="stats-section-title">🎵 Most Used Songs by Part</div>
        <div class="stats-part-note">Top 3 songs per part · Proclamation excluded</div>
        ${perPartHtml || `<div class="stats-empty">No songs filled yet</div>`}
      </div>`;

  } catch(e) {
    el.innerHTML = `<div class="stats-empty">Failed to load stats.</div>`;
  }
}

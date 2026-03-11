// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

const STATUS_CYCLE = ['', 'present', 'late', 'absent'];
const STATUS_LABEL = { '': '—', 'present': 'Present', 'late': 'Late', 'absent': 'Absent' };
const STATUS_COLOR = {
  '':        'var(--text-dim)',
  'present': 'var(--green)',
  'late':    'var(--gold)',
  'absent':  'var(--red)'
};

function switchDetailTab(tab) {
  document.getElementById('tabSongs').classList.toggle('active', tab === 'songs');
  document.getElementById('tabAttendance').classList.toggle('active', tab === 'attendance');
  document.getElementById('tabContentSongs').style.display      = tab === 'songs'      ? 'block' : 'none';
  document.getElementById('tabContentAttendance').style.display = tab === 'attendance' ? 'block' : 'none';
  if (tab === 'attendance') {
    // Always re-fetch fresh — never use stale data
    document.getElementById('attendanceContainer').innerHTML =
      `<div class="loading-wrap"><div class="spinner"></div></div>`;
    renderAttendance();
  }
}

async function renderAttendance() {
  const el = document.getElementById('attendanceContainer');
  el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;

  try {
    const [members, records] = await Promise.all([
      sb('users', 'GET', null, '?select=id,display_name,role&role=neq.admin&order=display_name.asc'),
      sb('attendance', 'GET', null, `?mass_id=eq.${currentMassId}&select=*`)
    ]);

    const canMark = CAN_MARK_ATTENDANCE.includes(currentUser.role);
    const recMap  = {};
    records.forEach(r => recMap[r.user_id] = r);

    const rows = members.map(m => {
      const rec    = recMap[m.id] || {};
      const status = rec.status || '';
      const color  = STATUS_COLOR[status];

      return `
        <div class="att-row ${canMark ? 'att-clickable' : ''}"
          id="att-row-${m.id}"
          ${canMark ? `onclick="cycleStatus('${m.id}', '${status}')"` : ''}>
          <span class="att-name">${esc(m.display_name)}</span>
          <span class="att-status" id="att-${m.id}" style="color:${color}; border-color:${color}">
            ${STATUS_LABEL[status]}
          </span>
        </div>`;
    }).join('');

    el.innerHTML = `
      <div class="att-list">${rows}</div>
      ${!canMark ? `<div class="att-readonly-note">Only Admin and Choir Master can mark attendance.</div>` : ''}`;

  } catch(e) {
    el.innerHTML = `<div class="search-empty">Failed to load attendance.</div>`;
  }
}

async function cycleStatus(userId, currentStatus) {
  const idx  = STATUS_CYCLE.indexOf(currentStatus);
  const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];

  // Optimistic UI update
  const el  = document.getElementById(`att-${userId}`);
  const row = document.getElementById(`att-row-${userId}`);
  if (el) {
    el.textContent   = STATUS_LABEL[next];
    el.style.color        = STATUS_COLOR[next];
    el.style.borderColor  = STATUS_COLOR[next];
  }
  if (row) row.setAttribute('onclick', `cycleStatus('${userId}', '${next}')`);

  // Upsert to Supabase
  const existing = (await sb('attendance', 'GET', null,
    `?mass_id=eq.${currentMassId}&user_id=eq.${userId}&select=id`))[0];

  if (existing) {
    await sb(`attendance?id=eq.${existing.id}`, 'PATCH', { status: next });
  } else {
    await sb('attendance', 'POST', {
      mass_id: currentMassId,
      user_id: userId,
      status:  next
    });
  }
}

// ─── MASS LIST ────────────────────────────────────────────────────────────────

async function renderMassList() {
  const el = document.getElementById('massListContainer');
  el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;
  try {
    const masses = await sb('mass_services', 'GET', null, '?select=*&order=date.asc');
    if (!masses || masses.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <span class="empty-cross">✝</span>
          <div class="empty-title">Saint Teresa's Junior Choir</div>
          <div class="empty-sub">No Masses added yet.<br>Tap the button below to get started.</div>
        </div>`;
    } else {
      const grid = document.createElement('div');
      grid.className = 'mass-grid';
      const badge = `<div class="role-badge ${ROLE_CLASSES[currentUser.role]}">${ROLE_LABELS[currentUser.role]}</div>`;
      el.innerHTML = badge;

      masses.forEach(m => {
        const card = document.createElement('div');
        card.className = 'mass-card';
        card.innerHTML = `
          <div class="date-badge"><div class="date-badge-text">${esc(formatDateShort(m.date))}</div></div>
          <div class="card-body">
            <div class="card-name">${esc(formatDateShort(m.date))}</div>
            <div class="card-occasion">${esc(m.occasion || '')}</div>
            ${m.notes ? `<div class="card-notes">${esc(m.notes)}</div>` : ''}
          </div>
          ${canEdit() ? `<button class="card-delete-btn" title="Delete">🗑</button>` : '<div style="width:14px"></div>'}`;
        if (canEdit()) {
          card.querySelector('.card-delete-btn').addEventListener('click', e => {
            e.stopPropagation();
            showDeleteConfirm(m.id, formatDateShort(m.date));
          });
        }
        card.addEventListener('click', () => openMass(m.id, m));
        grid.appendChild(card);
      });
      el.appendChild(grid);
    }

    // FAB — only for editors
    let fab = document.getElementById('massFab');
    if (!fab && canEdit()) {
      fab = document.createElement('button');
      fab.className = 'fab'; fab.id = 'massFab'; fab.textContent = '+ New Mass';
      fab.onclick = showNewMass;
      document.getElementById('screenList').appendChild(fab);
    } else if (fab) {
      fab.style.display = canEdit() ? 'block' : 'none';
    }
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-sub">Failed to load. Check connection.</div></div>`;
  }
}

// ─── NEW MASS ────────────────────────────────────────────────────────────────
function showNewMass() {
  selectedOccasion = 'Ordinary Sunday';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('newDate').value = today;
  document.getElementById('newNotes').value = '';
  document.getElementById('newDateHint').textContent = 'Name will be: ' + formatName(today);
  renderOccasionChips('occasionChips', selectedOccasion, v => {
    selectedOccasion = v;
    renderOccasionChips('occasionChips', selectedOccasion, arguments.callee);
  });
  showScreen('screenNew', 'New Sunday Mass', true);
}

async function createMass() {
  const date = document.getElementById('newDate').value;
  if (!date) { alert('Please select a date.'); return; }
  const btn = document.getElementById('createMassBtn');
  btn.textContent = 'Creating...'; btn.disabled = true;
  try {
    const rows = await sb('mass_services', 'POST', {
      name: formatName(date), date,
      occasion: selectedOccasion,
      notes: document.getElementById('newNotes').value,
      created_by: currentUser.id
    });
    const mass = rows[0];
    const parts = selectedOccasion === 'Lent' ? MASS_PARTS.filter(p => p !== 'Glory') : MASS_PARTS;
    for (const part of parts) {
      await sb('mass_songs', 'POST', { mass_id: mass.id, part, song:'', beat_folder:'', page:'', slot:null, tempo:null, scale:'' });
    }
    btn.textContent = 'Create Sunday Mass'; btn.disabled = false;
    openMass(mass.id, mass);
  } catch (e) {
    alert('Error creating Mass. Try again.');
    btn.textContent = 'Create Sunday Mass'; btn.disabled = false;
  }
}

// ─── MASS DETAIL ─────────────────────────────────────────────────────────────
async function openMass(id, massData) {
  currentMassId = id;
  const mass = massData || (await sb('mass_services', 'GET', null, `?id=eq.${id}&select=*`))[0];
  showScreen('screenDetail', formatDateShort(mass.date), true);
  renderDetail(mass);
}

async function renderDetail(mass) {
  const infoCard = document.getElementById('detailInfoCard');
  const editable = canEdit();
  infoCard.innerHTML = `
    <div class="info-row" ${editable ? 'style="cursor:pointer"' : ''}>
      <span class="info-key">DATE</span>
      <span class="info-val editable-row">${esc(formatDateShort(mass.date))}${editable ? ' ✎' : ''}</span>
    </div>
    <div class="info-row" ${editable ? 'style="cursor:pointer"' : ''}>
      <span class="info-key">OCCASION</span>
      <span class="info-val editable-row">${esc(mass.occasion || '—')}${editable ? ' ✎' : ''}</span>
    </div>
    <div class="info-row" ${editable ? 'style="cursor:pointer"' : ''}>
      <span class="info-key">NOTES</span>
      <span class="info-val ${mass.notes ? 'editable-row' : 'editable'}">
        ${mass.notes ? esc(mass.notes) + (editable ? ' ✎' : '') : (editable ? 'Tap to add notes...' : '—')}
      </span>
    </div>`;
  if (editable) {
    infoCard.querySelectorAll('.info-row').forEach(r => r.addEventListener('click', () => openMassInfoEdit(mass)));
  }

  // Songs table
  const tbody = document.getElementById('songsTableBody');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;
  const songs = await sb('mass_songs', 'GET', null, `?mass_id=eq.${mass.id}&select=*`);
  const sorted = songs
    .filter(s => !(mass.occasion === 'Lent' && s.part === 'Glory'))
    .sort((a, b) => MASS_PARTS.indexOf(a.part) - MASS_PARTS.indexOf(b.part));

  tbody.innerHTML = sorted.map(s => `
    <tr class="${editable ? 'clickable' : ''}" onclick="${editable ? `openSongEdit('${s.id}')` : ''}">
      <td class="td-part">${esc(s.part)}</td>
      <td class="td-song ${s.song ? '' : 'empty'}">${s.song ? esc(s.song) : (editable ? 'tap to fill' : '—')}</td>
      <td class="td-beat">${s.beat_folder || '—'}</td>
      <td class="td-page">${s.page || '—'}</td>
      <td class="td-slot">${s.slot != null ? s.slot : '—'}</td>
      <td class="td-bpm">${s.tempo != null ? s.tempo : '—'}</td>
      <td class="td-scale">${s.scale || '—'}</td>
      <td class="td-key">${s.scale ? transposeKey(s.scale) : '—'}</td>
    </tr>`).join('');

  document.getElementById('deleteMassBtn').setAttribute('data-mass-id', mass.id);
  document.getElementById('deleteMassBtn').setAttribute('data-mass-name', formatDateShort(mass.date));
  document.getElementById('massActionBtns').style.display = editable ? 'flex' : 'none';
}

// ─── DELETE MASS ─────────────────────────────────────────────────────────────
function showDeleteConfirm(id, name) {
  document.getElementById('confirmMsg').textContent = `Delete Mass "${name}"? All songs will be permanently removed.`;
  document.getElementById('confirmOverlay').style.display = 'flex';
  document.getElementById('confirmYes').onclick = async () => {
    document.getElementById('confirmOverlay').style.display = 'none';
    await sb(`mass_services?id=eq.${id}`, 'DELETE');
    currentMassId = null;
    renderMassList();
    showScreen('screenList', 'STJC – Song Tracker', false);
  };
  document.getElementById('confirmNo').onclick = () => {
    document.getElementById('confirmOverlay').style.display = 'none';
  };
}

function deleteMassAction() {
  const id   = document.getElementById('deleteMassBtn').getAttribute('data-mass-id');
  const name = document.getElementById('deleteMassBtn').getAttribute('data-mass-name');
  if (id) showDeleteConfirm(id, name);
}

// ─── EDIT MASS INFO ───────────────────────────────────────────────────────────
function openMassInfoEdit(mass) {
  editOccasion = mass.occasion || 'Ordinary Sunday';
  document.getElementById('editDate').value  = mass.date  || '';
  document.getElementById('editNotes').value = mass.notes || '';
  renderOccasionChips('editOccasionChips', editOccasion, v => {
    editOccasion = v;
    renderOccasionChips('editOccasionChips', editOccasion, arguments.callee);
  });
  document.getElementById('massInfoModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

async function saveMassInfo() {
  const id      = document.getElementById('deleteMassBtn').getAttribute('data-mass-id');
  const newDate = document.getElementById('editDate').value;
  const notes   = document.getElementById('editNotes').value;
  const wasLentRes = await sb('mass_services', 'GET', null, `?id=eq.${id}&select=occasion`);
  const wasLent = wasLentRes[0]?.occasion === 'Lent';
  const nowLent = editOccasion === 'Lent';

  await sb(`mass_services?id=eq.${id}`, 'PATCH', {
    date: newDate, name: formatName(newDate), occasion: editOccasion, notes
  });

  if (wasLent && !nowLent) {
    const existing = await sb('mass_songs', 'GET', null, `?mass_id=eq.${id}&part=eq.Glory`);
    if (!existing.length) {
      await sb('mass_songs', 'POST', { mass_id:id, part:'Glory', song:'', beat_folder:'', page:'', slot:null, tempo:null, scale:'' });
    }
  }

  closeMassInfoModal();
  const updated = (await sb('mass_services', 'GET', null, `?id=eq.${id}&select=*`))[0];
  showScreen('screenDetail', formatDateShort(updated.date), true);
  renderDetail(updated);
}

function closeMassInfoModal() {
  document.getElementById('massInfoModal').classList.remove('open');
  document.body.style.overflow = '';
}

async function saveAllSongs() {
  const btn = document.querySelector('[onclick="saveAllSongs()"]');
  const orig = btn.textContent;
  btn.textContent = '✓ Saved!'; btn.style.background = '#4caf7d';
  setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 1500);
}

// ─── MASS LIST ────────────────────────────────────────────────────────────────

let allMasses       = [];
let activeOccFilter = '';

async function renderMassList(forceRefresh = true) {
  const el = document.getElementById('massListContainer');
  if (forceRefresh) {
    el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;
    try {
      allMasses = await sb('mass_services', 'GET', null, '?select=*&order=date.desc');
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><div class="empty-sub">Failed to load. Check connection.</div></div>`;
      return;
    }
  }

  // Build filter chips from unique occasions
  const occasions = [...new Set(allMasses.map(m => m.occasion).filter(Boolean))].sort();
  const filterEl  = document.getElementById('massFilterChips');
  if (filterEl) {
    filterEl.innerHTML = ['', ...occasions].map(o => `
      <div class="mass-filter-chip ${o === activeOccFilter ? 'active' : ''}"
        onclick="setOccFilter('${o.replace(/'/g, "\\'")}')">
        ${o === '' ? 'All' : o}
      </div>`).join('');
  }

  const filtered = activeOccFilter
    ? allMasses.filter(m => m.occasion === activeOccFilter)
    : allMasses;

  if (!filtered || filtered.length === 0) {
    el.innerHTML = allMasses.length === 0
      ? `<div class="empty-state">
           <span class="empty-cross">✝</span>
           <div class="empty-title">Saint Teresa's Junior Choir</div>
           <div class="empty-sub">No Masses added yet.<br>Tap the button below to get started.</div>
         </div>`
      : `<div class="empty-state">
           <div class="empty-sub">No masses found for "<strong>${activeOccFilter}</strong>"</div>
         </div>`;
  } else {
    const grid = document.createElement('div');
    grid.className = 'mass-grid';
    const badge = `<div class="role-badge ${ROLE_CLASSES[currentUser.role]}">${ROLE_LABELS[currentUser.role]}</div>`;
    el.innerHTML = badge;

    filtered.forEach(m => {
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

  let fab = document.getElementById('massFab');
  if (!fab && canEdit()) {
    fab = document.createElement('button');
    fab.className = 'fab'; fab.id = 'massFab'; fab.textContent = '+ New Mass';
    fab.onclick = showNewMass;
    document.getElementById('screenList').appendChild(fab);
  } else if (fab) {
    fab.style.display = canEdit() ? 'block' : 'none';
  }
}

function setOccFilter(occ) {
  activeOccFilter = occ;
  renderMassList(false);
}

// ─── NEW MASS ─────────────────────────────────────────────────────────────────
function showNewMass() {
  selectedOccasion = 'Ordinary Sunday';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('newDate').value = today;
  document.getElementById('newNotes').value = '';
  document.getElementById('newDateHint').textContent = 'Name will be: ' + formatName(today);
  renderOccasionChips('occasionChips', selectedOccasion, v => {
    selectedOccasion = v;
    renderOccasionChips('occasionChips', selectedOccasion, arguments.callee);
    document.getElementById('customOccasionWrap').style.display =
      v === 'Custom' ? 'block' : 'none';
  });
  showScreen('screenNew', 'New Sunday Mass', true);
}

async function createMass() {
  const date = document.getElementById('newDate').value;
  if (!date) { alert('Please select a date.'); return; }
  const btn = document.getElementById('createMassBtn');
  btn.textContent = 'Creating...'; btn.disabled = true;
  try {
    const occasionToSave = selectedOccasion === 'Custom'
      ? (document.getElementById('customOccasionInput')?.value.trim() || 'Custom')
      : selectedOccasion;
    const parts = (() => {
      if (selectedOccasion === 'Lenten Sunday') return MASS_PARTS.filter(p => p !== 'Glory');
      if (selectedOccasion === 'Wedding Mass')  return WEDDING_PARTS;
      return MASS_PARTS;
    })();
    const rows = await sb('mass_services', 'POST', {
      name: formatName(date), date, occasion: occasionToSave,
      notes: document.getElementById('newNotes').value,
      created_by: currentUser.id
    });
    const mass = rows[0];
    for (const part of parts) {
      await sb('mass_songs', 'POST', { mass_id: mass.id, part, song:'', beat_folder:'', page:'', slot:null, tempo:null, scale:'', notes:'' });
    }
    btn.textContent = 'Create Sunday Mass'; btn.disabled = false;
    openMass(mass.id, mass);
  } catch (e) {
    alert('Error creating Mass. Try again.');
    btn.textContent = 'Create Sunday Mass'; btn.disabled = false;
  }
}

// ─── MASS DETAIL ──────────────────────────────────────────────────────────────
async function openMass(id, massData) {
  currentMassId = id;
  const mass = massData || (await sb('mass_services', 'GET', null, `?id=eq.${id}&select=*`))[0];
  showScreen('screenDetail', formatDateShort(mass.date), true);

  // Always reset to Songs tab and clear attendance cache
  const tabSongs      = document.getElementById('tabSongs');
  const tabAtt        = document.getElementById('tabAttendance');
  const contentSongs  = document.getElementById('tabContentSongs');
  const contentAtt    = document.getElementById('tabContentAttendance');
  if (tabSongs)     { tabSongs.classList.add('active'); tabAtt.classList.remove('active'); }
  if (contentSongs) { contentSongs.style.display = 'block'; contentAtt.style.display = 'none'; }
  if (contentAtt)   { contentAtt.innerHTML = '<div id="attendanceContainer"></div>'; }

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

  const tbody = document.getElementById('songsTableBody');
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;
  const songs = await sb('mass_songs', 'GET', null, `?mass_id=eq.${mass.id}&select=*`);
  function partSortKey(part) {
    const numberedMatch = part.match(/^(.+?)\s+(\d+)$/);
    if (numberedMatch) {
      const base = numberedMatch[1];
      const num  = parseInt(numberedMatch[2]);
      const anchor = MASS_PARTS.findIndex(p =>
        p === base + ' 1' || p === base + ' 2' || p === base
      );
      const basePos = anchor !== -1 ? anchor : MASS_PARTS.length;
      return basePos * 1000 + num;
    }
    const idx = MASS_PARTS.indexOf(part);
    if (idx !== -1) return idx * 1000 + 1;

    // Custom part — look up stored position
    const customOrder = JSON.parse(sessionStorage.getItem('customPartOrder') || '{}');
    const afterPart   = customOrder[currentMassId]?.[part];
    if (afterPart === '__start__') return 0.5;
    if (afterPart) {
      const afterKey = partSortKey(afterPart);
      return afterKey + 0.5; // place just after the target part
    }
    return 9999; // unknown custom parts go to end
  }

  const sorted = songs
    .filter(s => !(mass.occasion === 'Lenten Sunday' && s.part === 'Glory'))
    .sort((a, b) => partSortKey(a.part) - partSortKey(b.part));

  tbody.innerHTML = sorted.map(s => `
    <tr class="${editable ? 'clickable' : ''}" onclick="${editable ? `openSongEdit('${s.id}')` : ''}">
      <td class="td-part">${esc(s.part)}</td>
      <td class="td-song ${s.song ? '' : 'empty'}">
        ${s.song ? esc(s.song) : (editable ? 'tap to fill' : '—')}
        ${s.notes ? `<div class="td-song-notes">${esc(s.notes)}</div>` : ''}
      </td>
      <td class="td-beat">${s.beat_folder || '—'}</td>
      <td class="td-page">${s.page || '—'}</td>
      <td class="td-slot">${s.slot != null ? s.slot : '—'}</td>
      <td class="td-bpm">${s.tempo != null ? s.tempo : '—'}</td>
      <td class="td-scale">${s.scale || '—'}</td>
      <td class="td-key">${s.scale ? transposeKey(s.scale) : '—'}</td>
      ${canEdit() ? `<td onclick="event.stopPropagation()" style="text-align:center">
        <button class="practiced-btn ${s.practiced ? 'practiced-done' : ''}"
          onclick="togglePracticed('${s.id}', ${s.practiced ? 'true' : 'false'}, this)">
          ${s.practiced ? '✓' : '○'}
        </button>
      </td>` : `<td style="text-align:center;color:${s.practiced ? 'var(--green)' : 'var(--border)'}">${s.practiced ? '✓' : '○'}</td>`}
    </tr>
    `).join('');

  // Render "Add Part" button (editors only)
  const addPartWrap = document.getElementById('addPartWrap');
  if (addPartWrap) addPartWrap.style.display = editable ? 'block' : 'none';

  document.getElementById('massActionBtns').setAttribute('data-mass-id', mass.id);
  document.getElementById('massActionBtns').setAttribute('data-mass-name', formatDateShort(mass.date));
  document.getElementById('massActionBtns').style.display = editable ? 'flex' : 'none';

  // Update check-all button state
  if (editable) {
    const hdr = document.getElementById('checkAllBtn');
    if (hdr) {
      const allChecked = sorted.every(s => s.practiced);
      hdr.textContent = allChecked ? '✓ All' : '○ All';
      hdr.style.color = allChecked ? 'var(--green)' : '';
      hdr.style.borderColor = allChecked ? 'var(--green)' : '';
      hdr.style.display = 'inline-flex';
    }
  } else {
    const hdr = document.getElementById('checkAllBtn');
    if (hdr) hdr.style.display = 'none';
  }
}

// ─── ADD EXTRA PART ───────────────────────────────────────────────────────────
function showAddPartModal() {
  showAddPartStep1();
  document.getElementById('addPartModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function showAddPartStep1() {
  document.getElementById('addPartStep1').style.display           = 'block';
  document.getElementById('addPartStep2Duplicate').style.display  = 'none';
  document.getElementById('addPartStep2Custom').style.display     = 'none';
}

function showAddPartStep2(type) {
  document.getElementById('addPartStep1').style.display = 'none';

  if (type === 'duplicate') {
    document.getElementById('addPartStep2Duplicate').style.display = 'block';
    // Build list of all parts currently in mass (unique base names)
    const tbody = document.getElementById('songsTableBody');
    const existingParts = [...tbody.querySelectorAll('.td-part')]
      .map(el => el.textContent.trim())
      .map(p => p.replace(/\s+\d+$/, '').trim()); // strip number
    const unique = [...new Set(existingParts)];
    document.getElementById('addPartChips').innerHTML = unique.map(p => `
      <div class="add-part-chip" onclick="confirmAddPart('${p}')">${p}</div>
    `).join('');

  } else {
    document.getElementById('addPartStep2Custom').style.display = 'block';
    document.getElementById('customPartName').value = '';
    // Build "insert after" chips from current parts
    const tbody = document.getElementById('songsTableBody');
    const parts = [...tbody.querySelectorAll('.td-part')]
      .map(el => el.textContent.trim());
    let selectedAfter = parts[parts.length - 1] || '';
    const renderInsertChips = () => {
      document.getElementById('insertAfterChips').innerHTML =
        [{ label: 'At the Beginning', val: '__start__' },
         ...parts.map(p => ({ label: `After ${p}`, val: p }))]
        .map(o => `
          <div class="add-part-chip ${o.val === selectedAfter ? 'add-part-chip-active' : ''}"
            onclick="selectInsertAfter('${o.val.replace(/'/g,"\\'")}')">
            ${o.label}
          </div>`).join('');
    };
    window._selectedInsertAfter = selectedAfter;
    window._renderInsertChips   = renderInsertChips;
    renderInsertChips();
  }
}

function selectInsertAfter(val) {
  window._selectedInsertAfter = val;
  window._renderInsertChips && window._renderInsertChips();
  // Re-highlight selected
  document.querySelectorAll('#insertAfterChips .add-part-chip').forEach(el => {
    el.classList.toggle('add-part-chip-active',
      el.textContent.trim() === (val === '__start__' ? 'At the Beginning' : `After ${val}`));
  });
}

async function confirmCustomPart() {
  const name = document.getElementById('customPartName').value.trim();
  if (!name) { document.getElementById('customPartName').focus(); return; }
  const after = window._selectedInsertAfter || '__end__';
  closeAddPartModal();

  // Get current songs to determine sort position
  const existing = await sb('mass_songs', 'GET', null, `?mass_id=eq.${currentMassId}&select=*`);

  // Build a custom sort key based on current order
  const sorted = existing.sort((a, b) => {
    function key(part) {
      const m = part.match(/^(.+?)\s+(\d+)$/);
      if (m) {
        const anchor = MASS_PARTS.findIndex(p => p === m[1]+' 1' || p === m[1]+' 2' || p === m[1]);
        return (anchor !== -1 ? anchor : MASS_PARTS.length) * 1000 + parseInt(m[2]);
      }
      const idx = MASS_PARTS.indexOf(part);
      return idx !== -1 ? idx * 1000 + 1 : 9999;
    }
    return key(a.part) - key(b.part);
  });

  // We store custom parts with a special prefix so sort knows their position
  // Use a unique name that won't collide
  await sb('mass_songs', 'POST', {
    mass_id: currentMassId, part: name,
    song: '', beat_folder: '', page: '',
    slot: null, tempo: null, scale: '', notes: '', practiced: false
  });

  // Store insert-after preference in sessionStorage for render-time sorting
  const customOrder = JSON.parse(sessionStorage.getItem('customPartOrder') || '{}');
  if (!customOrder[currentMassId]) customOrder[currentMassId] = {};
  customOrder[currentMassId][name] = after;
  sessionStorage.setItem('customPartOrder', JSON.stringify(customOrder));

  const mass = (await sb('mass_services', 'GET', null, `?id=eq.${currentMassId}&select=*`))[0];
  renderDetail(mass);
}

function closeAddPartModal() {
  document.getElementById('addPartModal').classList.remove('open');
  document.body.style.overflow = '';
}

async function confirmAddPart(basePart) {
  closeAddPartModal();
  const existing = await sb('mass_songs', 'GET', null, `?mass_id=eq.${currentMassId}&select=part`);

  // Find all numbered variants e.g. "Psalm 2", "Psalm 3"
  const nums = existing
    .map(s => s.part.match(new RegExp('^' + basePart + '\\s+(\\d+)$')))
    .filter(Boolean)
    .map(m => parseInt(m[1]));

  // Check if bare base part exists (e.g. "Psalm" with no number)
  const bareExists = existing.some(s => s.part === basePart);

  let nextNum;
  if (nums.length > 0) {
    nextNum = Math.max(...nums) + 1;
  } else if (bareExists) {
    nextNum = 2; // Psalm exists → next is Psalm 2
  } else {
    nextNum = 1;
  }

  const newPart = `${basePart} ${nextNum}`;
  await sb('mass_songs', 'POST', {
    mass_id: currentMassId, part: newPart,
    song: '', beat_folder: '', page: '',
    slot: null, tempo: null, scale: '', notes: '', practiced: false
  });
  const mass = (await sb('mass_services', 'GET', null, `?id=eq.${currentMassId}&select=*`))[0];
  renderDetail(mass);
}

async function deleteExtraPart(songId, partName) {
  if (!confirm(`Remove "${partName}" from this mass?`)) return;
  await sb(`mass_songs?id=eq.${songId}`, 'DELETE');
  const mass = (await sb('mass_services', 'GET', null, `?id=eq.${currentMassId}&select=*`))[0];
  renderDetail(mass);
}

// ─── DELETE MASS ──────────────────────────────────────────────────────────────
function showDeleteConfirm(id, name, onConfirmCallback) {
  const msg = onConfirmCallback
    ? `Remove "${name}" from this mass? This cannot be undone.`
    : `Delete Mass "${name}"? All songs will be permanently removed.`;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmOverlay').style.display = 'flex';
  document.getElementById('confirmYes').onclick = async () => {
    document.getElementById('confirmOverlay').style.display = 'none';
    if (onConfirmCallback) {
      await onConfirmCallback();
    } else {
      await sb(`mass_services?id=eq.${id}`, 'DELETE');
      currentMassId = null;
      renderMassList();
      showScreen('screenList', 'STJC – Song Tracker', false);
    }
  };
  document.getElementById('confirmNo').onclick = () => {
    document.getElementById('confirmOverlay').style.display = 'none';
  };
}

function deleteMassAction() {
  const id   = document.getElementById('massActionBtns').getAttribute('data-mass-id');
  const name = document.getElementById('massActionBtns').getAttribute('data-mass-name');
  if (id) showDeleteConfirm(id, name);
}

// ─── COPY MASS ────────────────────────────────────────────────────────────────
function showCopyMass() {
  const next = new Date(); next.setDate(next.getDate() + 7);
  document.getElementById('copyMassDate').value = next.toISOString().split('T')[0];
  document.getElementById('copyMassModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCopyMassModal() {
  document.getElementById('copyMassModal').classList.remove('open');
  document.body.style.overflow = '';
}

async function confirmCopyMass() {
  const newDate = document.getElementById('copyMassDate').value;
  if (!newDate) { alert('Please select a date.'); return; }
  const btn = document.getElementById('copyMassConfirmBtn');
  btn.textContent = 'Copying...'; btn.disabled = true;
  try {
    const srcId   = document.getElementById('massActionBtns').getAttribute('data-mass-id');
    const srcMass = (await sb('mass_services', 'GET', null, `?id=eq.${srcId}&select=*`))[0];
    const newRows = await sb('mass_services', 'POST', {
      name: formatName(newDate), date: newDate,
      occasion: srcMass.occasion, notes: srcMass.notes || '',
      created_by: currentUser.id
    });
    const newMass = newRows[0];
    const srcSongs = await sb('mass_songs', 'GET', null, `?mass_id=eq.${srcId}&select=*`);
    for (const s of srcSongs) {
      await sb('mass_songs', 'POST', {
        mass_id: newMass.id, part: s.part, song: s.song || '',
        beat_folder: s.beat_folder || '', page: s.page || '',
        slot: s.slot, tempo: s.tempo, scale: s.scale || '',
        notes: s.notes || '', practiced: false
      });
    }
    btn.textContent = 'Copy Mass'; btn.disabled = false;
    closeCopyMassModal();
    openMass(newMass.id, newMass);
  } catch(e) {
    alert('Error copying Mass. Try again.');
    btn.textContent = 'Copy Mass'; btn.disabled = false;
  }
}

// ─── EDIT MASS INFO ───────────────────────────────────────────────────────────
function openMassInfoEdit(mass) {
  editOccasion = mass.occasion || 'Ordinary Sunday';
  document.getElementById('editDate').value  = mass.date  || '';
  document.getElementById('editNotes').value = mass.notes || '';
  renderOccasionChips('editOccasionChips', editOccasion, v => {
    editOccasion = v;
    renderOccasionChips('editOccasionChips', editOccasion, arguments.callee);
    document.getElementById('editCustomOccasionWrap').style.display =
      v === 'Custom' ? 'block' : 'none';
  });
  // If current occasion isn't in list, show as custom
  if (!OCCASIONS.includes(editOccasion)) {
    const customInput = document.getElementById('editCustomOccasionInput');
    if (customInput) customInput.value = editOccasion;
    editOccasion = 'Custom';
    document.getElementById('editCustomOccasionWrap').style.display = 'block';
    renderOccasionChips('editOccasionChips', 'Custom', v => {
      editOccasion = v;
      renderOccasionChips('editOccasionChips', editOccasion, arguments.callee);
      document.getElementById('editCustomOccasionWrap').style.display =
        v === 'Custom' ? 'block' : 'none';
    });
  }
  document.getElementById('massInfoModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

async function saveMassInfo() {
  const id      = document.getElementById('massActionBtns').getAttribute('data-mass-id');
  const newDate = document.getElementById('editDate').value;
  const notes   = document.getElementById('editNotes').value;
  const occasionToSave = editOccasion === 'Custom'
    ? (document.getElementById('editCustomOccasionInput')?.value.trim() || 'Custom')
    : editOccasion;
  const wasLentRes = await sb('mass_services', 'GET', null, `?id=eq.${id}&select=occasion`);
  const wasLent = wasLentRes[0]?.occasion === 'Lenten Sunday';
  const nowLent = editOccasion === 'Lenten Sunday';
  await sb(`mass_services?id=eq.${id}`, 'PATCH', { date: newDate, name: formatName(newDate), occasion: occasionToSave, notes });
  if (wasLent && !nowLent) {
    const existing = await sb('mass_songs', 'GET', null, `?mass_id=eq.${id}&part=eq.Glory`);
    if (!existing.length) await sb('mass_songs', 'POST', { mass_id:id, part:'Glory', song:'', beat_folder:'', page:'', slot:null, tempo:null, scale:'', notes:'' });
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

async function copyMassList() {
  const btn = document.querySelector('.btn-copylist');
  btn.textContent = 'Sharing...'; btn.disabled = true;
  try {
    const mass  = (await sb('mass_services', 'GET', null, `?id=eq.${currentMassId}&select=*`))[0];
    const songs = await sb('mass_songs', 'GET', null, `?mass_id=eq.${currentMassId}&select=*`);
    const sorted = songs
      .filter(s => !(mass.occasion === 'Lenten Sunday' && s.part === 'Glory'))
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
        return key(a.part) - key(b.part);
      });

    let text = `✝ STJC – ${formatDateShort(mass.date)} (${mass.occasion || 'Sunday Mass'})\n\n`;
    sorted.forEach(s => {
      text += `${s.part}: ${s.song && s.song.trim() ? s.song.trim() : '—'}\n`;
    });
    text = text.trim();

    // Safari / iOS — use native share sheet
    if (navigator.share) {
      await navigator.share({ text });
      btn.textContent = '📋 Copy Song List';
      btn.disabled = false;
      return;
    }

    // Other browsers — clipboard API
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

    btn.textContent = '✓ Copied!';
    btn.style.color = 'var(--green)';
    btn.style.borderColor = 'var(--green)';
    setTimeout(() => {
      btn.textContent = '📋 Copy Song List';
      btn.style.color = '';
      btn.style.borderColor = '';
      btn.disabled = false;
    }, 2000);

  } catch(e) {
    // User cancelled share or error
    btn.textContent = '📋 Copy Song List';
    btn.style.color = '';
    btn.style.borderColor = '';
    btn.disabled = false;
  }
}

async function saveAllSongs() {
  const btn = document.querySelector('[onclick="saveAllSongs()"]');
  const orig = btn.textContent;
  btn.textContent = '✓ Saved!'; btn.style.background = '#4caf7d';
  setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 1500);
}

// ─── CHECK ALL PRACTICED ──────────────────────────────────────────────────────
async function toggleCheckAll() {
  const rows   = document.querySelectorAll('#songsTableBody tr');
  const btns   = document.querySelectorAll('.practiced-btn');
  if (!btns.length) return;

  // Decide: if all are checked → uncheck all, else check all
  const allChecked = [...btns].every(b => b.classList.contains('practiced-done'));
  const newVal     = !allChecked;

  // Update UI immediately
  btns.forEach(btn => {
    btn.textContent = newVal ? '✓' : '○';
    btn.classList.toggle('practiced-done', newVal);
    const songId = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
    btn.setAttribute('onclick', `togglePracticed('${songId}', ${newVal}, this); event.stopPropagation()`);
  });

  // Update header button
  const hdr = document.getElementById('checkAllBtn');
  if (hdr) {
    hdr.textContent  = newVal ? '✓ All' : '○ All';
    hdr.style.color  = newVal ? 'var(--green)' : '';
    hdr.style.borderColor = newVal ? 'var(--green)' : '';
  }

  // Batch update Supabase
  await sb(`mass_songs?mass_id=eq.${currentMassId}`, 'PATCH', { practiced: newVal });
}


async function togglePracticed(songId, current, btnEl) {
  const newVal = !current;
  btnEl.textContent = newVal ? '✓' : '○';
  btnEl.classList.toggle('practiced-done', newVal);
  // Update the onclick to reflect new state
  btnEl.setAttribute('onclick', `togglePracticed('${songId}', ${newVal}, this); event.stopPropagation()`);
  await sb(`mass_songs?id=eq.${songId}`, 'PATCH', { practiced: newVal });
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

async function renderAdminPanel() {
  const el = document.getElementById('adminContainer');
  el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;
  try {
    const users = await sb('users', 'GET', null, '?select=*&order=display_name.asc');
    el.innerHTML = `
      <div class="section-heading">ALL MEMBERS</div>
      <div id="membersList"></div>
      <div class="section-heading" style="margin-top:32px;">CREATE NEW ACCOUNT</div>
      <div class="info-card" style="padding:18px; margin-bottom:32px;">
        <div class="form-section" style="margin-top:0">
          <label class="form-label">Display Name</label>
          <input type="text" class="form-input" id="newMemberName" placeholder="e.g. John Doe" autocomplete="off"/>
        </div>
        <div class="form-section">
          <label class="form-label">Username</label>
          <input type="text" class="form-input" id="newMemberUsername" placeholder="e.g. john_123" autocomplete="off"/>
        </div>
        <div class="form-section">
          <label class="form-label">Role</label>
          <div class="chip-row" id="newMemberRoleChips"></div>
        </div>
        <div class="form-hint" style="margin-top:8px;">Default password: <strong>stjc1234</strong> — member can change it from their profile.</div>
        <button class="btn-primary" style="margin-top:16px;" onclick="createMemberAccount()">Create Account</button>
        <div id="adminMsg" style="display:none; margin-top:12px; padding:10px; border-radius:10px; text-align:center; font-size:14px;"></div>
      </div>`;
    renderMembersList(users);
    renderNewMemberRoleChips();
  } catch (e) {
    el.innerHTML = `<div class="stats-empty">Failed to load. Check connection.</div>`;
  }
}

// ─── MEMBERS LIST ─────────────────────────────────────────────────────────────
function renderMembersList(users) {
  const el = document.getElementById('membersList');
  if (!el) return;
  const filtered = users.filter(u => u.role !== 'admin');
  if (!filtered.length) {
    el.innerHTML = `<div class="stats-empty">No members found.</div>`;
    return;
  }
  el.innerHTML = filtered.map(u => `
    <div class="member-card" id="member-${u.id}">
      <div class="member-card-top">
        <div class="member-identity">
          <div>
            <div class="member-display-name">${esc(u.display_name)}</div>
            <div class="member-username">@${esc(u.username)}</div>
          </div>
        </div>
        <span class="role-badge ${ROLE_CLASSES[u.role] || ''}">${ROLE_LABELS[u.role] || u.role}</span>
      </div>
      <div class="member-card-actions">
        <select class="role-select" onchange="changeMemberRole('${u.id}', this.value)">
          ${['choir_master','senior_member','member'].map(r =>
            `<option value="${r}" ${u.role === r ? 'selected' : ''}>${ROLE_LABELS[r]}</option>`
          ).join('')}
        </select>
        <button class="admin-reset-btn" onclick="resetMemberPassword('${u.id}', '${esc(u.display_name)}')">Reset PW</button>
        <button class="admin-delete-btn" onclick="deleteMemberAccount('${u.id}', '${esc(u.display_name)}')">🗑</button>
      </div>
    </div>`).join('');
}

// ─── ROLE CHIPS ───────────────────────────────────────────────────────────────
let newMemberRole = 'member';
function renderNewMemberRoleChips() {
  const el = document.getElementById('newMemberRoleChips');
  if (!el) return;
  el.innerHTML = ['choir_master','senior_member','member'].map(r => `
    <div class="chip ${r === newMemberRole ? 'active' : ''}" onclick="selectNewMemberRole('${r}')">${ROLE_LABELS[r]}</div>`
  ).join('');
}
function selectNewMemberRole(role) { newMemberRole = role; renderNewMemberRoleChips(); }

// ─── CREATE ACCOUNT ───────────────────────────────────────────────────────────
async function createMemberAccount() {
  const name     = document.getElementById('newMemberName').value.trim();
  const username = document.getElementById('newMemberUsername').value.trim();
  if (!name || !username) { showAdminMsg('Please fill in all fields.', false); return; }

  const existing = await sb('users', 'GET', null, `?username=eq.${encodeURIComponent(username)}&select=id`);
  if (existing && existing.length > 0) { showAdminMsg('Username already taken.', false); return; }

  await sb('users', 'POST', {
    username, password_hash: 'stjc1234',
    display_name: name, role: newMemberRole, flair: ''
  });
  document.getElementById('newMemberName').value = '';
  document.getElementById('newMemberUsername').value = '';
  newMemberRole = 'member';
  renderNewMemberRoleChips();
  showAdminMsg(`✓ Account created! Username: ${username} · Password: stjc1234`, true);
  await refreshMembersList();
}

// ─── CHANGE ROLE ──────────────────────────────────────────────────────────────
async function changeMemberRole(userId, newRole) {
  await sb(`users?id=eq.${userId}`, 'PATCH', { role: newRole });
  showAdminMsg('✓ Role updated!', true);
  await refreshMembersList();
}

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
function resetMemberPassword(userId, name) {
  document.getElementById('confirmMsg').textContent = `Reset ${name}'s password back to "stjc1234"?`;
  document.getElementById('confirmOverlay').style.display = 'flex';
  document.getElementById('confirmYes').textContent = 'Reset';
  document.getElementById('confirmYes').style.background = 'var(--gold)';
  document.getElementById('confirmYes').style.color = '#0c0c18';
  document.getElementById('confirmYes').onclick = async () => {
    document.getElementById('confirmOverlay').style.display = 'none';
    resetConfirmBtn();
    await sb(`users?id=eq.${userId}`, 'PATCH', { password_hash: 'stjc1234' });
    showAdminMsg(`✓ ${name}'s password reset to stjc1234.`, true);
  };
  document.getElementById('confirmNo').onclick = () => {
    document.getElementById('confirmOverlay').style.display = 'none';
    resetConfirmBtn();
  };
}

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
function deleteMemberAccount(userId, name) {
  document.getElementById('confirmMsg').textContent = `Delete ${name}'s account? This cannot be undone.`;
  document.getElementById('confirmOverlay').style.display = 'flex';
  document.getElementById('confirmYes').textContent = 'Delete';
  document.getElementById('confirmYes').style.background = '#ff6b6b';
  document.getElementById('confirmYes').style.color = '#fff';
  document.getElementById('confirmYes').onclick = async () => {
    document.getElementById('confirmOverlay').style.display = 'none';
    resetConfirmBtn();
    await sb(`attendance?user_id=eq.${userId}`, 'DELETE');
    await sb(`users?id=eq.${userId}`, 'DELETE');
    showAdminMsg(`✓ ${name}'s account deleted.`, true);
    await refreshMembersList();
  };
  document.getElementById('confirmNo').onclick = () => {
    document.getElementById('confirmOverlay').style.display = 'none';
    resetConfirmBtn();
  };
}

function resetConfirmBtn() {
  document.getElementById('confirmYes').textContent = 'Delete';
  document.getElementById('confirmYes').style.background = '#ff6b6b';
  document.getElementById('confirmYes').style.color = '#fff';
}

// ─── REFRESH ──────────────────────────────────────────────────────────────────
async function refreshMembersList() {
  try {
    const users = await sb('users', 'GET', null, '?select=*&order=display_name.asc');
    renderMembersList(users);
  } catch(e) { console.error('refresh failed', e); }
}

// ─── ADMIN MESSAGE ────────────────────────────────────────────────────────────
function showAdminMsg(msg, ok) {
  const el = document.getElementById('adminMsg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.background = ok ? '#7fd4a022' : '#ff6b6b22';
  el.style.border     = ok ? '1px solid #7fd4a055' : '1px solid #ff6b6b55';
  el.style.color      = ok ? 'var(--green)' : 'var(--red)';
  setTimeout(() => { el.style.display = 'none'; }, 3500);
}

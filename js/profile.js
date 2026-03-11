// ─── PROFILE ──────────────────────────────────────────────────────────────────

function showProfile() {
  document.getElementById('profileDisplayName').textContent = currentUser.display_name;
  document.getElementById('profileRole').textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
  document.getElementById('newUsername').value = '';
  document.getElementById('confirmPassForUsername').value = '';
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  document.getElementById('profileMsg').style.display = 'none';
  showScreen('screenProfile', 'My Profile', true);
}

function showProfileMsg(msg, ok) {
  const el = document.getElementById('profileMsg');
  el.textContent = msg;
  el.style.display = 'block';
  el.style.background  = ok ? '#7fd4a022' : '#ff6b6b22';
  el.style.border      = ok ? '1px solid #7fd4a055' : '1px solid #ff6b6b55';
  el.style.color       = ok ? 'var(--green)' : 'var(--red)';
}

async function changeUsername() {
  const newU = document.getElementById('newUsername').value.trim();
  const pass = document.getElementById('confirmPassForUsername').value;
  if (!newU || !pass) { showProfileMsg('Please fill in all fields.', false); return; }

  const check = await sb('users', 'GET', null,
    `?id=eq.${currentUser.id}&password_hash=eq.${encodeURIComponent(pass)}&select=id`);
  if (!check || check.length === 0) { showProfileMsg('Current password is incorrect.', false); return; }

  const taken = await sb('users', 'GET', null, `?username=eq.${encodeURIComponent(newU)}&select=id`);
  if (taken && taken.length > 0) { showProfileMsg('That username is already taken.', false); return; }

  await sb(`users?id=eq.${currentUser.id}`, 'PATCH', { username: newU });
  currentUser.username = newU;
  sessionStorage.setItem('stjc_user', JSON.stringify(currentUser));
  document.getElementById('newUsername').value = '';
  document.getElementById('confirmPassForUsername').value = '';
  showProfileMsg('Username updated successfully!', true);
}

async function changePassword() {
  const curr    = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;
  if (!curr || !newPass || !confirm) { showProfileMsg('Please fill in all fields.', false); return; }
  if (newPass !== confirm) { showProfileMsg('New passwords do not match.', false); return; }
  if (newPass.length < 6)  { showProfileMsg('Password must be at least 6 characters.', false); return; }

  const check = await sb('users', 'GET', null,
    `?id=eq.${currentUser.id}&password_hash=eq.${encodeURIComponent(curr)}&select=id`);
  if (!check || check.length === 0) { showProfileMsg('Current password is incorrect.', false); return; }

  await sb(`users?id=eq.${currentUser.id}`, 'PATCH', { password_hash: newPass });
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  showProfileMsg('Password updated successfully!', true);
}

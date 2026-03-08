// ─── AUTH ─────────────────────────────────────────────────────────────────────

async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  document.getElementById('loginError').style.display = 'none';

  if (!username || !password) { showLoginError('Please enter username and password.'); return; }
  btn.textContent = 'Signing in...'; btn.disabled = true;

  try {
    const users = await sb('users', 'GET', null,
      `?username=eq.${encodeURIComponent(username)}&password_hash=eq.${encodeURIComponent(password)}&select=id,username,display_name,role`
    );
    if (!users || users.length === 0) {
      showLoginError('Invalid username or password.');
      btn.textContent = 'Sign In'; btn.disabled = false;
      return;
    }
    currentUser = users[0];
    sessionStorage.setItem('stjc_user', JSON.stringify(currentUser));
    showMainApp();
  } catch (e) {
    showLoginError('Connection error. Please try again.');
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg; el.style.display = 'block';
}

function doLogout() {
  if (!confirm('Sign out?')) return;
  currentUser = null;
  sessionStorage.removeItem('stjc_user');
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginBtn').textContent = 'Sign In';
  document.getElementById('loginBtn').disabled = false;
}

function showMainApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  document.getElementById('headerRole').textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
  document.getElementById('headerUsername').textContent = currentUser.display_name;
  document.getElementById('massActionBtns').style.display = canEdit() ? 'flex' : 'none';
  showScreen('screenList', 'STJC – Song Tracker', false);
  renderMassList();
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function showScreen(id, title, showBack) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('headerTitle').textContent = title;
  document.getElementById('backBtn').style.display = showBack ? 'flex' : 'none';
}

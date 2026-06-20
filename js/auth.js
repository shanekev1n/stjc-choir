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

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
function doLogout() {
  currentUser = null;
  sessionStorage.removeItem('stjc_user');
  closeUserMenu();
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginBtn').textContent = 'Sign In';
  document.getElementById('loginBtn').disabled = false;
}

// ─── USER MENU (header dropdown) ─────────────────────────────────────────────
function toggleUserMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('userMenu');
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function closeUserMenu() {
  const menu = document.getElementById('userMenu');
  if (menu) menu.style.display = 'none';
}

document.addEventListener('click', function (e) {
  const menu   = document.getElementById('userMenu');
  const header = document.querySelector('.header-user');
  if (menu && menu.style.display === 'block') {
    if (!menu.contains(e.target) && (!header || !header.contains(e.target))) {
      menu.style.display = 'none';
    }
  }
});

// ─── SHOW MAIN APP ────────────────────────────────────────────────────────────
function showMainApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  document.getElementById('headerUsername').textContent = currentUser.display_name;

  // Show admin nav tab only for admin role
  const navAdmin = document.getElementById('navAdmin');
  if (navAdmin) navAdmin.style.display = currentUser.role === 'admin' ? 'flex' : 'none';

  setBottomNav(true);
  document.getElementById('navMasses').classList.add('active');
  document.getElementById('navSearch').classList.remove('active');
  document.getElementById('navStats').classList.remove('active');
  if (document.getElementById('navAdmin')) document.getElementById('navAdmin').classList.remove('active');
  showScreen('screenList', 'STJC – Song Tracker', false);
  renderMassList();
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function showScreen(id, title, showBack) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('headerTitle').textContent = title;
  document.getElementById('backBtn').style.display = showBack ? 'flex' : 'none';
  const navScreens = ['screenList', 'screenSearch', 'screenLibrary', 'screenStats', 'screenAdmin'];
  setBottomNav(navScreens.includes(id));
}

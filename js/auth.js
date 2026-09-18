// Auth Controller
const Auth = {
  currentUser: {
    username: 'admin',
    name: 'Administrator Utama',
    role: 'admin'
  },

  init() {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = {
          username: 'admin',
          name: 'Administrator Utama',
          role: 'admin'
        };
      }
    }
    this.updateUI();
  },

  async setDemoUser(role) {
    const names = { admin: 'Administrator Utama', operator: 'Operator Lapangan', viewer: 'Tamu (Viewer)' };
    this.currentUser = {
      username: role,
      name: names[role] || role,
      role: role
    };
    localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
    this.updateUI();

    try {
      const res = await API.login(role, 'password123');
      if (res && res.token) {
        localStorage.setItem('auth_token', res.token);
        if (window.WSClient) {
          window.WSClient.reconnect();
        }
      }
    } catch (err) {
      console.warn('[Auth] Mode simulasi lokal aktif:', err.message);
    }
  },

  updateUI() {
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    const avatarEl = document.getElementById('user-avatar-initials');
    const roleSelect = document.getElementById('role-selector');

    if (this.currentUser) {
      if (nameEl) nameEl.textContent = this.currentUser.name;
      if (roleEl) roleEl.textContent = this.currentUser.role;
      if (avatarEl) avatarEl.textContent = (this.currentUser.username || 'AD').substring(0, 2).toUpperCase();
      if (roleSelect) roleSelect.value = this.currentUser.role;
    }
  },

  canControl() {
    if (!this.currentUser) return true;
    return this.currentUser.role !== 'viewer';
  },

  isAdmin() {
    if (!this.currentUser) return true;
    return this.currentUser.role === 'admin';
  }
};

window.Auth = Auth;

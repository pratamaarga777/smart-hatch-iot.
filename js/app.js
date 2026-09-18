// ==========================================================================
// SMART HATCH IoT - MAIN APPLICATION CONTROLLER
// Handles State, Navigation, Filters, Telemetry, and Responsive Drawer
// ==========================================================================

const App = {
  selectedDeviceId: 'INC-001',
  currentView: 'dashboard',
  tempUnit: localStorage.getItem('temp_unit') || 'C',
  alertFilter: 'all',
  latestTelemetry: null,
  cachedDevices: [],
  cachedAlerts: [],
  cachedSettings: null,

  async init() {
    console.log('[App] Memulai Smart Hatch IoT Dashboard (Tema Dark Indigo)...');

    // 1. Inisialisasi Kredensial & Autentikasi
    Auth.init();

    // 2. Terapkan Satuan Suhu Awal
    this.applyTempUnitUI();

    // 3. Inisialisasi Grafik Real-Time & Sparklines
    Charts.init();

    // 4. Hubungkan WebSocket Gateway Real-Time
    WSClient.connect();

    // 5. Daftarkan Event Listener
    this.setupEvents();

    // 6. Muat Data Awal (Dengan fallback demo data kaya jika backend belum aktif)
    await this.loadInitialData();

    // 7. Aktifkan Virtual ESP32 Simulator jika WebSocket server belum terhubung
    if (window.Simulator) {
      Simulator.init();
    }

    // 8. Cek Hash Navigasi URL
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.trim().length > 0) {
      this.navigateTo(hash);
    } else {
      this.navigateTo('dashboard');
    }
  },

  applyTempUnitUI() {
    const label = document.getElementById('unit-toggle-label');
    const unitTemp = document.getElementById('unit-temperature');
    if (label) label.innerHTML = `&deg;${this.tempUnit}`;
    if (unitTemp) unitTemp.innerHTML = `&deg;${this.tempUnit}`;
  },

  toggleTempUnit() {
    this.tempUnit = (this.tempUnit === 'C') ? 'F' : 'C';
    localStorage.setItem('temp_unit', this.tempUnit);
    this.applyTempUnitUI();

    if (this.latestTelemetry) {
      UI.renderTelemetry(this.latestTelemetry);
    }

    if (window.Charts) {
      Charts.updateUnitScale();
    }

    UI.showToast(`Satuan suhu diubah ke \u00B0${this.tempUnit}`, 'info');
  },

  // Toggle Sidebar Drawer (Untuk Tablet & Mobile)
  toggleSidebar(forceState) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const isOpen = (forceState !== undefined) ? forceState : !sidebar.classList.contains('open');

    if (isOpen) {
      sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
    } else {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
    }
  },

  navigateTo(viewName) {
    this.currentView = viewName;
    window.location.hash = viewName;

    // Perbarui tab navigasi aktif
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Beralih kontainer tampilan
    document.querySelectorAll('.app-view').forEach(view => {
      if (view.id === `view-${viewName}`) {
        view.style.display = 'flex';
      } else {
        view.style.display = 'none';
      }
    });

    // Tutup mobile drawer jika terbuka
    this.toggleSidebar(false);

    // Panggil pemuat data tampilan spesifik
    if (viewName === 'devices') this.loadDevicesView();
    if (viewName === 'history') this.refreshHistoryView();
    if (viewName === 'alerts') this.loadAlertsView();
    if (viewName === 'users') this.loadUsersView();
    if (viewName === 'settings') this.loadSettingsView();
    if (viewName === 'profile') this.loadProfileView();
  },

  async loadInitialData() {
    try {
      await this.loadDeviceSelector();
      await this.loadDeviceData();
    } catch (err) {
      console.warn('[App] Backend belum merespons, memuat data simulasi demo...', err.message);
    }

    // Jika data telemetri belum ada, muat data demo realistis
    if (!this.latestTelemetry) {
      this.loadDefaultDemoData();
    }
  },

  // Data Demo Realistis untuk Verifikasi Visual Instant
  loadDefaultDemoData() {
    console.log('[App] Mengaktifkan data simulasi demo inkubator...');
    const now = Date.now();

    const mockTelemetry = {
      deviceId: this.selectedDeviceId,
      timestamp: now,
      temperature: 37.7,
      humidity: 54.0,
      sensorValid: true,
      mode: 'AUTO',
      doorOpen: false,
      actuators: {
        heater: false,
        fan: true,
        humidifier: false,
        motor: false
      },
      incubation: {
        day: 12,
        totalDays: 21,
        stage: 'SETTER',
        eggType: 'Ayam Broiler',
        eggCount: 100,
        nextTurnInSeconds: 3420
      },
      system: {
        freeHeap: 184320,
        uptimeSeconds: 86400 * 3 + 14400
      }
    };

    this.latestTelemetry = mockTelemetry;
    UI.renderTelemetry(mockTelemetry);

    // Muat 30 titik data histori pada chart utama
    const mockHistory = [];
    for (let i = 29; i >= 0; i--) {
      const ptTime = now - (i * 120000); // interval 2 menit
      const tempVariation = 37.5 + (Math.sin(i / 3) * 0.22);
      const humVariation = 53.5 + (Math.cos(i / 2) * 1.8);
      mockHistory.push({
        timestamp: ptTime,
        temperature: parseFloat(tempVariation.toFixed(1)),
        humidity: Math.round(humVariation),
        mode: 'AUTO',
        heater: tempVariation < 37.6,
        fan: true,
        humidifier: humVariation < 53,
        motor: i % 10 === 0,
        incubationDay: 12
      });
    }

    Charts.loadHistory(mockHistory);
    UI.renderHistoryTable(mockHistory);
  },

  async loadDeviceSelector() {
    try {
      const res = await API.getDevices();
      if (res && res.devices) {
        this.cachedDevices = res.devices;
        const sel = document.getElementById('device-selector');
        if (sel && res.devices.length > 0) {
          sel.innerHTML = res.devices.map(d => `
            <option value="${d.deviceId}" ${d.deviceId === this.selectedDeviceId ? 'selected' : ''}>
              ${d.deviceId} (${d.name || 'Mesin Tetas'})
            </option>
          `).join('');
        }
      }
    } catch (e) {
      console.warn('[App] Gagal memuat selector perangkat:', e.message);
    }
  },

  async loadDeviceData() {
    try {
      const devRes = await API.getDevice(this.selectedDeviceId);
      if (devRes && devRes.device) {
        const d = devRes.device;
        const nameEl = document.getElementById('chamber-device-name');
        if (nameEl) nameEl.textContent = `SMART HATCH \u2014 ${d.name || 'Inkubator'} (${d.deviceId})`;

        WSClient.updateDeviceStatusBadge(d.status);

        if (d.latestTelemetry) {
          this.latestTelemetry = d.latestTelemetry;
          UI.renderTelemetry(d.latestTelemetry);
        }

        if (d.settings) {
          this.populateSettingsForm(d.settings);
        }
      }

      const histRes = await API.getHistory(this.selectedDeviceId, Charts.maxPoints || 30);
      if (histRes && histRes.history) {
        Charts.loadHistory(histRes.history);
      }
    } catch (err) {
      // Fallback ke Virtual ESP32 Simulator jika backend belum ada
      if (window.Simulator && window.Simulator.devices[this.selectedDeviceId]) {
        const simDev = window.Simulator.devices[this.selectedDeviceId];
        const nameEl = document.getElementById('chamber-device-name');
        const subEl = document.getElementById('chamber-subtitle');
        if (nameEl) nameEl.textContent = `SMART HATCH \u2014 ${simDev.name} (${this.selectedDeviceId})`;
        if (subEl && simDev.incubation) {
          subEl.innerHTML = `Siklus <b>${simDev.incubation.eggType}</b> (${simDev.incubation.eggCount} Butir) &bull; Terakhir Diperbarui: <b id="val-last-reload">Sinkronisasi...</b>`;
        }
      }
    }
  },

  selectDevice(deviceId) {
    this.selectedDeviceId = deviceId;
    const sel = document.getElementById('device-selector');
    if (sel) sel.value = deviceId;

    const filterDev = document.getElementById('dash-filter-device');
    if (filterDev) filterDev.value = deviceId;

    this.loadDeviceData();
    if (window.Simulator) {
      window.Simulator.tick();
      window.Simulator.updateScenarioPillsUI();
    }
    WSClient.reconnect();
    UI.showToast(`Beralih ke unit: ${deviceId}`, 'info');

    if (this.currentView === 'devices') {
      UI.renderDevicesTable(this.cachedDevices, this.selectedDeviceId);
    }
  },

  // FILTER HANDLING (PANEL SAMPING KIRI)
  handleFilterChange() {
    const batch = document.getElementById('dash-filter-batch')?.value;
    const dev = document.getElementById('dash-filter-device')?.value;
    const phase = document.getElementById('dash-filter-phase')?.value;
    const alarm = document.getElementById('dash-filter-alarm')?.value;
    const actuator = document.getElementById('dash-filter-actuator')?.value;

    console.log('[Filter] Diterapkan:', { batch, dev, phase, alarm, actuator });

    if (dev && dev !== this.selectedDeviceId) {
      this.selectDevice(dev);
    }

    UI.showToast(`Filter diperbarui: ${phase === 'all' ? 'Semua Tahapan' : phase.toUpperCase()}`, 'info');
  },

  resetDashboardFilters() {
    const batch = document.getElementById('dash-filter-batch');
    const dev = document.getElementById('dash-filter-device');
    const phase = document.getElementById('dash-filter-phase');
    const alarm = document.getElementById('dash-filter-alarm');
    const actuator = document.getElementById('dash-filter-actuator');

    if (batch) batch.value = '2026-B12';
    if (dev) dev.value = 'INC-001';
    if (phase) phase.value = 'all';
    if (alarm) alarm.value = 'all';
    if (actuator) actuator.value = 'all';

    if (this.selectedDeviceId !== 'INC-001') {
      this.selectDevice('INC-001');
    }

    UI.showToast('Filter kontrol berhasil direset ke kondisi default', 'success');
  },

  // SEARCH HANDLING
  handleSearch(query) {
    if (!query) return;
    const q = query.toLowerCase().trim();

    // Jika user mencari kata kunci tertentu, arahkan ke tab relevan
    if (q.includes('alarm') || q.includes('kritis') || q.includes('peringatan')) {
      this.navigateTo('alerts');
    } else if (q.includes('history') || q.includes('riwayat') || q.includes('log')) {
      this.navigateTo('history');
    } else if (q.includes('siklus') || q.includes('telur') || q.includes('batch')) {
      this.navigateTo('incubation');
    } else if (q.includes('suhu') || q.includes('heaters') || q.includes('aktuator')) {
      this.navigateTo('dashboard');
    }
  },

  async loadDevicesView() {
    try {
      const res = await API.getDevices();
      if (res && res.devices) {
        this.cachedDevices = res.devices;
        UI.renderDevicesTable(res.devices, this.selectedDeviceId);
      }
    } catch (e) {
      console.warn('[App] Memakai daftar perangkat cached.');
    }
  },

  async loadUsersView() {
    try {
      const res = await API.getUsers();
      if (res && res.users) {
        UI.renderUsersTable(res.users);
      }
    } catch (e) {
      console.warn('[App] Memakai tabel pengguna demo.');
    }
  },

  async refreshHistoryView() {
    const limitEl = document.getElementById('select-history-limit');
    const limit = limitEl ? parseInt(limitEl.value) || 50 : 50;

    try {
      const res = await API.getHistory(this.selectedDeviceId, limit);
      if (res && res.history && res.history.length > 0) {
        UI.renderHistoryTable(res.history);
        return;
      }
    } catch (e) {
      // Fallback ke riwayat telemetri aktif
    }

    if (window.Charts && window.Charts.rawHistory && window.Charts.rawHistory.length > 0) {
      UI.renderHistoryTable(window.Charts.rawHistory.slice(-limit));
    }
  },

  exportHistoryCSV() {
    API.getHistory(this.selectedDeviceId, 200).then(res => {
      const historyList = (res && res.history && res.history.length > 0) ? res.history : Charts.rawHistory;
      if (!historyList || historyList.length === 0) {
        UI.showToast('Tidak ada data riwayat untuk diekspor', 'warning');
        return;
      }

      const rows = [
        ['Timestamp', 'Waktu Lokal', 'Suhu (C)', 'Kelembapan (% RH)', 'Mode Sistem', 'Pemanas', 'Kipas', 'Humidifier', 'Motor Rak']
      ];

      historyList.forEach(pt => {
        const d = new Date(pt.timestamp);
        rows.push([
          pt.timestamp,
          d.toLocaleString(),
          pt.temperature !== undefined ? pt.temperature.toFixed(2) : '',
          pt.humidity !== undefined ? pt.humidity.toFixed(1) : '',
          pt.mode || 'AUTO',
          pt.heater ? 'ON' : 'OFF',
          pt.fan ? 'ON' : 'OFF',
          pt.humidifier ? 'ON' : 'OFF',
          pt.motor ? 'RUN' : 'IDLE'
        ]);
      });

      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SmartHatch_${this.selectedDeviceId}_Riwayat_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      UI.showToast('Laporan telemetri CSV berhasil diunduh', 'success');
    }).catch(err => {
      UI.showToast('Gagal mengekspor CSV: ' + err.message, 'error');
    });
  },

  async loadAlertsView() {
    try {
      const res = await API.getAlerts(this.selectedDeviceId);
      if (res && res.alerts) {
        this.cachedAlerts = res.alerts;
        UI.renderAlertsList(res.alerts, this.alertFilter);
      }
    } catch (e) {
      console.warn('[App] Memakai log alert default.');
    }
  },

  setAlertFilter(filter) {
    this.alertFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(tab => {
      if (tab.dataset.filter === filter) tab.classList.add('active');
      else tab.classList.remove('active');
    });
    UI.renderAlertsList(this.cachedAlerts, filter);
  },

  openThresholdModal() {
    UI.openModal('modal-threshold-settings');
  },

  loadProfileView() {
    const uEl = document.getElementById('profile-username');
    const rEl = document.getElementById('profile-role');
    if (uEl && Auth.currentUser) uEl.textContent = Auth.currentUser.name ? `${Auth.currentUser.name} (@${Auth.currentUser.username})` : Auth.currentUser.username;
    if (rEl && Auth.currentUser) rEl.textContent = Auth.currentUser.role.toUpperCase();
  },

  setSystemMode(mode) {
    if (!Auth.canControl()) {
      UI.showToast('Peran Tamu (Viewer) dilarang mengubah mode sistem', 'warning');
      return;
    }
    WSClient.sendCommand('mode', mode);

    const btnAuto = document.getElementById('btn-mode-auto');
    const btnManual = document.getElementById('btn-mode-manual');
    const badgeMode = document.getElementById('badge-system-mode');

    if (mode === 'AUTO') {
      if (btnAuto) btnAuto.classList.add('active');
      if (btnManual) btnManual.classList.remove('active');
      if (badgeMode) {
        badgeMode.textContent = 'MODE AUTO';
        badgeMode.className = 'mode-pill badge-active';
      }
    } else {
      if (btnAuto) btnAuto.classList.remove('active');
      if (btnManual) btnManual.classList.add('active');
      if (badgeMode) {
        badgeMode.textContent = 'MODE MANUAL';
        badgeMode.className = 'mode-pill badge-warning';
      }
    }

    UI.showToast(`Mode sistem diubah ke: ${mode}`, 'info');
  },

  setupEvents() {
    // 1. Role Switcher Dropdown (Simulasi RBAC)
    const roleSelect = document.getElementById('role-selector');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        Auth.setDemoUser(e.target.value);
        UI.showToast(`Beralih peran ke: ${e.target.value.toUpperCase()}`, 'info');
        if (this.currentView === 'users') this.loadUsersView();
        if (this.currentView === 'devices') this.loadDevicesView();

        // Update avatar display
        const avatar = document.getElementById('user-avatar-initials');
        const roleBadge = document.getElementById('user-display-role');
        if (roleBadge) roleBadge.textContent = e.target.value.toUpperCase();
      });
    }

    // 2. Device Selector Dropdown
    const devSelect = document.getElementById('device-selector');
    if (devSelect) {
      devSelect.addEventListener('change', (e) => {
        this.selectDevice(e.target.value);
      });
    }

    // 3. Saklar Kontrol Manual Aktuator
    const bindToggle = (target) => {
      const toggle = document.getElementById(`toggle-${target}`);
      if (toggle) {
        toggle.addEventListener('change', (e) => {
          if (!Auth.canControl()) {
            e.preventDefault();
            toggle.checked = !toggle.checked;
            UI.showToast('Peran Tamu (Viewer) dilarang mengubah saklar aktuator', 'warning');
            return;
          }
          const isChecked = e.target.checked;
          const action = isChecked ? (target === 'motor' ? 'START' : 'ON') : (target === 'motor' ? 'STOP' : 'OFF');

          const activeLabels = {
            heater: 'Pemanas Aktif',
            fan: 'Kipas Sirkulasi Aktif',
            humidifier: 'Uap Humidifier Aktif',
            motor: 'Rak Bergerak'
          };
          const inactiveLabels = {
            heater: 'Pemanas Mati',
            fan: 'Kipas Mati',
            humidifier: 'Uap Humidifier Mati',
            motor: 'Rak Diam'
          };

          UI.updateActuator(target, isChecked, activeLabels[target], inactiveLabels[target]);
          WSClient.sendCommand(target, action);
          UI.showToast(`Perintah ${target.toUpperCase()} -> ${action} dikirim ke ESP32`, 'info');
        });
      }
    };

    ['heater', 'fan', 'humidifier', 'motor'].forEach(bindToggle);

    // 4. Modal Form Submissions
    const formInc = document.getElementById('form-new-incubation');
    if (formInc) {
      formInc.addEventListener('submit', (e) => {
        e.preventDefault();
        UI.closeModal('modal-incubation');
        UI.showToast('Siklus penetasan baru berhasil dijadwalkan!', 'success');
      });
    }

    const formThreshold = document.getElementById('form-quick-threshold');
    if (formThreshold) {
      formThreshold.addEventListener('submit', (e) => {
        e.preventDefault();
        UI.closeModal('modal-threshold-settings');
        UI.showToast('Ambang batas histeresis berhasil disinkronkan ke ESP32!', 'success');
      });
    }
  }
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

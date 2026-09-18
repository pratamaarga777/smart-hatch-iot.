// ==========================================================================
// SMART HATCH IoT - VIRTUAL ESP32 SIMULATOR
// Provides realistic thermodynamic & humidity physics, auto-regulation,
// scenario testing (overheat, cold, sensor error, door open, connection drop),
// and simulated WebSocket/Command-Ack behavior.
// ==========================================================================

const Simulator = {
  isActive: true,
  intervalMs: 3000,
  timerId: null,
  scenario: 'normal', // 'normal' | 'overheat' | 'cold' | 'sensor_error' | 'stale'
  isPanelOpen: false,

  // Device Virtual Chambers
  devices: {
    'INC-001': {
      name: 'Mesin Tetas Utama',
      temperature: 37.68,
      humidity: 53.8,
      ambientTemp: 28.5,
      ambientHum: 65.0,
      mode: 'AUTO',
      doorOpen: false,
      doorOpenSeconds: 0,
      sensorValid: true,
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
        eggType: 'Ayam Kampung (Super)',
        eggCount: 100,
        nextTurnInSeconds: 3420
      },
      sequence: 101,
      uptimeSeconds: 86400 * 3 + 14400,
      turnDurationLeft: 0,
      lastStaleWarning: false
    },
    'INC-002': {
      name: 'Mesin Cadangan',
      temperature: 37.60,
      humidity: 52.4,
      ambientTemp: 28.5,
      ambientHum: 65.0,
      mode: 'AUTO',
      doorOpen: false,
      doorOpenSeconds: 0,
      sensorValid: true,
      actuators: {
        heater: true,
        fan: true,
        humidifier: false,
        motor: false
      },
      incubation: {
        day: 5,
        totalDays: 21,
        stage: 'SETTER',
        eggType: 'Ayam Broiler',
        eggCount: 80,
        nextTurnInSeconds: 5200
      },
      sequence: 50,
      uptimeSeconds: 86400 * 1 + 3600,
      turnDurationLeft: 0,
      lastStaleWarning: false
    },
    'INC-003': {
      name: 'Penetasan Sekunder (Hatcher)',
      temperature: 37.25,
      humidity: 68.5,
      ambientTemp: 28.5,
      ambientHum: 65.0,
      mode: 'AUTO',
      doorOpen: false,
      doorOpenSeconds: 0,
      sensorValid: true,
      actuators: {
        heater: false,
        fan: true,
        humidifier: true,
        motor: false
      },
      incubation: {
        day: 20,
        totalDays: 21,
        stage: 'HATCHER',
        eggType: 'Bebek Alabio',
        eggCount: 50,
        nextTurnInSeconds: 0 // Locked down in hatcher stage!
      },
      sequence: 210,
      uptimeSeconds: 86400 * 8,
      turnDurationLeft: 0,
      lastStaleWarning: false
    }
  },

  init() {
    console.log('[Simulator] Menginisialisasi Virtual ESP32 Simulator...');
    this.start();
    this.renderSimulatorUI();
  },

  start() {
    this.stop();
    this.isActive = true;
    this.timerId = setInterval(() => {
      this.tick();
    }, this.intervalMs);
    this.updateSimulatorBadgeUI();
    console.log(`[Simulator] Simulator berjalan (Interval: ${this.intervalMs / 1000}s)`);
  },

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isActive = false;
    this.updateSimulatorBadgeUI();
  },

  toggleActive() {
    if (this.isActive) {
      this.stop();
      if (window.UI) UI.showToast('Simulator ESP32 dijeda (PAUSED)', 'warning');
    } else {
      this.start();
      if (window.UI) UI.showToast('Simulator ESP32 aktif kembali', 'success');
    }
  },

  setIntervalSpeed(ms) {
    this.intervalMs = parseInt(ms) || 3000;
    if (this.isActive) {
      this.start();
    }
    this.updateSimulatorBadgeUI();
    if (window.UI) UI.showToast(`Kecepatan simulasi: ${this.intervalMs / 1000} detik`, 'info');
  },

  setScenario(sc) {
    this.scenario = sc;
    const devId = (window.App && window.App.selectedDeviceId) ? window.App.selectedDeviceId : 'INC-001';
    const dev = this.devices[devId];

    if (!dev) return;

    if (sc === 'normal') {
      dev.sensorValid = true;
      dev.temperature = 37.68;
      dev.humidity = 53.8;
      dev.doorOpen = false;
      dev.mode = 'AUTO';
      if (window.UI) UI.showToast('Skenario: Operasi Normal & Stabil (AUTO)', 'success');
    } else if (sc === 'overheat') {
      dev.sensorValid = true;
      dev.temperature = 38.65; // High anomaly
      dev.mode = 'MANUAL';
      dev.actuators.heater = true;
      if (window.UI) UI.showToast('Skenario: Pemanas Overheat (> 38.5\u00B0C) Diaktifkan!', 'error');
    } else if (sc === 'cold') {
      dev.sensorValid = true;
      dev.temperature = 36.20; // Cold anomaly
      dev.mode = 'MANUAL';
      dev.actuators.heater = false;
      if (window.UI) UI.showToast('Skenario: Penurunan Suhu (< 36.5\u00B0C) Diaktifkan', 'warning');
    } else if (sc === 'sensor_error') {
      dev.sensorValid = false;
      if (window.UI) UI.showToast('Skenario: Sensor DHT22 Rusak / Terputus!', 'error');
    } else if (sc === 'stale') {
      if (window.UI) UI.showToast('Skenario: Sambungan ESP32 Terputus (Simulasi Stale/Offline)', 'warning');
    }

    this.updateScenarioPillsUI();
    this.tick(); // Trigger immediate update
  },

  toggleDoor() {
    const devId = (window.App && window.App.selectedDeviceId) ? window.App.selectedDeviceId : 'INC-001';
    const dev = this.devices[devId];
    if (!dev) return;

    dev.doorOpen = !dev.doorOpen;
    dev.doorOpenSeconds = 0;

    if (dev.doorOpen) {
      if (window.UI) UI.showToast('\u26A0\uFE0F Pintu inkubator dibuka! Suhu ruang akan menurun.', 'warning');
    } else {
      if (window.UI) UI.showToast('\u2705 Pintu inkubator ditutup kembali rapat.', 'success');
    }

    if (window.UI) UI.updateDoorBadge(dev.doorOpen);
    this.updateScenarioPillsUI();
    this.tick();
  },

  // Main Physics Tick
  tick() {
    const devId = (window.App && window.App.selectedDeviceId) ? window.App.selectedDeviceId : 'INC-001';
    const dev = this.devices[devId];
    if (!dev) return;

    // Skenario Stale: Stop transmitting data to test stale/offline detection
    if (this.scenario === 'stale') {
      const badge = document.getElementById('device-status-badge');
      const text = document.getElementById('text-device-status');
      if (badge && text) {
        badge.className = 'status-badge stale';
        text.textContent = 'Data Basi (Stale)';
      }
      return;
    }

    dev.sequence++;
    dev.uptimeSeconds += (this.intervalMs / 1000);

    // ========================================================
    // 1. THERMODYNAMIC & HUMIDITY PHYSICS
    // ========================================================
    if (dev.sensorValid) {
      const isHatcher = (dev.incubation && dev.incubation.stage === 'HATCHER');
      const targetTemp = isHatcher ? 37.3 : 37.65;
      const targetHum = isHatcher ? 68.0 : 53.5;

      // A. Automatic Thermostat Logic in AUTO Mode
      if (dev.mode === 'AUTO') {
        // Temperature Hysteresis (Target ±0.15°C)
        if (dev.temperature < (targetTemp - 0.15)) {
          dev.actuators.heater = true;
        } else if (dev.temperature > (targetTemp + 0.15)) {
          dev.actuators.heater = false;
        }

        // Humidity Hysteresis (Target ±2.0%)
        if (dev.humidity < (targetHum - 2.0)) {
          dev.actuators.humidifier = true;
        } else if (dev.humidity > (targetHum + 1.5)) {
          dev.actuators.humidifier = false;
        }

        // Circulation Fan is almost always ON for fresh oxygen, unless disabled
        dev.actuators.fan = true;
      }

      // B. Egg Turner Motor Countdown & Cycling
      if (dev.incubation && dev.incubation.stage === 'SETTER') {
        if (dev.turnDurationLeft > 0) {
          dev.turnDurationLeft -= (this.intervalMs / 1000);
          dev.actuators.motor = true;
          if (dev.turnDurationLeft <= 0) {
            dev.actuators.motor = false;
            dev.incubation.nextTurnInSeconds = 10800; // Reset to 3 hours
            if (window.UI) UI.showToast('\u27F3 Pembalikan telur selesai. Posisi rak aman.', 'info');
          }
        } else {
          dev.incubation.nextTurnInSeconds -= (this.intervalMs / 1000);
          if (dev.incubation.nextTurnInSeconds <= 0) {
            dev.turnDurationLeft = 12; // Run motor for 12 seconds
            dev.actuators.motor = true;
            if (window.UI) UI.showToast('\u27F3 Motor pembalik telur aktif memiringkan rak...', 'info');
          }
        }
      } else {
        // Hatcher phase: Egg turning strictly disabled
        dev.actuators.motor = false;
        dev.incubation.nextTurnInSeconds = 0;
      }

      // C. Temperature Thermal Slope Calculation
      let tempDelta = 0;
      if (dev.doorOpen) {
        dev.doorOpenSeconds += (this.intervalMs / 1000);
        // Rapid heat loss to room ambient (28°C)
        tempDelta = -0.12 * (this.intervalMs / 1000);
      } else {
        if (dev.actuators.heater) {
          tempDelta += 0.04 * (this.intervalMs / 1000);
        } else {
          tempDelta -= 0.025 * (this.intervalMs / 1000);
        }
      }

      // Small natural sensor micro-noise (±0.02°C)
      const noiseT = (Math.random() - 0.5) * 0.03;
      dev.temperature += tempDelta + noiseT;

      // Skenario Override Limits
      if (this.scenario === 'overheat') {
        if (dev.temperature < 38.6) dev.temperature += 0.08;
      } else if (this.scenario === 'cold') {
        if (dev.temperature > 36.1) dev.temperature -= 0.08;
      }

      // Safeguard physical bounds
      dev.temperature = Math.max(25.0, Math.min(45.0, dev.temperature));

      // D. Humidity Slope Calculation
      let humDelta = 0;
      if (dev.doorOpen) {
        // Equalizes towards room humidity
        humDelta = (dev.ambientHum - dev.humidity) * 0.05;
      } else {
        if (dev.actuators.humidifier) {
          humDelta += 0.35 * (this.intervalMs / 1000);
        } else {
          humDelta -= 0.15 * (this.intervalMs / 1000);
        }
      }

      const noiseH = (Math.random() - 0.5) * 0.2;
      dev.humidity += humDelta + noiseH;
      dev.humidity = Math.max(20.0, Math.min(95.0, dev.humidity));
    }

    // ========================================================
    // 2. DISPATCH TELEMETRY PACKET TO UI & CHARTS
    // ========================================================
    const now = Date.now();
    const telemetry = {
      deviceId: devId,
      timestamp: now,
      sequence: dev.sequence,
      temperature: dev.sensorValid ? parseFloat(dev.temperature.toFixed(2)) : null,
      humidity: dev.sensorValid ? parseFloat(dev.humidity.toFixed(1)) : null,
      sensorValid: dev.sensorValid,
      mode: dev.mode,
      doorOpen: dev.doorOpen,
      actuators: { ...dev.actuators },
      incubation: { ...dev.incubation },
      system: {
        freeHeap: 184320 + Math.floor(Math.random() * 2048),
        uptimeSeconds: Math.floor(dev.uptimeSeconds),
        wifiRssi: -62 + Math.floor(Math.random() * 6)
      }
    };

    // Update App Global State
    if (window.App) {
      window.App.latestTelemetry = telemetry;
    }

    // Render DOM Elements
    if (window.UI) {
      window.UI.renderTelemetry(telemetry);
    }

    // Push Point to Real-time Graph & Sparklines
    if (window.Charts && telemetry.temperature !== null) {
      window.Charts.pushDataPoint(telemetry.timestamp, telemetry.temperature, telemetry.humidity, {
        mode: dev.mode,
        heater: dev.actuators.heater,
        fan: dev.actuators.fan,
        humidifier: dev.actuators.humidifier,
        motor: dev.actuators.motor,
        incubationDay: dev.incubation ? dev.incubation.day : 12
      });
    }

    // Update Status Badge to Green Simulator Online
    const badge = document.getElementById('device-status-badge');
    const text = document.getElementById('text-device-status');
    if (badge && text) {
      badge.className = 'status-badge online';
      text.innerHTML = '<span class="status-dot"></span> ESP32 Online (Sim)';
    }

    // 3. Automated Alarm Trigger Checks
    this.checkSimulatedAlarms(dev, telemetry);

    // Update Simulator Stats in Floating Panel
    this.updatePanelTelemetryStats(telemetry);
  },

  // Check and trigger realistic alarms based on PRD Section 3.7
  checkSimulatedAlarms(dev, tel) {
    if (!window.UI) return;

    // Alarm 1: Overheat Kritis (> 38.5°C)
    if (tel.temperature !== null && tel.temperature > 38.5) {
      if (!this.alarmOverheatTriggered) {
        this.alarmOverheatTriggered = true;
        window.UI.handleNewAlert({
          id: 'alt_' + Date.now(),
          deviceId: tel.deviceId,
          type: 'OVERHEAT',
          severity: 'CRITICAL',
          message: `Suhu ruang mencapai ${tel.temperature}\u00B0C (Melebihi batas aman 38.5\u00B0C)!`,
          timestamp: tel.timestamp,
          acknowledged: false
        });
      }
    } else {
      this.alarmOverheatTriggered = false;
    }

    // Alarm 2: Sensor Error
    if (!tel.sensorValid) {
      if (!this.alarmSensorTriggered) {
        this.alarmSensorTriggered = true;
        window.UI.handleNewAlert({
          id: 'alt_sens_' + Date.now(),
          deviceId: tel.deviceId,
          type: 'SENSOR_ERROR',
          severity: 'CRITICAL',
          message: 'Sensor DHT22 gagal membaca data (Gagal komunikasi I2C/GPIO)!',
          timestamp: tel.timestamp,
          acknowledged: false
        });
      }
    } else {
      this.alarmSensorTriggered = false;
    }

    // Alarm 3: Pintu Terbuka Terlalu Lama (> 60 detik)
    if (dev.doorOpen && dev.doorOpenSeconds > 30) {
      if (!this.alarmDoorTriggered) {
        this.alarmDoorTriggered = true;
        window.UI.handleNewAlert({
          id: 'alt_door_' + Date.now(),
          deviceId: tel.deviceId,
          type: 'DOOR_OPEN',
          severity: 'WARNING',
          message: 'Pintu ruang inkubator terbuka lebih dari 30 detik! Segera tutup.',
          timestamp: tel.timestamp,
          acknowledged: false
        });
      }
    } else if (!dev.doorOpen) {
      this.alarmDoorTriggered = false;
    }
  },

  // Handle Command Sent from UI (Simulating Hardware Ack)
  handleCommand(target, action, durationSeconds = 0) {
    const devId = (window.App && window.App.selectedDeviceId) ? window.App.selectedDeviceId : 'INC-001';
    const dev = this.devices[devId];
    if (!dev) return;

    console.log(`[Simulator] Menerima Perintah Hardware: ${target} -> ${action}`);

    // Simulate 350ms communication delay to ESP32
    setTimeout(() => {
      if (target === 'mode') {
        dev.mode = action;
      } else if (dev.actuators[target] !== undefined) {
        const isTurnOn = (action === 'ON' || action === 'START');
        dev.actuators[target] = isTurnOn;

        // If motor started manually
        if (target === 'motor' && isTurnOn) {
          dev.turnDurationLeft = durationSeconds || 15;
        }
      }

      // Dispatch Ack to UI
      if (window.UI) {
        window.UI.handleCommandAck({
          type: 'ack',
          commandId: 'sim_ack_' + Math.random().toString(36).substring(2, 7),
          deviceId: devId,
          target,
          status: 'ACK',
          applied: true,
          message: `Relay ${target ? target.toUpperCase() : ''} diubah ke ${action}`
        });
      }

      // Re-tick immediately to update UI with new state
      this.tick();
    }, 350);
  },

  // ========================================================
  // 3. FLOATING SIMULATOR CONTROL PANEL (UI)
  // ========================================================
  renderSimulatorUI() {
    // Check if floating widget already exists
    if (document.getElementById('sim-floating-container')) return;

    const container = document.createElement('div');
    container.id = 'sim-floating-container';
    container.className = 'sim-floating-wrap';

    container.innerHTML = `
      <!-- Collapsible Floating Pill Button -->
      <button class="sim-pill-btn" id="sim-pill-btn" onclick="Simulator.togglePanel()" title="Buka Kontrol Simulator ESP32">
        <span class="sim-pulse-dot" id="sim-dot-indicator"></span>
        <span class="sim-pill-text">ESP32 Simulator: <b id="sim-pill-status">AKTIF (3s)</b></span>
        <i class="ri-equalizer-line sim-pill-icon"></i>
      </button>

      <!-- Glassmorphism Drawer Popover -->
      <div class="sim-popover-panel" id="sim-popover-panel" style="display:none;">
        <div class="sim-panel-header">
          <div class="sim-panel-title">
            <i class="ri-cpu-line" style="color:var(--neon-cyan);"></i>
            <div>
              <h4>Virtual ESP32 Simulator</h4>
              <p>Pengujian data langsung tanpa menunggu alat fisik</p>
            </div>
          </div>
          <button class="sim-close-btn" onclick="Simulator.togglePanel()" title="Tutup">
            <i class="ri-close-line"></i>
          </button>
        </div>

        <div class="sim-panel-body">
          <!-- Toggle Master On/Off -->
          <div class="sim-row-action">
            <span>Status Emulasi Data</span>
            <div class="sim-switch-wrap">
              <button class="btn-sim-opt active" id="btn-sim-power" onclick="Simulator.toggleActive()">
                <i class="ri-play-line"></i> Berjalan
              </button>
            </div>
          </div>

          <!-- Interval Kecepatan Data -->
          <div class="sim-group">
            <label class="sim-label"><i class="ri-timer-line"></i> Interval Aliran Data (PRD: 2&ndash;5 Detik)</label>
            <div class="sim-button-group">
              <button class="btn-sim-chip" id="btn-speed-1s" onclick="Simulator.setIntervalSpeed(1000)">1 Detik</button>
              <button class="btn-sim-chip active" id="btn-speed-3s" onclick="Simulator.setIntervalSpeed(3000)">3 Detik (Optimal)</button>
              <button class="btn-sim-chip" id="btn-speed-5s" onclick="Simulator.setIntervalSpeed(5000)">5 Detik</button>
            </div>
          </div>

          <!-- Skenario Pengujian Anomali & Alarm -->
          <div class="sim-group">
            <label class="sim-label"><i class="ri-flask-line"></i> Skenario Pengujian Respon UI & Alarm</label>
            <div class="sim-scenarios-grid">
              <button class="btn-scenario active" id="sc-normal" onclick="Simulator.setScenario('normal')">
                <i class="ri-shield-check-line" style="color:var(--accent-emerald);"></i>
                <span>Normal (37.7&deg;C)</span>
              </button>
              <button class="btn-scenario" id="sc-overheat" onclick="Simulator.setScenario('overheat')">
                <i class="ri-fire-line" style="color:var(--accent-rose);"></i>
                <span>Overheat (>38.5&deg;C)</span>
              </button>
              <button class="btn-scenario" id="sc-cold" onclick="Simulator.setScenario('cold')">
                <i class="ri-temp-cold-line" style="color:#60a5fa;"></i>
                <span>Drop Suhu (<36.5&deg;C)</span>
              </button>
              <button class="btn-scenario" id="sc-sensor_error" onclick="Simulator.setScenario('sensor_error')">
                <i class="ri-alert-line" style="color:var(--accent-amber);"></i>
                <span>Sensor Rusak</span>
              </button>
            </div>
          </div>

          <!-- Fisik Tambahan: Sensor Pintu & Putus Koneksi -->
          <div class="sim-group">
            <label class="sim-label"><i class="ri-door-line"></i> Uji Pintu Inkubator & Koneksi</label>
            <div class="sim-scenarios-grid">
              <button class="btn-scenario" id="btn-sim-door" onclick="Simulator.toggleDoor()">
                <i class="ri-door-open-line"></i>
                <span id="text-btn-sim-door">Buka Pintu Inkubator</span>
              </button>
              <button class="btn-scenario" id="sc-stale" onclick="Simulator.setScenario('stale')">
                <i class="ri-wifi-off-line" style="color:#f59e0b;"></i>
                <span>Simulasi Putus Sambungan</span>
              </button>
            </div>
          </div>

          <!-- Live Hardware Counters -->
          <div class="sim-telemetry-summary">
            <div class="sim-stat-item">
              <span class="lbl">Paket Data:</span>
              <b id="sim-val-seq">0</b>
            </div>
            <div class="sim-stat-item">
              <span class="lbl">Sinyal WiFi:</span>
              <b id="sim-val-rssi">-62 dBm</b>
            </div>
            <div class="sim-stat-item">
              <span class="lbl">Uptime ESP32:</span>
              <b id="sim-val-uptime">0j 0m</b>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
  },

  togglePanel() {
    this.isPanelOpen = !this.isPanelOpen;
    const panel = document.getElementById('sim-popover-panel');
    if (panel) {
      panel.style.display = this.isPanelOpen ? 'flex' : 'none';
    }
  },

  updateSimulatorBadgeUI() {
    const pillStatus = document.getElementById('sim-pill-status');
    const dot = document.getElementById('sim-dot-indicator');
    const btnPower = document.getElementById('btn-sim-power');

    if (pillStatus) {
      pillStatus.textContent = this.isActive ? `AKTIF (${this.intervalMs / 1000}s)` : 'JEDA (OFF)';
    }
    if (dot) {
      dot.className = this.isActive ? 'sim-pulse-dot' : 'sim-pulse-dot paused';
    }
    if (btnPower) {
      if (this.isActive) {
        btnPower.className = 'btn-sim-opt active';
        btnPower.innerHTML = '<i class="ri-pause-line"></i> Berjalan';
      } else {
        btnPower.className = 'btn-sim-opt';
        btnPower.innerHTML = '<i class="ri-play-line"></i> Dijeda';
      }
    }

    // Update Speed Chips
    ['1s', '3s', '5s'].forEach(s => {
      const chip = document.getElementById(`btn-speed-${s}`);
      const val = parseInt(s) * 1000;
      if (chip) {
        if (this.intervalMs === val) chip.classList.add('active');
        else chip.classList.remove('active');
      }
    });
  },

  updateScenarioPillsUI() {
    ['normal', 'overheat', 'cold', 'sensor_error', 'stale'].forEach(s => {
      const btn = document.getElementById(`sc-${s}`);
      if (btn) {
        if (this.scenario === s) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });

    const devId = (window.App && window.App.selectedDeviceId) ? window.App.selectedDeviceId : 'INC-001';
    const dev = this.devices[devId];
    const doorBtn = document.getElementById('btn-sim-door');
    const doorText = document.getElementById('text-btn-sim-door');

    if (doorBtn && doorText && dev) {
      if (dev.doorOpen) {
        doorBtn.classList.add('active');
        doorText.textContent = 'Tutup Pintu Inkubator';
      } else {
        doorBtn.classList.remove('active');
        doorText.textContent = 'Buka Pintu Inkubator';
      }
    }
  },

  updatePanelTelemetryStats(tel) {
    const seqEl = document.getElementById('sim-val-seq');
    const rssiEl = document.getElementById('sim-val-rssi');
    const upEl = document.getElementById('sim-val-uptime');

    if (seqEl) seqEl.textContent = '#' + (tel.sequence || 0);
    if (rssiEl && tel.system) rssiEl.textContent = `${tel.system.wifiRssi || -65} dBm`;
    if (upEl && tel.system) {
      const up = tel.system.uptimeSeconds || 0;
      const hours = Math.floor(up / 3600);
      const mins = Math.floor((up % 3600) / 60);
      upEl.textContent = `${hours}j ${mins}m`;
    }
  }
};

window.Simulator = Simulator;

// ==========================================================================
// SMART HATCH IoT - UI RENDERER & INTERACTION CONTROLLER
// Updates Real-Time DOM Elements, Actuator Badges, Modals, & Toasts
// ==========================================================================

const UI = {
  renderTelemetry(data) {
    if (!data) return;

    const unit = (window.App && window.App.tempUnit) ? window.App.tempUnit : 'C';
    const isF = unit === 'F';

    // 1. Temperature Card Update
    const tempEl = document.getElementById('val-temperature');
    const tempUnitEl = document.getElementById('unit-temperature');
    const tempTargetEl = document.getElementById('badge-target-temp');

    if (tempEl && data.temperature !== undefined && data.temperature !== null) {
      const rawC = data.temperature;
      const displayTemp = isF ? ((rawC * 9/5) + 32).toFixed(1) : rawC.toFixed(1);
      tempEl.textContent = displayTemp;
      if (tempUnitEl) tempUnitEl.innerHTML = `&deg;${unit}`;

      if (tempTargetEl) {
        if (!data.sensorValid) {
          tempTargetEl.className = 'kpi-trend negative';
          tempTargetEl.innerHTML = '<i class="ri-error-warning-line"></i> Sensor Rusak / Terputus';
        } else if (rawC < 37.5) {
          tempTargetEl.className = 'kpi-trend negative';
          tempTargetEl.innerHTML = '<i class="ri-arrow-down-line"></i> Kurang Hangat (<37.5&deg;C)';
        } else if (rawC > 37.8) {
          tempTargetEl.className = 'kpi-trend negative';
          tempTargetEl.innerHTML = '<i class="ri-arrow-up-line"></i> Terlalu Panas (>37.8&deg;C)';
        } else {
          tempTargetEl.className = 'kpi-trend positive';
          tempTargetEl.innerHTML = '<i class="ri-check-line"></i> Optimal (37.5&ndash;37.8&deg;C)';
        }
      }
    }

    // 2. Relative Humidity Card Update
    const humEl = document.getElementById('val-humidity');
    const humTargetEl = document.getElementById('badge-target-hum');

    if (humEl && data.humidity !== undefined && data.humidity !== null) {
      const rawHum = data.humidity;
      humEl.textContent = Math.round(rawHum);

      const isHatcher = (data.incubation && data.incubation.stage === 'HATCHER');
      const targetMin = isHatcher ? 65 : 50;
      const targetMax = isHatcher ? 70 : 55;

      if (humTargetEl) {
        if (!data.sensorValid) {
          humTargetEl.className = 'kpi-trend negative';
          humTargetEl.innerHTML = '<i class="ri-error-warning-line"></i> Sensor Rusak';
        } else if (rawHum < targetMin) {
          humTargetEl.className = 'kpi-trend negative';
          humTargetEl.innerHTML = `<i class="ri-arrow-down-line"></i> Rendah (<${targetMin}%)`;
        } else if (rawHum > targetMax) {
          humTargetEl.className = 'kpi-trend negative';
          humTargetEl.innerHTML = `<i class="ri-arrow-up-line"></i> Terlalu Lembab (>${targetMax}%)`;
        } else {
          humTargetEl.className = 'kpi-trend positive';
          humTargetEl.innerHTML = `<i class="ri-check-line"></i> Normal (${isHatcher ? 'Hatcher' : 'Setter'} ${targetMin}-${targetMax}%)`;
        }
      }
    }

    // 3. Incubation Cycle Card Update
    if (data.incubation) {
      const inc = data.incubation;
      const dayEl = document.getElementById('val-incubation-day');
      const cycleStatusEl = document.getElementById('badge-cycle-status');
      const currentDay = inc.day || 12;
      const totalDays = inc.totalDays || 21;
      const pct = Math.round((currentDay / totalDays) * 100);

      if (dayEl) dayEl.textContent = `Hari ${currentDay} dari ${totalDays}`;
      if (cycleStatusEl) {
        cycleStatusEl.className = 'kpi-trend neutral';
        cycleStatusEl.innerHTML = `<i class="ri-pie-chart-line"></i> ${pct}% Selesai (${inc.stage || 'Setter'})`;
      }

      // Next turn countdown & rack turning status
      const isMotorActive = !!(data.actuators && data.actuators.motor);
      const nextTurnEl = document.getElementById('val-next-turn');
      if (nextTurnEl) {
        if (isMotorActive) {
          nextTurnEl.innerHTML = '<span style="color:#fbbf24; font-weight:700;"><i class="ri-restart-line spin-anim"></i> Sedang Memutar Rak!</span>';
        } else if (inc.stage === 'HATCHER') {
          nextTurnEl.textContent = 'Nonaktif (Fase Hatcher)';
        } else if (inc.nextTurnInSeconds !== undefined) {
          const s = Math.max(0, Math.floor(inc.nextTurnInSeconds));
          const h = Math.floor(s / 3600);
          const m = Math.floor((s % 3600) / 60);
          nextTurnEl.textContent = `${h}j ${m}m lagi`;
        }
      }
    }

    // 4. Timestamp Reload Indicator
    const reloadEl = document.getElementById('val-last-reload');
    if (reloadEl) {
      const d = data.timestamp ? new Date(data.timestamp) : new Date();
      reloadEl.textContent = `${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID')} WIB`;
    }

    // 5. System Mode Badge & Buttons
    const modeBadge = document.getElementById('badge-system-mode');
    const btnModeAuto = document.getElementById('btn-mode-auto');
    const btnModeManual = document.getElementById('btn-mode-manual');

    if (modeBadge && data.mode) {
      modeBadge.textContent = `MODE ${data.mode}`;
      modeBadge.className = `mode-pill ${data.mode === 'AUTO' ? 'badge-active' : 'badge-warning'}`;
    }
    if (btnModeAuto && btnModeManual && data.mode) {
      if (data.mode === 'AUTO') {
        btnModeAuto.classList.add('active');
        btnModeManual.classList.remove('active');
      } else {
        btnModeAuto.classList.remove('active');
        btnModeManual.classList.add('active');
      }
    }

    // 6. Actuator Overrides, Egg Rack Indicators & Duty Cycle Bars
    if (data.actuators) {
      const isMotorActive = !!data.actuators.motor;
      this.updateActuator('heater', data.actuators.heater, 'Pemanas Aktif', 'Pemanas Mati');
      this.updateActuator('fan', data.actuators.fan, 'Kipas Sirkulasi Aktif', 'Kipas Mati');
      this.updateActuator('humidifier', data.actuators.humidifier, 'Uap Humidifier Aktif', 'Uap Mati');
      this.updateActuator('motor', isMotorActive, 'Rak Sedang Memutar (45\u00B0)', 'Rak Standby');

      // Update Visual Banners & Badges for Egg Rack Turning
      const rackBanner = document.getElementById('banner-rack-moving');
      const rackBadge = document.getElementById('rack-status-badge');
      const rackTimerVal = document.getElementById('val-rack-turning-left');
      const motorCard = document.getElementById('card-actuator-motor');

      if (rackBanner) {
        rackBanner.style.display = isMotorActive ? 'flex' : 'none';
      }
      if (rackBadge) {
        rackBadge.style.display = isMotorActive ? 'inline-flex' : 'none';
      }
      if (motorCard) {
        if (isMotorActive) motorCard.classList.add('active-motor-running');
        else motorCard.classList.remove('active-motor-running');
      }
      if (rackTimerVal) {
        const secLeft = (data.turnDurationLeft !== undefined && data.turnDurationLeft > 0)
          ? Math.ceil(data.turnDurationLeft)
          : (isMotorActive ? 12 : 0);
        rackTimerVal.textContent = `${secLeft} detik`;
      }

      // Update Horizontal Duty Cycle Bars
      const barHeaterVal = document.getElementById('bar-val-heater');
      const barHeaterFill = document.getElementById('bar-fill-heater');
      if (barHeaterVal && barHeaterFill) {
        const val = data.actuators.heater ? '100% (Memanaskan)' : '48.2% (Standby Histeresis)';
        barHeaterVal.textContent = val;
        barHeaterFill.style.width = data.actuators.heater ? '100%' : '48.2%';
      }

      const barFanVal = document.getElementById('bar-val-fan');
      const barFanFill = document.getElementById('bar-fill-fan');
      if (barFanVal && barFanFill) {
        const val = data.actuators.fan ? '100% (Sirkulasi Aktif)' : '0% (Mati)';
        barFanVal.textContent = val;
        barFanFill.style.width = data.actuators.fan ? '100%' : '0%';
      }

      const barHumVal = document.getElementById('bar-val-hum');
      const barHumFill = document.getElementById('bar-fill-hum');
      if (barHumVal && barHumFill) {
        const val = data.actuators.humidifier ? '100% (Menyemprot Uap)' : '35.0% (Standby)';
        barHumVal.textContent = val;
        barHumFill.style.width = data.actuators.humidifier ? '100%' : '35%';
      }

      const barMotorVal = document.getElementById('bar-val-motor');
      const barMotorFill = document.getElementById('bar-fill-motor');
      if (barMotorVal && barMotorFill) {
        barMotorVal.textContent = isMotorActive ? 'Memutar Rak...' : 'Standby (Tiap 3 Jam)';
        barMotorFill.style.width = isMotorActive ? '100%' : '15%';
      }
    }

    // 7. Door Sensor Badge
    this.updateDoorBadge(data.doorOpen);
  },

  updateActuator(target, isActive, activeLabel, inactiveLabel) {
    const toggle = document.getElementById(`toggle-${target}`);
    const badge = document.getElementById(`badge-${target}`);
    const label = document.getElementById(`label-${target}-status`);

    if (toggle) {
      toggle.checked = !!isActive;
      if (window.Auth && !window.Auth.canControl()) {
        toggle.disabled = true;
      } else {
        toggle.disabled = false;
      }
    }

    if (badge) {
      badge.textContent = isActive ? 'ON' : 'OFF';
      badge.className = `actuator-badge ${isActive ? 'badge-on' : 'badge-off'}`;
    }

    if (label) {
      label.textContent = isActive ? activeLabel : inactiveLabel;
    }
  },

  updateDoorBadge(isOpen) {
    const badge = document.getElementById('door-status-badge');
    const text = document.getElementById('text-door-status');
    if (!badge || !text) return;

    if (isOpen) {
      badge.style.background = 'rgba(244,63,94,0.18)';
      badge.style.color = 'var(--accent-rose)';
      badge.innerHTML = '<i class="ri-door-open-line"></i> <span>Pintu Terbuka!</span>';
    } else {
      badge.style.background = 'rgba(16,185,129,0.12)';
      badge.style.color = 'var(--accent-emerald)';
      badge.innerHTML = '<i class="ri-door-closed-line"></i> <span>Pintu Tertutup</span>';
    }
  },

  renderDevicesTable(devices, selectedId) {
    const tbody = document.getElementById('table-devices-body');
    if (!tbody) return;

    if (!devices || devices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">Belum ada mesin tetas terdaftar.</td></tr>';
      return;
    }

    tbody.innerHTML = devices.map(d => {
      const isSelected = d.deviceId === selectedId;
      const isOnline = d.status === 'online';
      return `
        <tr style="${isSelected ? 'background:rgba(108,62,232,0.12);' : ''}">
          <td><b><code>${d.deviceId}</code></b></td>
          <td>${d.name || 'Mesin Tetas'}</td>
          <td>${d.owner || 'Farm Administrator'}</td>
          <td>
            <span class="pill-badge status-badge ${isOnline ? 'online' : 'offline'}">
              <span class="status-dot"></span> ${d.status ? d.status.toUpperCase() : 'UNKNOWN'}
            </span>
          </td>
          <td>
            <span class="pill-badge" style="background:rgba(16,185,129,0.15); color:var(--accent-emerald);">
              ${d.doorOpen ? '<b style="color:var(--accent-rose);">Terbuka</b>' : 'Tertutup'}
            </span>
          </td>
          <td><code>${d.firmwareVersion || 'v1.1.0'}</code></td>
          <td style="color:var(--text-muted); font-size:0.78rem;">${d.lastSeen ? new Date(d.lastSeen).toLocaleTimeString() : 'Baru saja'}</td>
          <td>
            <button class="btn btn-outline-sm" onclick="App.selectDevice('${d.deviceId}')">
              ${isSelected ? 'Dipilih' : 'Pilih'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderUsersTable(users) {
    const tbody = document.getElementById('table-users-body');
    if (!tbody) return;

    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Tidak ada data pengguna terdaftar.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      let roleBadgeColor = 'var(--neon-cyan)';
      let permDesc = 'Akses telemetri saja (Read-only)';

      if (u.role === 'admin') {
        roleBadgeColor = 'var(--neon-purple)';
        permDesc = 'Akses Penuh: Kontrol aktuator, ubah parameter, manajemen akun, unduh audit log';
      } else if (u.role === 'operator') {
        roleBadgeColor = 'var(--neon-cyan)';
        permDesc = 'Akses Operasional: Kontrol saklar, ubah target suhu & kelembapan, konfirmasi alarm';
      }

      return `
        <tr>
          <td><code>${u.id}</code></td>
          <td><b>${u.name}</b></td>
          <td>${u.username}</td>
          <td><span class="user-role-badge" style="color:${roleBadgeColor};">${u.role.toUpperCase()}</span></td>
          <td style="color:var(--text-muted); font-size:0.8rem;">${permDesc}</td>
        </tr>
      `;
    }).join('');
  },

  renderHistoryTable(records) {
    const tbody = document.getElementById('table-history-body');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">Belum ada riwayat telemetri tercatat.</td></tr>';
      return;
    }

    tbody.innerHTML = records.slice().reverse().map(row => {
      const timeStr = new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `
        <tr>
          <td>${timeStr}</td>
          <td><b>${row.temperature !== undefined ? row.temperature.toFixed(1) : '--'} &deg;C</b></td>
          <td><b>${row.humidity !== undefined ? Math.round(row.humidity) : '--'}% RH</b></td>
          <td><span class="status-badge ${row.mode === 'AUTO' ? 'online' : 'connecting'}">${row.mode || 'AUTO'}</span></td>
          <td>${row.heater ? '<span style="color:var(--accent-rose); font-weight:700;"><i class="ri-fire-line"></i> ON</span>' : '<span style="color:var(--text-dim);">OFF</span>'}</td>
          <td>${row.fan ? '<span style="color:var(--neon-cyan); font-weight:700;"><i class="ri-windy-line"></i> ON</span>' : '<span style="color:var(--text-dim);">OFF</span>'}</td>
          <td>${row.humidifier ? '<span style="color:var(--neon-purple); font-weight:700;"><i class="ri-mist-line"></i> ON</span>' : '<span style="color:var(--text-dim);">OFF</span>'}</td>
          <td>${row.motor ? '<span style="color:#fbbf24; font-weight:700;"><i class="ri-restart-line"></i> RUN</span>' : '<span style="color:var(--text-dim);">IDLE</span>'}</td>
        </tr>
      `;
    }).join('');
  },

  renderAlertsList(alerts, activeFilter = 'all') {
    const container = document.getElementById('alerts-list-container');
    if (!container) return;

    if (!alerts || alerts.length === 0) {
      container.innerHTML = `
        <div style="padding:16px; background:var(--bg-input); border-radius:var(--radius-md); border-left:4px solid var(--accent-emerald);">
          <b style="color:var(--accent-emerald);"><i class="ri-shield-check-line"></i> Semua Sistem Beroperasi Optimal</b>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Tidak ada insiden suhu atau kelembapan kritis yang tercatat.</p>
        </div>
      `;
      return;
    }

    let filtered = alerts;
    if (activeFilter === 'critical') filtered = alerts.filter(a => (a.severity || '').toLowerCase() === 'critical');
    else if (activeFilter === 'warning') filtered = alerts.filter(a => (a.severity || '').toLowerCase() === 'warning');
    else if (activeFilter === 'resolved') filtered = alerts.filter(a => a.acknowledged);

    container.innerHTML = filtered.map(a => {
      const isCritical = (a.severity && a.severity.toLowerCase() === 'critical');
      const timeStr = new Date(a.createdAt || a.timestamp || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const alertKey = a.id || a.alertId;
      return `
        <div style="padding:14px 18px; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-card); border-left:4px solid ${isCritical ? 'var(--accent-rose)' : 'var(--accent-amber)'}; display:flex; align-items:center; justify-content:space-between; gap:14px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="status-badge ${isCritical ? 'offline' : 'connecting'}" style="text-transform:uppercase;">${a.severity || 'WARNING'}</span>
              <b>${a.type || 'Peringatan'}</b>
              <small style="color:var(--text-dim);">${timeStr}</small>
            </div>
            <p style="font-size:0.84rem; color:var(--text-heading); margin-top:5px;">${a.message}</p>
          </div>
          <div>
            ${a.acknowledged
              ? `<span style="font-size:0.75rem; color:var(--accent-emerald); font-weight:700;"><i class="ri-check-line"></i> Dikonfirmasi</span>`
              : `<button class="btn btn-outline-sm" onclick="App.acknowledgeAlert('${alertKey}')"><i class="ri-check-line"></i> Konfirmasi</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  },

  setActuatorPending(target, isPending) {
    const badge = document.getElementById(`badge-${target}`);
    if (badge && isPending) {
      badge.textContent = 'PENDING...';
      badge.className = 'actuator-badge badge-unknown';
    }
  },

  handleCommandAck(msg) {
    const { target, status, applied, message } = msg;
    const isSuccess = (status === 'ACK' || status === 'confirmed' || status === 'success');
    if (isSuccess) {
      this.showToast(`Berhasil: ${message || `Perintah ${target ? target.toUpperCase() : ''} diterapkan ke mesin`}`, 'success');
      this.setActuatorPending(target, false);
    } else {
      this.showToast(`Ditolak: ${message || 'Perintah ditolak oleh pengaman ESP32'}`, 'error');
      this.setActuatorPending(target, false);
    }
  },

  handleNewAlert(alert) {
    const isCritical = (alert.severity && alert.severity.toLowerCase() === 'critical');
    this.showToast(`Peringatan Mesin: ${alert.message}`, isCritical ? 'error' : 'warning');
    const badge = document.getElementById('topbar-alert-badge');
    if (badge) {
      const count = parseInt(badge.textContent || '0') + 1;
      badge.textContent = count;
      badge.style.display = 'flex';
    }

    if (window.App && window.App.cachedAlerts) {
      window.App.cachedAlerts.unshift(alert);
      if (window.App.currentView === 'alerts') {
        this.renderAlertsList(window.App.cachedAlerts, window.App.alertFilter || 'all');
      }
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = '<i class="ri-information-line"></i>';
    if (type === 'success') icon = '<i class="ri-checkbox-circle-line" style="color:var(--accent-emerald);"></i>';
    if (type === 'error') icon = '<i class="ri-error-warning-line" style="color:var(--accent-rose);"></i>';
    if (type === 'warning') icon = '<i class="ri-alert-line" style="color:var(--accent-amber);"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }
};

window.UI = UI;

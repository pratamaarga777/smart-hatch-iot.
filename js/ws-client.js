// Real-time WebSocket Client for Smart Hatch IoT
const WSClient = {
  socket: null,
  reconnectInterval: 2000,
  reconnectTimer: null,
  isExplicitClose: false,

  getWsUrl() {
    const baseUrl = API.getBaseUrl();
    try {
      const url = new URL(baseUrl);
      const wsProtocol = (url.protocol === 'https:') ? 'wss:' : 'ws:';
      return `${wsProtocol}//${url.host}/ws`;
    } catch (e) {
      if (window.location.protocol === 'https:') {
        return `wss://${window.location.host}/ws`;
      }
      return 'ws://localhost:3000/ws';
    }
  },

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    const url = this.getWsUrl();
    console.log(`[WSClient] Menghubungkan ke gateway WebSocket: ${url}...`);
    this.updateStatusBadge('connecting');

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('[WSClient] Terhubung ke gateway WebSocket');
        this.updateStatusBadge('online');
        this.reconnectInterval = 2000;

        // Registrasi sesi client Web
        this.socket.send(JSON.stringify({
          type: 'register',
          clientType: 'web',
          token: API.getToken(),
          deviceId: window.App ? window.App.selectedDeviceId : 'INC-001'
        }));
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('[WSClient] Kesalahan parsing paket WebSocket:', e);
        }
      };

      this.socket.onclose = () => {
        console.log('[WSClient] Koneksi terputus dari server');
        this.updateStatusBadge('offline');
        if (!this.isExplicitClose) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        console.error('[WSClient] WebSocket error:', err);
        this.socket.close();
      };
    } catch (e) {
      console.error('[WSClient] Gagal membuka soket:', e);
      this.scheduleReconnect();
    }
  },

  reconnect() {
    if (this.socket) {
      this.isExplicitClose = true;
      this.socket.close();
    }
    this.isExplicitClose = false;
    this.connect();
  },

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log(`[WSClient] Mencoba reconnect otomatis (${this.reconnectInterval}ms)...`);
      this.connect();
      this.reconnectInterval = Math.min(this.reconnectInterval * 1.5, 15000);
    }, this.reconnectInterval);
  },

  handleMessage(msg) {
    if (msg.type === 'telemetry') {
      if (window.App && msg.deviceId === window.App.selectedDeviceId) {
        window.App.latestTelemetry = msg.data;
        window.UI.renderTelemetry(msg.data);
        if (window.Charts && msg.data.temperature !== undefined) {
          window.Charts.pushDataPoint(msg.timestamp || Date.now(), msg.data.temperature, msg.data.humidity);
        }
      }
    } else if (msg.type === 'ack') {
      window.UI.handleCommandAck(msg);
    } else if (msg.type === 'alert') {
      window.UI.handleNewAlert(msg.alert);
    } else if (msg.type === 'deviceStatus') {
      if (window.App && msg.deviceId === window.App.selectedDeviceId) {
        this.updateDeviceStatusBadge(msg.status);
      }
    } else if (msg.type === 'command_error') {
      window.UI.showToast(msg.error, 'error');
    }
  },

  sendCommand(target, action, durationSeconds = 0) {
    if (!Auth.canControl()) {
      window.UI.showToast('Peran Tamu dilarang mengubah saklar aktuator', 'warning');
      return;
    }

    const commandId = 'cmd_' + Math.random().toString(36).substring(2, 9);
    const payload = {
      type: 'command',
      commandId,
      deviceId: window.App ? window.App.selectedDeviceId : 'INC-001',
      target,
      action,
      durationSeconds,
      timestamp: Date.now()
    };

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
      window.UI.setActuatorPending(target, true);
    } else if (window.Simulator) {
      // Jalur responsif Simulator Virtual ESP32
      window.UI.setActuatorPending(target, true);
      window.Simulator.handleCommand(target, action, durationSeconds);
    } else {
      // Jalur cadangan melalui HTTP REST API
      API.sendCommand(payload.deviceId, target, action, durationSeconds)
        .then(res => {
          if (res && res.success) {
            window.UI.showToast(`Perintah ${target} ${action} terkirim via REST`, 'success');
          } else {
            window.UI.showToast(res.error || 'Gagal mengirim perintah', 'error');
          }
        })
        .catch(err => window.UI.showToast(err.message, 'error'));
    }
  },

  updateStatusBadge(status) {
    const el = document.getElementById('connection-status');
    if (!el) return;
    el.className = `status-badge ${status}`;
    const statusText = (status === 'online') ? 'Server ONLINE' : ((status === 'connecting') ? 'Server Menghubungkan...' : 'Server OFFLINE');
    el.innerHTML = `<span class="status-dot"></span> <span>${statusText}</span>`;
  },

  updateDeviceStatusBadge(status) {
    const el = document.getElementById('device-status-badge');
    if (!el) return;
    el.className = `status-badge ${status}`;
    const statusText = (status === 'online') ? 'Mesin ONLINE' : ((status === 'connecting') ? 'Mesin Menghubungkan...' : 'Mesin OFFLINE');
    el.innerHTML = `<span class="status-dot"></span> <span>${statusText}</span>`;
  }
};

window.WSClient = WSClient;

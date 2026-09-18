// REST API Client
const API = {
  getBaseUrl() {
    const custom = localStorage.getItem('backend_url');
    if (custom && custom.trim().length > 0) {
      return custom.trim().replace(/\/$/, '');
    }
    if (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) {
      return window.location.origin;
    }
    return window.location.origin;
  },

  setBaseUrl(url) {
    if (!url || url.trim() === '') {
      localStorage.removeItem('backend_url');
    } else {
      localStorage.setItem('backend_url', url.trim().replace(/\/$/, ''));
    }
  },

  getToken() {
    return localStorage.getItem('auth_token') || '';
  },

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    };
  },

  async login(username, password) {
    const res = await fetch(`${this.getBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  async getDevices() {
    const res = await fetch(`${this.getBaseUrl()}/api/devices`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async addDevice(deviceData) {
    const res = await fetch(`${this.getBaseUrl()}/api/devices`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(deviceData)
    });
    return res.json();
  },

  async getDevice(deviceId) {
    const res = await fetch(`${this.getBaseUrl()}/api/devices/${deviceId}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async getHistory(deviceId, limit = 100) {
    const res = await fetch(`${this.getBaseUrl()}/api/devices/${deviceId}/history?limit=${limit}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async getAlerts(deviceId) {
    const res = await fetch(`${this.getBaseUrl()}/api/devices/${deviceId}/alerts`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async acknowledgeAlert(deviceId, alertId) {
    const res = await fetch(`${this.getBaseUrl()}/api/devices/${deviceId}/alerts/${alertId}/ack`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return res.json();
  },

  async sendCommand(deviceId, target, action, durationSeconds = 0) {
    const res = await fetch(`${this.getBaseUrl()}/api/devices/${deviceId}/command`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ target, action, durationSeconds })
    });
    return res.json();
  },

  async updateSettings(deviceId, settings) {
    const res = await fetch(`${this.getBaseUrl()}/api/devices/${deviceId}/settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  async startIncubation(deviceId, eggType, eggCount, totalDays = 21) {
    const res = await fetch(`${this.getBaseUrl()}/api/devices/${deviceId}/incubation`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ eggType, eggCount, totalDays })
    });
    return res.json();
  },

  async getUsers() {
    const res = await fetch(`${this.getBaseUrl()}/api/users`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async getAuditLogs(limit = 50) {
    const res = await fetch(`${this.getBaseUrl()}/api/audit-logs?limit=${limit}`, {
      headers: this.getHeaders()
    });
    return res.json();
  }
};

window.API = API;

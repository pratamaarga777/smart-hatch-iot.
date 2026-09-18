// ==========================================================================
// SMART HATCH IoT - CHARTS & VISUALIZATION CONTROLLER (DARK THEME)
// Powers Real-Time Neon Overtime Curve, KPI Sparklines, & BI Donut Charts
// ==========================================================================

const Charts = {
  chart: null,
  historyChart: null,
  historyRange: '1h',
  incubationDonut: null,
  integrityDonut: null,
  sparklines: {},
  maxPoints: 30,
  rawHistory: [],
  currentChartType: 'line',

  init() {
    console.log('[Charts] Inisialisasi grafik visual bertema Dark Navy/Indigo...');
    
    // Set global Chart.js dark-theme typography and defaults
    if (window.Chart) {
      Chart.defaults.color = '#8e9ab8';
      Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
      Chart.defaults.borderColor = 'rgba(39, 47, 96, 0.6)';
    }

    this.initMainChart();
    this.initHistoryChart();
    this.initDonutCharts();
    this.initSparklines();
  },

  // 1. MAIN OVERTIME CHART (DUAL NEON CURVES: CYAN & PURPLE)
  initMainChart() {
    const ctx = document.getElementById('telemetryChart');
    if (!ctx) return;

    const unit = (window.App && window.App.tempUnit) ? window.App.tempUnit : 'C';
    const isF = unit === 'F';

    // Create subtle gradient fills
    const canvas = ctx.getContext('2d');
    const gradCyan = canvas.createLinearGradient(0, 0, 0, 280);
    gradCyan.addColorStop(0, 'rgba(0, 212, 255, 0.28)');
    gradCyan.addColorStop(1, 'rgba(0, 212, 255, 0.00)');

    const gradPurple = canvas.createLinearGradient(0, 0, 0, 280);
    gradPurple.addColorStop(0, 'rgba(139, 92, 246, 0.28)');
    gradPurple.addColorStop(1, 'rgba(139, 92, 246, 0.00)');

    this.chart = new Chart(ctx, {
      type: this.currentChartType,
      data: {
        labels: [],
        datasets: [
          {
            label: isF ? 'Suhu Ruang (\u00B0F)' : 'Suhu Ruang (\u00B0C)',
            borderColor: '#00d4ff',
            backgroundColor: gradCyan,
            borderWidth: 2.6,
            pointRadius: 2.5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#00d4ff',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            tension: 0.38,
            fill: true,
            yAxisID: 'yTemp',
            data: []
          },
          {
            label: 'Kelembapan (% RH)',
            borderColor: '#a855f7',
            backgroundColor: gradPurple,
            borderWidth: 2.6,
            pointRadius: 2.5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#a855f7',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            tension: 0.38,
            fill: true,
            yAxisID: 'yHum',
            data: []
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              padding: 14,
              font: { weight: '600', size: 11.5 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 19, 44, 0.94)',
            borderColor: '#2d3770',
            borderWidth: 1,
            padding: 12,
            titleColor: '#ffffff',
            titleFont: { size: 12, weight: '700' },
            bodyFont: { size: 11.5 },
            cornerRadius: 8,
            boxPadding: 4,
            callbacks: {
              label: function(context) {
                const isFahrenheit = (window.App && window.App.tempUnit === 'F');
                if (context.datasetIndex === 0) {
                  return ` Suhu: ${context.parsed.y}\u00B0${isFahrenheit ? 'F' : 'C'}`;
                } else {
                  return ` Kelembapan: ${context.parsed.y}% RH`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(39, 47, 96, 0.3)' },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7,
              font: { size: 10.5 },
              color: '#8e9ab8'
            }
          },
          yTemp: {
            type: 'linear',
            position: 'left',
            min: isF ? 95.0 : 35.0,
            max: isF ? 104.0 : 40.0,
            grid: { color: 'rgba(39, 47, 96, 0.4)' },
            ticks: {
              stepSize: isF ? 1.0 : 0.5,
              callback: (val) => `${val}\u00B0${isF ? 'F' : 'C'}`,
              font: { size: 10.5 },
              color: '#00d4ff'
            }
          },
          yHum: {
            type: 'linear',
            position: 'right',
            min: 30,
            max: 90,
            grid: { display: false },
            ticks: {
              stepSize: 10,
              callback: (val) => `${val}%`,
              font: { size: 10.5 },
              color: '#a855f7'
            }
          }
        }
      }
    });
  },

  // 2. DONUT CHARTS (INCUBATION PHASES & CLIMATE INTEGRITY)
  initDonutCharts() {
    // A. Incubation Cycle Donut (Setter vs Hatcher)
    const ctxInc = document.getElementById('chartIncubationDonut');
    if (ctxInc) {
      this.incubationDonut = new Chart(ctxInc, {
        type: 'doughnut',
        data: {
          labels: ['Fase Setter (1-18)', 'Fase Hatcher (19-21)'],
          datasets: [{
            data: [18, 3],
            backgroundColor: ['#00d4ff', '#8b5cf6'],
            borderColor: '#181d44',
            borderWidth: 3,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '74%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 19, 44, 0.94)',
              borderColor: '#2d3770',
              borderWidth: 1,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} Hari (${((ctx.raw/21)*100).toFixed(1)}%)`
              }
            }
          }
        }
      });
    }

    // B. Climate Stability & Integrity Donut
    const ctxInt = document.getElementById('chartIntegrityDonut');
    if (ctxInt) {
      this.integrityDonut = new Chart(ctxInt, {
        type: 'doughnut',
        data: {
          labels: ['Optimal', 'Fluktuasi', 'Kritis'],
          datasets: [{
            data: [92, 7, 1],
            backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
            borderColor: '#181d44',
            borderWidth: 3,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '74%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 19, 44, 0.94)',
              borderColor: '#2d3770',
              borderWidth: 1,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw}%`
              }
            }
          }
        }
      });
    }
  },

  // 3. KPI SPARKLINES (MINI CURVES AT THE BOTTOM OF 4 STAT CARDS)
  initSparklines() {
    const sparklineConfigs = [
      { id: 'sparkline-temp', color: '#00d4ff', data: [37.4, 37.5, 37.6, 37.5, 37.7, 37.6, 37.7, 37.8, 37.7] },
      { id: 'sparkline-hum', color: '#8b5cf6', data: [51, 52, 53, 52, 54, 55, 54, 53, 54] },
      { id: 'sparkline-cycle', color: '#fbbf24', data: [8, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12] },
      { id: 'sparkline-actuators', color: '#10b981', data: [98, 99, 99.5, 99, 100, 99.8, 100, 99.8, 100] }
    ];

    sparklineConfigs.forEach(item => {
      const el = document.getElementById(item.id);
      if (!el) return;

      const ctx = el.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 42);
      grad.addColorStop(0, item.color + '44');
      grad.addColorStop(1, item.color + '00');

      this.sparklines[item.id] = new Chart(el, {
        type: 'line',
        data: {
          labels: item.data.map((_, i) => i),
          datasets: [{
            data: item.data,
            borderColor: item.color,
            borderWidth: 2,
            backgroundColor: grad,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false },
            y: { display: false }
          }
        }
      });
    });
  },

  updateSparkline(id, newValue) {
    const sp = this.sparklines[id];
    if (!sp) return;
    sp.data.datasets[0].data.push(newValue);
    if (sp.data.datasets[0].data.length > 12) {
      sp.data.datasets[0].data.shift();
    }
    sp.update('none');
  },

  // 4. CHART TOGGLE & CONTROLS
  toggleChartType(type) {
    if (!this.chart || this.currentChartType === type) return;
    this.currentChartType = type;

    // Update button visual state
    const btnLine = document.getElementById('btn-chart-line');
    const btnBar = document.getElementById('btn-chart-bar');
    if (btnLine && btnBar) {
      if (type === 'line') {
        btnLine.classList.add('active');
        btnBar.classList.remove('active');
      } else {
        btnLine.classList.remove('active');
        btnBar.classList.add('active');
      }
    }

    // Recreate Chart with new type
    const savedLabels = [...this.chart.data.labels];
    const savedTemp = [...this.chart.data.datasets[0].data];
    const savedHum = [...this.chart.data.datasets[1].data];

    this.chart.destroy();
    this.initMainChart();

    this.chart.data.labels = savedLabels;
    this.chart.data.datasets[0].data = savedTemp;
    this.chart.data.datasets[1].data = savedHum;
    this.chart.update('none');
  },

  convertTemp(valC) {
    if (valC === null || valC === undefined || isNaN(valC)) return 0;
    const isF = (window.App && window.App.tempUnit === 'F');
    return isF ? parseFloat(((valC * 9/5) + 32).toFixed(1)) : parseFloat(valC.toFixed(1));
  },

  setRecordLimit(limit) {
    this.maxPoints = parseInt(limit) || 30;
    if (this.rawHistory.length > 0) {
      this.renderFromRawHistory();
    }
  },

  loadHistory(historyData) {
    if (!Array.isArray(historyData)) return;
    this.rawHistory = [...historyData];
    this.renderFromRawHistory();
  },

  renderFromRawHistory() {
    if (!this.chart) return;

    const slice = this.rawHistory.slice(-this.maxPoints);
    this.chart.data.labels = slice.map(pt => {
      const d = new Date(pt.timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    this.chart.data.datasets[0].data = slice.map(pt => this.convertTemp(pt.temperature));
    this.chart.data.datasets[1].data = slice.map(pt => pt.humidity);

    this.updateUnitScale();
    this.chart.update('none');
  },

  pushDataPoint(timestamp, tempC, hum, extraData = {}) {
    this.rawHistory.push({ timestamp, temperature: tempC, humidity: hum, ...extraData });
    if (this.rawHistory.length > 300) this.rawHistory.shift();

    // Update Sparklines
    this.updateSparkline('sparkline-temp', this.convertTemp(tempC));
    this.updateSparkline('sparkline-hum', hum);

    if (!this.chart) return;

    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    this.chart.data.labels.push(timeStr);
    this.chart.data.datasets[0].data.push(this.convertTemp(tempC));
    this.chart.data.datasets[1].data.push(hum);

    if (this.chart.data.labels.length > this.maxPoints) {
      this.chart.data.labels.shift();
      this.chart.data.datasets[0].data.shift();
      this.chart.data.datasets[1].data.shift();
    }

    this.chart.update('none');
  },

  updateUnitScale() {
    if (!this.chart) return;
    const isF = (window.App && window.App.tempUnit === 'F');

    this.chart.data.datasets[0].label = isF ? 'Suhu Ruang (\u00B0F)' : 'Suhu Ruang (\u00B0C)';
    this.chart.options.scales.yTemp.min = isF ? 95.0 : 35.0;
    this.chart.options.scales.yTemp.max = isF ? 104.0 : 40.0;
    this.chart.options.scales.yTemp.ticks.stepSize = isF ? 1.0 : 0.5;
    this.chart.options.scales.yTemp.ticks.callback = (val) => `${val}\u00B0${isF ? 'F' : 'C'}`;

    const slice = this.rawHistory.slice(-this.maxPoints);
    this.chart.data.datasets[0].data = slice.map(pt => this.convertTemp(pt.temperature));
    this.chart.update();

    if (this.historyChart) {
      this.updateHistoryChart();
    }
  },

  // 5. HISTORY ANALYTICS TIME-SERIES CHART (DUAL AXIS & STATS)
  initHistoryChart() {
    const ctx = document.getElementById('historyAnalyticsChart');
    if (!ctx) return;

    const unit = (window.App && window.App.tempUnit) ? window.App.tempUnit : 'C';
    const isF = unit === 'F';

    const canvas = ctx.getContext('2d');
    const gradCyan = canvas.createLinearGradient(0, 0, 0, 300);
    gradCyan.addColorStop(0, 'rgba(0, 212, 255, 0.32)');
    gradCyan.addColorStop(1, 'rgba(0, 212, 255, 0.00)');

    const gradPurple = canvas.createLinearGradient(0, 0, 0, 300);
    gradPurple.addColorStop(0, 'rgba(139, 92, 246, 0.32)');
    gradPurple.addColorStop(1, 'rgba(139, 92, 246, 0.00)');

    this.historyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: isF ? 'Suhu Ruang (\u00B0F)' : 'Suhu Ruang (\u00B0C)',
            borderColor: '#00d4ff',
            backgroundColor: gradCyan,
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#00d4ff',
            yAxisID: 'yTemp',
            data: []
          },
          {
            label: 'Kelembapan Relatif (% RH)',
            borderColor: '#a855f7',
            backgroundColor: gradPurple,
            borderWidth: 2.2,
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#a855f7',
            yAxisID: 'yHum',
            data: []
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { boxWidth: 12, padding: 16, color: '#c5d0e6', font: { weight: '600', size: 11.5 } }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 19, 44, 0.95)',
            borderColor: '#2d3770',
            borderWidth: 1,
            padding: 12,
            titleColor: '#ffffff',
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const isFahrenheit = (window.App && window.App.tempUnit === 'F');
                if (context.datasetIndex === 0) {
                  return ` Suhu: ${context.parsed.y}\u00B0${isFahrenheit ? 'F' : 'C'}`;
                } else {
                  return ` Kelembapan: ${context.parsed.y}% RH`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(39, 47, 96, 0.3)' },
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 10.5 }, color: '#8e9ab8' }
          },
          yTemp: {
            type: 'linear',
            position: 'left',
            min: isF ? 95.0 : 35.0,
            max: isF ? 104.0 : 40.0,
            grid: { color: 'rgba(39, 47, 96, 0.4)' },
            ticks: {
              stepSize: isF ? 1.0 : 0.5,
              callback: (val) => `${val}\u00B0${isF ? 'F' : 'C'}`,
              font: { size: 10.5 },
              color: '#00d4ff'
            }
          },
          yHum: {
            type: 'linear',
            position: 'right',
            min: 30,
            max: 90,
            grid: { display: false },
            ticks: {
              stepSize: 10,
              callback: (val) => `${val}%`,
              font: { size: 10.5 },
              color: '#a855f7'
            }
          }
        }
      }
    });

    this.updateHistoryChart();
  },

  updateHistoryChart() {
    if (!this.historyChart) {
      this.initHistoryChart();
      return;
    }

    let pointsCount = 30;
    if (this.historyRange === '1h') pointsCount = 20;
    else if (this.historyRange === '6h') pointsCount = 60;
    else if (this.historyRange === '24h') pointsCount = 120;
    else pointsCount = 200;

    let historyData = this.rawHistory.slice(-pointsCount);
    if (historyData.length === 0) {
      const now = Date.now();
      for (let i = 19; i >= 0; i--) {
        historyData.push({
          timestamp: now - (i * 120000),
          temperature: parseFloat((37.65 + Math.sin(i / 3) * 0.15).toFixed(2)),
          humidity: Math.round(53.5 + Math.cos(i / 2) * 1.5)
        });
      }
    }

    const labels = historyData.map(pt => {
      const d = new Date(pt.timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    const tempData = historyData.map(pt => this.convertTemp(pt.temperature));
    const humData = historyData.map(pt => pt.humidity);

    this.historyChart.data.labels = labels;
    this.historyChart.data.datasets[0].data = tempData;
    this.historyChart.data.datasets[1].data = humData;
    this.historyChart.update('none');

    // Calculate Mini KPI Metrics
    const rawTemps = historyData.map(pt => pt.temperature).filter(t => t !== null && !isNaN(t));
    const rawHums = historyData.map(pt => pt.humidity).filter(h => h !== null && !isNaN(h));

    if (rawTemps.length > 0) {
      const minT = Math.min(...rawTemps);
      const maxT = Math.max(...rawTemps);
      const avgT = rawTemps.reduce((a, b) => a + b, 0) / rawTemps.length;
      const avgH = rawHums.length > 0 ? (rawHums.reduce((a, b) => a + b, 0) / rawHums.length) : 54;

      const unit = (window.App && window.App.tempUnit) ? window.App.tempUnit : 'C';
      const isF = unit === 'F';
      const dispMinT = isF ? ((minT * 9/5) + 32).toFixed(1) : minT.toFixed(1);
      const dispMaxT = isF ? ((maxT * 9/5) + 32).toFixed(1) : maxT.toFixed(1);
      const dispAvgT = isF ? ((avgT * 9/5) + 32).toFixed(2) : avgT.toFixed(2);

      const elMin = document.getElementById('hist-min-temp');
      const elMax = document.getElementById('hist-max-temp');
      const elAvgT = document.getElementById('hist-avg-temp');
      const elAvgH = document.getElementById('hist-avg-hum');
      const elStab = document.getElementById('hist-stability');

      if (elMin) elMin.innerHTML = `${dispMinT}&deg;${unit}`;
      if (elMax) elMax.innerHTML = `${dispMaxT}&deg;${unit}`;
      if (elAvgT) elAvgT.innerHTML = `${dispAvgT}&deg;${unit}`;
      if (elAvgH) elAvgH.textContent = `${Math.round(avgH)}% RH`;
      if (elStab) {
        const optimalCount = rawTemps.filter(t => t >= 37.4 && t <= 37.85).length;
        const stabPct = Math.round((optimalCount / rawTemps.length) * 100);
        elStab.innerHTML = `<i class="ri-shield-check-line"></i> ${stabPct}% Optimal`;
      }
    }
  },

  filterHistoryRange(range) {
    this.historyRange = range;
    ['1h', '6h', '24h'].forEach(r => {
      const btn = document.getElementById(`btn-range-${r}`);
      if (btn) {
        if (r === range) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });

    this.updateHistoryChart();
    if (window.UI) UI.showToast(`Rentang diagram riwayat: ${range.toUpperCase()}`, 'info');
  }
};

window.Charts = Charts;

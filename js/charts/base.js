/* ==========================================================================
   base.js — Gestor de gráficos Chart.js (tema, paleta, ciclo de vida)
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  /* Paleta dual (claro/oscuro): contrastes verificados >=2.8:1 sobre
     fondos claros y oscuros para que todos los colores sean legibles
     en ambos temas. */
  const PALETTE = [
    '#3350c7', '#0f9bd8', '#d97f2e', '#1f9e8f', '#6f8fc7', '#b45fd0',
    '#e6ab69', '#3a7dbb', '#d15b3a', '#45bfee', '#c9a227', '#7c5bb8'
  ];

  const Charts = {
    _instances: {},
    _configs: {},

    colors() { return PALETTE; },

    color(i) { return PALETTE[i % PALETTE.length]; },

    isDark() {
      return (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';
    },

    gridColor() {
      const cs = getComputedStyle(document.documentElement);
      return cs.getPropertyValue('--chart-grid').trim() || 'rgba(100,116,139,0.14)';
    },

    tickColor() {
      const cs = getComputedStyle(document.documentElement);
      return cs.getPropertyValue('--chart-tick').trim() || '#64748b';
    },

    _applyDefaults() {
      if (!global.Chart) return;
      const dark = Charts.isDark();
      Chart.defaults.font.family = getComputedStyle(document.body).fontFamily || 'Inter, system-ui, sans-serif';
      Chart.defaults.font.size = 12;
      Chart.defaults.color = Charts.tickColor();
      Chart.defaults.borderColor = Charts.gridColor();
      Chart.defaults.plugins.tooltip.backgroundColor = dark ? '#1e293b' : '#0f172a';
      Chart.defaults.plugins.tooltip.titleColor = '#fff';
      Chart.defaults.plugins.tooltip.bodyColor = '#e2e8f0';
      Chart.defaults.plugins.tooltip.padding = 10;
      Chart.defaults.plugins.tooltip.cornerRadius = 8;
      Chart.defaults.plugins.tooltip.displayColors = true;
      Chart.defaults.plugins.legend.labels.usePointStyle = true;
      Chart.defaults.plugins.legend.labels.boxHeight = 8;
      Chart.defaults.plugins.legend.labels.boxWidth = 8;
    },

    /**
     * Crea (o reemplaza) un gráfico en el canvas `id`.
     * Los tooltips se configuran automáticamente.
     */
    create(id, config) {
      if (!global.Chart) {
        console.warn('Chart.js no disponible.');
        return null;
      }
      Charts.destroy(id);
      Charts._applyDefaults();

      const baseTooltip = {
        mode: 'index',
        intersect: false,
        callbacks: {
          label(ctx) {
            let label = ctx.dataset.label || '';
            if (label) label += ': ';
            if (ctx.parsed.y != null) label += MedApp.Utils.fmtExact(ctx.parsed.y);
            else if (ctx.parsed.r != null) label += MedApp.Utils.fmtExact(ctx.parsed.r);
            return label;
          }
        }
      };
      const baseLegend = { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } };

      const full = Object.assign({}, config, {
        options: Object.assign({
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: Object.assign({ tooltip: baseTooltip, legend: baseLegend }, (config.options && config.options.plugins) || {}),
          scales: (config.options && config.options.scales) || {}
        }, config.options || {})
      });

      const canvas = document.getElementById(id);
      if (!canvas) return null;
      const chart = new Chart(canvas, full);
      Charts._instances[id] = chart;
      Charts._configs[id] = config;
      return chart;
    },

    destroy(id) {
      if (Charts._instances[id]) {
        try { Charts._instances[id].destroy(); } catch (e) { /* noop */ }
        delete Charts._instances[id];
        delete Charts._configs[id];
      }
    },

    destroyAll() {
      Object.keys(Charts._instances).forEach(id => Charts.destroy(id));
    },

    getActiveCount() {
      return Object.keys(Charts._instances).length;
    },

    /* Re-renderiza todos los gráficos activos (usado al cambiar tema) */
    applyTheme() {
      const configs = Object.assign({}, Charts._configs);
      Object.keys(configs).forEach(id => {
        const cfg = configs[id];
        Charts.destroy(id);
        Charts.create(id, cfg);
      });
    },

    /* Atajos de escalas */
    moneyY() {
      return {
        y: { beginAtZero: true, grid: { color: Charts.gridColor() }, ticks: { callback: v => '$' + MedApp.Utils.fmt(v) } }
      };
    },

    intY() {
      return {
        y: { beginAtZero: true, grid: { color: Charts.gridColor() }, ticks: { callback: v => MedApp.Utils.fmt(v) } },
        x: { grid: { display: false } }
      };
    }
  };

  MedApp.Charts = Charts;

})(window);

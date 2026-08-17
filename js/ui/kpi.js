/* ==========================================================================
   kpi.js — Componentes KPI compartidos (tarjetas, badges de crecimiento)
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  MedApp.UI = MedApp.UI || {};

  MedApp.UI.kpiCard = function kpiCard(label, value, sub, extra) {
    return `
      <div class="kpi-card">
        <span class="kpi-label">${label}</span>
        <span class="kpi-value">${value}</span>
        <span class="kpi-sub">${sub || ''}</span>
        ${extra ? '<div class="mt-8">' + extra + '</div>' : ''}
      </div>`;
  };

  MedApp.UI.growthBadge = function growthBadge(growth) {
    if (growth == null) return '<span class="badge badge-neutral">sin dato previo</span>';
    const up = growth >= 0;
    return `<span class="badge ${up ? 'badge-up' : 'badge-down'}">${MedApp.Utils.fmtPct(growth, true)}</span>`;
  };

  MedApp.UI.kpi = function kpi(label, value, sub, badge) {
    return `
      <div class="kpi-card">
        <span class="kpi-label">${label}</span>
        <span class="kpi-value">${value}</span>
        <span class="kpi-sub">${sub || ''}</span>
        ${badge ? '<div class="mt-8">' + badge + '</div>' : ''}
      </div>`;
  };

})(window);

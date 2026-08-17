/* ==========================================================================
   helpers.js — UI helpers compartidos (loading, skeleton, toast accesible)
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  MedApp.UI = MedApp.UI || {};

  MedApp.UI.loading = function loading(message) {
    return `
      <div class="card">
        <div class="flex-center" style="padding:24px">
          <span class="spinner" aria-hidden="true"></span>
          <span>${message || 'Procesando…'}</span>
        </div>
      </div>`;
  };

  MedApp.UI.skeleton = function skeleton(rows) {
    const n = rows || 5;
    let html = '<div class="skeleton-wrap">';
    for (let i = 0; i < n; i++) {
      html += '<div class="skeleton-line" style="width:' + (60 + Math.random() * 40) + '%"></div>';
    }
    html += '</div>';
    return html;
  };

  MedApp.UI.emptyState = function emptyState(title, message) {
    return `
      <div class="empty-state">
        <strong>${title || 'Sin resultados'}</strong>
        <span>${message || 'No se encontraron registros.'}</span>
      </div>`;
  };

  MedApp.UI.toast = function toast(message, type) {
    const root = document.getElementById('toastRoot');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'assertive');
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 320);
    }, 3800);
  };

})(window);

/* ==========================================================================
   utils.js — Utilidades generales de MedAnalytics
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MONTHS_LONG = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const YEARS_DEFAULT = [2023, 2024, 2025, 2026];

  const nfInt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const nfDec = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfPct = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function getYears() {
    const data = MedApp.Store && MedApp.Store.getData ? MedApp.Store.getData() : null;
    if (data && data.records && data.records.length) {
      const yearSet = new Set();
      data.records.forEach(r => { if (r.year) yearSet.add(r.year); });
      const years = Array.from(yearSet).sort((a, b) => a - b);
      if (years.length) return years;
    }
    return YEARS_DEFAULT;
  }

  MedApp.Utils = {
    MONTHS_SHORT,
    MONTHS_LONG,

    get YEARS() { return getYears(); },

    monthShort(m) { return MONTHS_SHORT[(m - 1 + 12) % 12]; },
    monthLong(m) { return MONTHS_LONG[(m - 1 + 12) % 12]; },

    fmt(n) {
      const v = Number(n) || 0;
      return v >= 1000000 ? (v / 1000000).toFixed(2).replace('.', ',') + ' M'
           : v >= 1000 ? nfInt.format(v)
           : nfInt.format(v);
    },
    fmtExact(n) { return nfInt.format(Number(n) || 0); },

    fmtMoney(n) {
      return '$' + nfDec.format(Number(n) || 0);
    },

    fmtPct(n, signed) {
      const s = (signed && Number(n) > 0 ? '+' : '') + nfPct.format(Number(n) || 0) + '%';
      return s;
    },

    pctGrowth(current, previous) {
      if (!previous) return null;
      return ((current - previous) / previous) * 100;
    },

    debounce(fn, wait) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    },

    clamp(v, min, max) { return Math.min(max, Math.max(min, v)); },

    slugify(str) {
      return (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ').trim();
    },

    escapeHtml(str) {
      return (str || '').toString()
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    download(filename, content, mime) {
      const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    },

    downloadCsv(filename, rows) {
      const esc = (v) => {
        const s = String(v == null ? '' : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const content = rows.map(r => r.map(esc).join(',')).join('\r\n');
      MedApp.Utils.download(filename, '\uFEFF' + content, 'text/csv;charset=utf-8');
    },

    toast(message, type) {
      if (MedApp.UI && MedApp.UI.toast) {
        MedApp.UI.toast(message, type);
        return;
      }
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
    }
  };

})(window);

/* ==========================================================================
   theme.js — Modo claro / oscuro
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  MedApp.Theme = {
    init() {
      const saved = localStorage.getItem('medanalytics.theme');
      const prefersDark = saved
        ? saved === 'dark'
        : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      MedApp.Theme.set(prefersDark ? 'dark' : 'light');
      MedApp.State.set({ theme: prefersDark ? 'dark' : 'light' });

      document.getElementById('themeToggle').addEventListener('click', () => {
        const next = MedApp.Charts.isDark() ? 'light' : 'dark';
        MedApp.Theme.set(next);
        MedApp.State.set({ theme: next });
      });
    },

    set(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('medanalytics.theme', theme);
      const sun = document.getElementById('iconSun');
      const moon = document.getElementById('iconMoon');
      const toggle = document.getElementById('themeToggle');
      if (sun) sun.style.display = theme === 'dark' ? 'none' : '';
      if (moon) moon.style.display = theme === 'dark' ? '' : 'none';
      if (toggle) toggle.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      MedApp.Charts.applyTheme();
    }
  };

})(window);

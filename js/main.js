/* ==========================================================================
   main.js — Arranque, navegación, estado global y utilidades de aplicación
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const App = {

    appEl: null,

    init() {
      App.appEl = document.getElementById('app');

      MedApp.Auth.init();
      MedApp.Theme.init();

      if (!MedApp.Auth.isLoggedIn()) {
        App.showLogin();
        return;
      }

      App.showApp();
    },

    showLogin() {
      document.getElementById('loginPage').style.display = 'flex';
      document.getElementById('topbar').style.display = 'none';
      document.querySelector('.app-footer').style.display = 'none';

      document.getElementById('loginForm').addEventListener('submit', e => {
        e.preventDefault();
        const user = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value;
        const errEl = document.getElementById('loginError');

        const result = MedApp.Auth.login(user, pass);
        if (result.success) {
          errEl.style.display = 'none';
          document.getElementById('loginPage').style.display = 'none';
          App.showApp();
        } else {
          errEl.textContent = result.error;
          errEl.style.display = 'block';
        }
      });
    },

    showApp() {
      document.getElementById('topbar').style.display = '';
      document.querySelector('.app-footer').style.display = '';
      document.getElementById('loginPage').style.display = 'none';

      const session = MedApp.Auth.getSession();
      const isAdmin = MedApp.Auth.isAdmin();

      const badge = document.getElementById('userBadge');
      badge.textContent = session.name + (isAdmin ? ' (Admin)' : '');

      const logoutBtn = document.getElementById('logoutBtn');
      logoutBtn.style.display = isAdmin ? '' : 'inline-flex';

      document.querySelectorAll('.nav-admin').forEach(btn => {
        btn.style.display = isAdmin ? '' : 'none';
      });

      logoutBtn.addEventListener('click', () => {
        MedApp.Auth.logout();
        App.showLogin();
      });

      MedApp.Store.syncFromServer().then(() => {
        App.bindNav();
        App.navigateFromHash();
        App.updateStatus();
      });
    },

    bindNav() {
      document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', () => {
          const view = btn.getAttribute('data-view');
          if (!MedApp.Auth.canViewModule(view)) {
            MedApp.Utils.toast('No tiene permisos para acceder a este módulo.', 'error');
            return;
          }
          App.navigate(view);
        });
      });

      window.addEventListener('hashchange', () => App.navigateFromHash());

      const hamburger = document.getElementById('hamburgerBtn');
      const mainNav = document.getElementById('mainNav');
      if (hamburger && mainNav) {
        hamburger.addEventListener('click', () => {
          const isOpen = mainNav.classList.toggle('is-open');
          hamburger.setAttribute('aria-expanded', String(isOpen));
        });
        mainNav.querySelectorAll('.nav-link').forEach(btn => {
          btn.addEventListener('click', () => {
            mainNav.classList.remove('is-open');
            hamburger.setAttribute('aria-expanded', 'false');
          });
        });
      }

      MedApp.Events.on('data-changed', () => {
        App.updateStatus();
        App.render();
      });
    },

    navigate(view) {
      if (!MedApp.Views[view]) view = 'dashboard';
      if (!MedApp.Auth.canViewModule(view)) {
        MedApp.Utils.toast('No tiene permisos para acceder a este módulo.', 'error');
        return;
      }
      MedApp.State.set({ view });
      const hash = '#/' + view;
      if (window.location.hash !== hash) {
        try { history.replaceState(null, '', hash); } catch (e) { /* noop */ }
      }
      App.render();
      document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.toggle('is-active', btn.getAttribute('data-view') === view);
      });
    },

    navigateFromHash() {
      const hash = window.location.hash.replace(/^#\/?/, '');
      let view = hash && MedApp.Views[hash] ? hash : 'dashboard';
      if (!MedApp.Auth.canViewModule(view)) {
        view = 'dashboard';
      }
      App.navigate(view);
    },

    render() {
      const view = MedApp.State.get().view || 'dashboard';
      if (!MedApp.Views[view]) return;
      if (MedApp.Lifecycle) MedApp.Lifecycle.beforeMount(view);
      MedApp.Views[view].mount(App.appEl);
      if (MedApp.Lifecycle) MedApp.Lifecycle.afterMount(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    updateStatus() {
      const el = document.getElementById('dataStatus');
      if (!el) return;
      const meta = MedApp.Store.getMeta();
      const records = MedApp.Store.getRecords().length;
      const txt = `● ${MedApp.Utils.fmtExact(meta.totalGlobal)} estudios · ${MedApp.Utils.fmtExact(records)} registros · sincronizado con servidor`;
      el.innerHTML = '<span class="status-dot"></span>' + txt;
    }
  };

  MedApp.App = App;

  document.addEventListener('DOMContentLoaded', () => App.init());

})(window);

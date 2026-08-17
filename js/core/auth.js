/* ==========================================================================
   auth.js — Sistema de autenticación y control de acceso
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const AUTH_KEY = 'medanalytics.auth';
  const USERS_KEY = 'medanalytics.users';

  const DEFAULT_USERS = [
    { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' },
    { username: 'usuario', password: 'usuario123', role: 'standard', name: 'Usuario Estándar' }
  ];

  const Auth = {

    init() {
      let users = null;
      try {
        const raw = localStorage.getItem(USERS_KEY);
        if (raw) users = JSON.parse(raw);
      } catch (e) { /* noop */ }

      if (!users || !Array.isArray(users) || users.length === 0) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
        users = DEFAULT_USERS;
      }
      return users;
    },

    getUsers() {
      try {
        const raw = localStorage.getItem(USERS_KEY);
        return raw ? JSON.parse(raw) : DEFAULT_USERS;
      } catch (e) {
        return DEFAULT_USERS;
      }
    },

    login(username, password) {
      const users = Auth.getUsers();
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        const session = { username: user.username, role: user.role, name: user.name, loginAt: Date.now() };
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
        return { success: true, user: session };
      }
      return { success: false, error: 'Credenciales incorrectas' };
    },

    logout() {
      localStorage.removeItem(AUTH_KEY);
    },

    getSession() {
      try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    isLoggedIn() {
      return Auth.getSession() !== null;
    },

    getRole() {
      const session = Auth.getSession();
      return session ? session.role : null;
    },

    isAdmin() {
      return Auth.getRole() === 'admin';
    },

    canEdit() {
      return Auth.isAdmin();
    },

    canViewModule(view) {
      if (Auth.isAdmin()) return true;
      const readOnly = ['dashboard', 'explorer', 'clients', 'modalities', 'finance'];
      return readOnly.includes(view);
    }
  };

  MedApp.Auth = Auth;

})(window);

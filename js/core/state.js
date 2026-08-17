/* ==========================================================================
   state.js — Estado global de la aplicación + bus de eventos
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const _listeners = {};

  const Events = {
    on(event, fn) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(fn);
    },
    emit(event, payload) {
      (_listeners[event] || []).slice().forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } });
    }
  };
  MedApp.Events = Events;

  const DEFAULT_STATE = {
    view: 'dashboard',
    year: 2026,
    month: 'all',          // 'all' o 1..12
    modality: 'all',       // 'all' o código
    search: '',
    totalsOnly: false,   // Explorador: mostrar solo columna Total
    client: null,          // nombre del cliente seleccionado
    clientYear: 2026,
    page: 1,
    pageSize: 10,
    sort: { key: 'total', dir: 'desc' },
    theme: 'light'
  };

  const state = Object.assign({}, DEFAULT_STATE);

  const State = {
    get() { return state; },

    set(patch) {
      Object.assign(state, patch);
      Events.emit('change', state);
    },

    reset() {
      const keep = { theme: state.theme };
      Object.assign(state, DEFAULT_STATE, keep);
      Events.emit('change', state);
    }
  };

  MedApp.State = State;

})(window);

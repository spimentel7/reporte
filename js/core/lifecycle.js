/* ==========================================================================
   lifecycle.js — Gestión del ciclo de vida de vistas y gráficos
   Asegura destrucción de charts antes de montar nueva vista.
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const Lifecycle = {
    _currentView: null,

    beforeMount(viewName) {
      if (MedApp.Charts && MedApp.Charts.destroyAll) {
        MedApp.Charts.destroyAll();
      }
      this._currentView = viewName;
    },

    afterMount(viewName) {
      this._currentView = viewName;
    },

    getCurrentView() {
      return this._currentView;
    }
  };

  MedApp.Lifecycle = Lifecycle;

})(window);

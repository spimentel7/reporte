/* ==========================================================================
   filters.js — Aplicación de filtros combinables (año, mes, modalidad, búsqueda)
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  MedApp.Filters = {
    /**
     * Filtra el dataset completo.
     * opts: { year, month, modality, search }
     *  - year: número o null
     *  - month: 'all' | 1..12
     *  - modality: 'all' | código
     *  - search: texto (nombre de cliente)
     */
    apply(records, opts) {
      const o = opts || {};
      const needle = MedApp.Utils.slugify(o.search || '');

      return records.filter(r => {
        if (o.year != null && r.year !== o.year) return false;
        if (o.month && o.month !== 'all' && r.month !== o.month) return false;
        if (o.modality && o.modality !== 'all' && r.modality !== o.modality) return false;
        if (needle && MedApp.Utils.slugify(r.client).indexOf(needle) === -1) return false;
        return true;
      });
    }
  };

})(window);

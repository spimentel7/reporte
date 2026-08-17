/* ==========================================================================
   queries.js — Agregaciones y consultas sobre el dataset
   Todas las funciones reciben `records` (array plano) y devuelven estructuras
   listas para renderizar.
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const Q = {
    sum(records) {
      let t = 0;
      for (const r of records) t += r.studies;
      return t;
    },

    sumByYear(records) {
      const out = {};
      for (const r of records) out[r.year] = (out[r.year] || 0) + r.studies;
      return out;
    },

    /* Totales por mes (array 1..12, meses vacíos = 0) para un año dado */
    monthlyTotals(records, year) {
      const out = new Array(12).fill(0);
      for (const r of records) {
        if (year != null && r.year !== year) continue;
        out[r.month - 1] += r.studies;
      }
      return out;
    },

    /* Para superposición: total por mes de cada año. Devuelve { year: [12] } */
    monthlyByYear(records, years) {
      const out = {};
      (years || MedApp.Utils.YEARS).forEach(y => {
        out[y] = new Array(12).fill(0);
      });
      for (const r of records) {
        if (out[r.year]) out[r.year][r.month - 1] += r.studies;
      }
      return out;
    },

    /* Suma por cliente. Devuelve array [{ client, total }] desc. Filtra por año opcional. */
    byClient(records, year) {
      const map = {};
      for (const r of records) {
        if (year != null && r.year !== year) continue;
        map[r.client] = (map[r.client] || 0) + r.studies;
      }
      return Object.keys(map)
        .map(client => ({ client, total: map[client] }))
        .sort((a, b) => b.total - a.total);
    },

    /* Suma por modalidad. Devuelve [{ modality, total }] desc. */
    byModality(records, year) {
      const map = {};
      for (const r of records) {
        if (year != null && r.year !== year) continue;
        map[r.modality] = (map[r.modality] || 0) + r.studies;
      }
      return MedApp.Generator.MODALITIES
        .map(modality => ({ modality, total: map[modality] || 0 }))
        .filter(x => x.total > 0)
        .sort((a, b) => b.total - a.total);
    },

    topClient(records, year) {
      return Q.byClient(records, year)[0] || null;
    },

    topModality(records, year) {
      return Q.byModality(records, year)[0] || null;
    },

    /* Distribución de modalidades para un cliente (pie). Año opcional. */
    clientModalityDist(records, client, year) {
      const map = {};
      for (const r of records) {
        if (r.client !== client) continue;
        if (year != null && r.year !== year) continue;
        map[r.modality] = (map[r.modality] || 0) + r.studies;
      }
      return MedApp.Generator.MODALITIES
        .map(modality => ({ modality, total: map[modality] || 0 }))
        .filter(x => x.total > 0)
        .sort((a, b) => b.total - a.total);
    },

    /* Total anual por cliente (barra año contra año) */
    clientYearly(records, client) {
      const map = {};
      for (const r of records) {
        if (r.client !== client) continue;
        map[r.year] = (map[r.year] || 0) + r.studies;
      }
      return MedApp.Utils.YEARS
        .map(year => ({ year, total: map[year] || 0 }));
    },

    /* Comportamiento mensual de un cliente para un año */
    clientMonthly(records, client, year) {
      const out = new Array(12).fill(0);
      for (const r of records) {
        if (r.client !== client) continue;
        if (year != null && r.year !== year) continue;
        out[r.month - 1] += r.studies;
      }
      return out;
    },

    /* Ingresos proyectados: estudios * tarifa por mes para un año */
    revenueByMonth(records, rates, year) {
      const out = new Array(12).fill(0);
      for (const r of records) {
        if (year != null && r.year !== year) continue;
        const rate = rates[r.client] != null ? rates[r.client] : 0;
        out[r.month - 1] += r.studies * rate;
      }
      return out;
    },

    /* Ingresos por cliente para un año */
    revenueByClient(records, rates, year) {
      const map = {};
      for (const r of records) {
        if (year != null && r.year !== year) continue;
        const rate = rates[r.client] != null ? rates[r.client] : 0;
        map[r.client] = (map[r.client] || 0) + r.studies * rate;
      }
      return Object.keys(map)
        .map(client => ({ client, revenue: map[client] }))
        .sort((a, b) => b.revenue - a.revenue);
    },

    /* Modo: total mensual por modalidad (apilado) para un año */
    monthlyByModality(records, year, modalities) {
      const mods = modalities || MedApp.Generator.MODALITIES;
      const out = {};
      mods.forEach(m => { out[m] = new Array(12).fill(0); });
      for (const r of records) {
        if (year != null && r.year !== year) continue;
        if (out[r.modality]) out[r.modality][r.month - 1] += r.studies;
      }
      return out;
    }
  };

  MedApp.Queries = Q;

})(window);

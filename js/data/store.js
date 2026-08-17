/* ==========================================================================
   store.js — Persistencia en localStorage + lógica de ingesta/actualización
   La base local se expande mes a mes sin romper los gráficos.
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};
  const STORAGE_KEY = 'medanalytics.data.v2';
  const STORAGE_VERSION = 2;

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* Dataset base: los datos reales extraídos del Excel cuando están disponibles,
     y solo se cae al simulador si realdataset.js no se cargó. */
  function seedData() {
    if (global.MedApp.RealData && Array.isArray(global.MedApp.RealData.records)) {
      const data = deepClone(global.MedApp.RealData);
      data.version = STORAGE_VERSION;
      return refreshMeta(data);
    }
    return MedApp.Generator.generate();
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.records) && data.version >= 1) return data;
      }
    } catch (e) {
      console.warn('[store] No se pudo leer localStorage:', e);
    }
    return null;
  }

  function persist(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[store] No se pudo guardar en localStorage:', e);
      return false;
    }
  }

  function refreshMeta(data) {
    const meta = { totalsByYear: {}, totalGlobal: 0 };
    for (const r of data.records) {
      meta.totalsByYear[r.year] = (meta.totalsByYear[r.year] || 0) + r.studies;
      meta.totalGlobal += r.studies;
    }
    data.meta = meta;
    return data;
  }

  const Store = {

    init() {
      let data = load();
      if (!data) {
        data = seedData();
        persist(data);
        console.log('[store] Dataset inicial cargado y guardado en localStorage.');
      }
      return data;
    },

    async syncFromServer() {
      try {
        const resp = await fetch('/api/records');
        const result = await resp.json();
        if (result.records && result.records.length > 0) {
          const data = {
            version: STORAGE_VERSION,
            records: result.records,
            rates: result.rates || {},
            meta: {}
          };
          MedApp.__data = refreshMeta(data);
          persist(MedApp.__data);
          console.log('[store] Datos sincronizados desde servidor: ' + result.records.length + ' registros.');
          return true;
        }
      } catch (err) {
        console.warn('[store] No se pudo sincronizar desde servidor:', err);
      }
      return false;
    },

    getData() {
      const cached = MedApp.__data;
      if (cached) return cached;
      MedApp.__data = MedApp.Store.init();
      return MedApp.__data;
    },

    /* Actualiza en memoria y persiste */
    _commit(data) {
      MedApp.__data = refreshMeta(data);
      persist(MedApp.__data);
      return MedApp.__data;
    },

    /**
     * Ingesta/actualización por lote (upsert por año+mes+cliente+modalidad).
     * Devuelve { added, updated, skipped, total }
     */
    upsert(newRecords) {
      const data = MedApp.Store.getData();
      const index = new Map();
      data.records.forEach((r, i) => index.set(`${r.year}|${r.month}|${r.client}|${r.modality}`, i));

      let added = 0, updated = 0, skipped = 0;
      for (const rec of newRecords) {
        const key = `${rec.year}|${rec.month}|${rec.client}|${rec.modality}`;
        const studies = Math.max(0, Math.round(Number(rec.studies) || 0));
        if (index.has(key)) {
          if (studies === data.records[index.get(key)].studies) {
            skipped++;
          } else {
            data.records[index.get(key)].studies = studies;
            updated++;
          }
        } else {
          data.records.push({ year: rec.year, month: rec.month, client: rec.client, modality: rec.modality, studies });
          index.set(key, data.records.length - 1);
          added++;
        }
      }
      MedApp.Store._commit(data);
      return { added, updated, skipped, total: added + updated };
    },

    setRates(rates) {
      const data = MedApp.Store.getData();
      let changed = false;
      for (const [client, rate] of Object.entries(rates)) {
        const v = parseFloat(rate);
        if (!isNaN(v) && v >= 0) {
          data.rates[client] = Math.round(v * 100) / 100;
          changed = true;
        }
      }
      if (changed) MedApp.Store._commit(data);
      return changed;
    },

    reset() {
      localStorage.removeItem(STORAGE_KEY);
      MedApp.__data = seedData();
      persist(MedApp.__data);
      return MedApp.__data;
    },

    getRecords() {
      return MedApp.Store.getData().records;
    },

    getRates() {
      return MedApp.Store.getData().rates;
    },

    getMeta() {
      return MedApp.Store.getData().meta;
    },

    toCSV() {
      const rows = [['Anio', 'Mes', 'Cliente', 'Modalidad', 'Estudios']];
      for (const r of MedApp.Store.getRecords()) {
        rows.push([r.year, r.month, r.client, r.modality, r.studies]);
      }
      return rows;
    },

    /* ---------- CRUD para Gestión de Datos ---------- */

    addRecord(rec) {
      const data = MedApp.Store.getData();
      const studies = Math.max(0, Math.round(Number(rec.studies) || 0));
      if (!rec.year || !rec.month || !rec.client || !rec.modality || studies <= 0) {
        return { success: false, error: 'Faltan campos obligatorios o estudios <= 0.' };
      }
      const key = `${rec.year}|${rec.month}|${rec.client}|${rec.modality}`;
      const index = new Map();
      data.records.forEach((r, i) => index.set(`${r.year}|${r.month}|${r.client}|${r.modality}`, i));
      if (index.has(key)) {
        data.records[index.get(key)].studies = studies;
      } else {
        data.records.push({ year: rec.year, month: rec.month, client: rec.client, modality: rec.modality, studies });
      }
      MedApp.Store._commit(data);
      MedApp.Events.emit('data-changed');
      return { success: true, action: index.has(key) ? 'updated' : 'added' };
    },

    updateRecord(index, patch) {
      const data = MedApp.Store.getData();
      if (index < 0 || index >= data.records.length) {
        return { success: false, error: 'Índice fuera de rango.' };
      }
      if (patch.studies != null) {
        data.records[index].studies = Math.max(0, Math.round(Number(patch.studies) || 0));
      }
      if (patch.year != null) data.records[index].year = patch.year;
      if (patch.month != null) data.records[index].month = patch.month;
      if (patch.client != null) data.records[index].client = patch.client;
      if (patch.modality != null) data.records[index].modality = patch.modality;
      MedApp.Store._commit(data);
      MedApp.Events.emit('data-changed');
      return { success: true };
    },

    deleteRecords(indices) {
      const data = MedApp.Store.getData();
      const sorted = Array.from(indices).sort((a, b) => b - a);
      let deleted = 0;
      for (const i of sorted) {
        if (i >= 0 && i < data.records.length) {
          data.records.splice(i, 1);
          deleted++;
        }
      }
      if (deleted > 0) {
        MedApp.Store._commit(data);
        MedApp.Events.emit('data-changed');
      }
      return { success: true, deleted };
    },

    getClientNames() {
      const data = MedApp.Store.getData();
      const names = new Set();
      data.records.forEach(r => names.add(r.client));
      return Array.from(names).sort();
    }
  };

  MedApp.Store = Store;

})(window);

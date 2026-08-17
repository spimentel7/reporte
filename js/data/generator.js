/* ==========================================================================
   generator.js — Generador determinístico del dataset simulado inicial
   Estructura: por año, mes, cliente y modalidad -> volumen de estudios.
   Totales exactos por año:
     2023 -> 94,610  |  2024 -> 150,593  |  2025 -> 219,320  |  2026 -> 142,125 (parcial, Ene-Jul)
     Global -> 606,648
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const SEED = 20260811;
  const YEAR_TARGETS = { 2023: 94610, 2024: 150593, 2025: 219320, 2026: 142125 };
  const PARTIAL_MONTHS_2026 = 7; // 2026 acumulado hasta Julio

  const MODALITIES = ['CR', 'CT', 'DX', 'MG', 'US', 'MR', 'DXA', 'OT', 'XA'];

  const SEASONAL = [0.96, 0.94, 1.02, 1.00, 1.04, 1.06, 0.98, 0.95, 1.00, 1.05, 1.07, 0.98];

  const DEFAULT_PROFILE = { CR: 0.32, CT: 0.16, DX: 0.18, MG: 0.09, US: 0.12, MR: 0.06, DXA: 0.02, OT: 0.02, XA: 0.03 };

  const PROFILES = {
    'TAC Helimed':                { CT: 0.52, MR: 0.22, DX: 0.10, CR: 0.08, US: 0.04, MG: 0.02, XA: 0.02, DXA: 0.00, OT: 0.00 },
    'Unifemme':                   { US: 0.34, MG: 0.22, DX: 0.18, CR: 0.10, MR: 0.06, CT: 0.05, OT: 0.03, DXA: 0.02, XA: 0.00 },
    'Vista California':           { DX: 0.34, CT: 0.20, US: 0.16, CR: 0.12, MG: 0.08, MR: 0.05, DXA: 0.02, XA: 0.02, OT: 0.01 },
    'Hospital San Antonio de Táriba': { CR: 0.40, DX: 0.20, US: 0.15, CT: 0.10, MG: 0.06, MR: 0.03, DXA: 0.02, XA: 0.02, OT: 0.02 },
    'U.I. del Caribe':            { CR: 0.30, DX: 0.22, US: 0.18, CT: 0.12, MG: 0.08, MR: 0.05, DXA: 0.02, XA: 0.02, OT: 0.01 },
    'CEMO':                       { CT: 0.30, MR: 0.18, US: 0.16, DX: 0.12, CR: 0.10, MG: 0.06, XA: 0.03, OT: 0.03, DXA: 0.02 },
    'Centro de Imágenes Carora':  { CR: 0.30, DX: 0.24, US: 0.14, CT: 0.12, MG: 0.08, MR: 0.05, DXA: 0.02, XA: 0.02, OT: 0.03 },
    'Lara Salud':                 { CT: 0.24, CR: 0.20, DX: 0.20, US: 0.14, MR: 0.08, MG: 0.06, XA: 0.03, DXA: 0.02, OT: 0.03 },
    'Imágenes Médicas Carupano':  { CR: 0.34, DX: 0.22, US: 0.16, MG: 0.08, CT: 0.08, MR: 0.04, DXA: 0.02, XA: 0.02, OT: 0.04 },
    'DISI':                       { CT: 0.28, DX: 0.20, US: 0.14, CR: 0.12, MR: 0.10, MG: 0.08, XA: 0.03, DXA: 0.03, OT: 0.02 },
    'Asociación Civil Federico Ozanam': { CR: 0.30, DX: 0.20, US: 0.16, CT: 0.14, MG: 0.08, MR: 0.05, XA: 0.03, DXA: 0.02, OT: 0.02 },
    'Centro Clínico Familia':     { US: 0.24, CR: 0.22, DX: 0.18, CT: 0.12, MG: 0.10, MR: 0.06, DXA: 0.03, XA: 0.03, OT: 0.02 }
  };

  const CLIENTS = [
    { name: 'Asociación Civil Federico Ozanam', weight: 0.150, rate: 0.90 },
    { name: 'Centro Clínico Familia',           weight: 0.085, rate: 1.10 },
    { name: 'CEMO',                             weight: 0.080, rate: 1.25 },
    { name: 'Vista California',                 weight: 0.072, rate: 1.20 },
    { name: 'DISI',                             weight: 0.066, rate: 1.20 },
    { name: 'TAC Helimed',                      weight: 0.060, rate: 1.30 },
    { name: 'SISMED',                           weight: 0.055, rate: 1.05 },
    { name: 'Hospital San Antonio de Táriba',   weight: 0.052, rate: 0.84 },
    { name: 'Lara Salud',                       weight: 0.048, rate: 0.95 },
    { name: 'Imágenes Médicas Carupano',        weight: 0.042, rate: 0.88 },
    { name: 'EVALUEX',                          weight: 0.038, rate: 1.00 },
    { name: 'Lancaster',                        weight: 0.035, rate: 1.15 },
    { name: 'Los Cedros',                       weight: 0.032, rate: 1.10 },
    { name: 'CIMED',                            weight: 0.030, rate: 0.92 },
    { name: 'U.I. del Caribe',                  weight: 0.028, rate: 1.35 },
    { name: 'Unifemme',                         weight: 0.026, rate: 1.40 },
    { name: 'C.M. Valle de San Diego',          weight: 0.024, rate: 0.98 },
    { name: 'Centro de Imágenes Carora',        weight: 0.022, rate: 0.85 },
    { name: 'DiagnoMed',                        weight: 0.020, rate: 1.05 },
    { name: 'Venemergencias',                   weight: 0.018, rate: 1.28 }
  ];

  /* PRNG determinístico (mulberry32) */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Distribuye `total` en `n` enteros proporcionales a `weights` (suma exacta) */
  function distributeInteger(total, weights) {
    const n = weights.length;
    if (n === 0) return [];
    if (total <= 0) return new Array(n).fill(0);
    const sumW = weights.reduce((a, b) => a + b, 0) || 1;
    const raw = weights.map(w => (total * w) / sumW);
    const out = raw.map(Math.floor);
    let rem = total - out.reduce((a, b) => a + b, 0);
    const order = raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac || b.i - a.i);
    for (let k = 0; k < rem; k++) out[order[k % n].i] += 1;
    return out;
  }

  function buildProfile(clientName) {
    const base = PROFILES[clientName] || DEFAULT_PROFILE;
    const profile = {};
    const sum = MODALITIES.reduce((acc, m) => acc + (base[m] != null ? base[m] : DEFAULT_PROFILE[m] || 0), 0) || 1;
    MODALITIES.forEach(m => {
      profile[m] = (base[m] != null ? base[m] : DEFAULT_PROFILE[m] || 0) / sum;
    });
    return profile;
  }

  function generate() {
    const rnd = mulberry32(SEED);
    const records = [];
    const rates = {};
    const meta = { totalsByYear: {}, totalGlobal: 0, generatedAt: Date.now() };

    const totalWeight = CLIENTS.reduce((a, c) => a + c.weight, 0);
    const clientYearWeights = CLIENTS.map(c => c.weight / totalWeight);

    for (const year of [2023, 2024, 2025, 2026]) {
      const target = YEAR_TARGETS[year];
      const months = year === 2026 ? PARTIAL_MONTHS_2026 : 12;
      const seasonSlice = SEASONAL.slice(0, months);
      const seasonSum = seasonSlice.reduce((a, b) => a + b, 0);

      // Cliente -> total anual (exacto)
      const clientTargets = distributeInteger(target, clientYearWeights);

      CLIENTS.forEach((client, ci) => {
        if (!(client.name in rates)) rates[client.name] = client.rate;
        const profile = buildProfile(client.name);

        // Mes -> total anual del cliente (exacto, con ruido estacional por cliente)
        const monthNoise = seasonSlice.map((s, i) => {
          const f = 1 + (rnd() - 0.5) * 0.16;
          return s * f * (0.94 + (ci % 5) * 0.03);
        });
        const monthlyTotals = distributeInteger(clientTargets[ci], monthNoise);

        monthlyTotals.forEach((monthTotal, mi) => {
          const month = mi + 1;
          if (monthTotal <= 0) return;

          // Modalidad -> total mensual del cliente (exacto, con ruido)
          const modNoise = MODALITIES.map(() => 1 + (rnd() - 0.5) * 0.34);
          const modWeights = MODALITIES.map(m => profile[m] * modNoise[MODALITIES.indexOf(m)]);
          const modTotals = distributeInteger(monthTotal, modWeights);

          modTotals.forEach((studies, i) => {
            if (studies <= 0) return;
            records.push({
              year, month,
              client: client.name,
              modality: MODALITIES[i],
              studies
            });
          });
        });
      });

      const yearSum = records.filter(r => r.year === year).reduce((a, r) => a + r.studies, 0);
      meta.totalsByYear[year] = yearSum;
      meta.totalGlobal += yearSum;
    }

    return {
      version: 1,
      meta,
      rates,
      records
    };
  }

  MedApp.Generator = {
    CLIENTS,
    MODALITIES,
    YEAR_TARGETS,
    buildProfile,
    generate
  };

})(window);

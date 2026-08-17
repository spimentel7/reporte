/* ==========================================================================
   modalities.js — Análisis por modalidad de estudio
   Barras horizontales · crecimiento · desglose mensual apilado
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const Views = MedApp.Views = MedApp.Views || {};

  Views.modalities = {

    mount(container) {
      MedApp.Lifecycle.beforeMount('modalities');
      container.innerHTML = `
        <div class="flex-between mb-16">
          <div>
            <h1>Análisis por modalidad</h1>
            <p class="muted">Clasificación de los estudios más utilizados a nivel global o por año.</p>
          </div>
          <div class="field">
            <label class="label" for="modYear">Período</label>
            <select id="modYear" class="control"></select>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-head">
              <h3 class="card-title">Modalidades más utilizadas</h3>
              <span class="badge badge-neutral" id="modCount">—</span>
            </div>
            <div class="chart-box"><canvas id="chartModH"></canvas></div>
          </div>
          <div class="card">
            <div class="card-head">
              <h3 class="card-title">Crecimiento vs. año anterior</h3>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th style="text-align:left">Modalidad</th><th id="modCurHead">2025</th><th id="modPrevHead">2024</th><th>Crecimiento</th></tr></thead>
                <tbody id="modGrowthBody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card mt-16">
          <div class="card-head">
            <h3 class="card-title">Desglose mensual por modalidad</h3>
            <span class="badge badge-neutral" id="modStackHead">—</span>
          </div>
          <div class="chart-box"><canvas id="chartModStack"></canvas></div>
        </div>
      `;

      const state = MedApp.State.get();
      const sel = container.querySelector('#modYear');
      const addOpt = (v, l, selYear) => {
        const op = document.createElement('option');
        op.value = v; op.textContent = l;
        if (selYear === v) op.selected = true;
        sel.appendChild(op);
      };
      addOpt('all', 'Global (2023–2026)', state.year == null ? 'all' : state.year);
      MedApp.Utils.YEARS.forEach(y => addOpt(String(y), String(y), state.year));

      sel.addEventListener('change', () => {
        MedApp.State.set({ year: sel.value === 'all' ? null : parseInt(sel.value, 10) });
        Views.modalities.mount(container);
      });

      Views.modalities._render(container);
      MedApp.Lifecycle.afterMount('modalities');
    },

    _render(container) {
      const state = MedApp.State.get();
      const year = state.year;
      const records = MedApp.Store.getRecords();

      const mods = MedApp.Queries.byModality(records, year);
      const maxV = mods[0] ? mods[0].total : 0;
      document.getElementById('modCount').textContent = mods.length + ' modalidades activas';

      // Barras horizontales
      MedApp.Charts.create('chartModH', {
        type: 'bar',
        data: {
          labels: mods.map(m => m.modality),
          datasets: [{
            label: 'Estudios',
            data: mods.map(m => m.total),
            backgroundColor: mods.map((_, i) => MedApp.Charts.color(i) + 'cc'),
            hoverBackgroundColor: mods.map((_, i) => MedApp.Charts.color(i)),
            borderRadius: 6,
            maxBarThickness: 26
          }]
        },
        options: {
          indexAxis: 'y',
          plugins: {
            tooltip: {
              callbacks: {
                title: (items) => 'Modalidad ' + items[0].label,
                label: (ctx) => {
                  const pct = maxV ? (ctx.parsed.x / maxV) * 100 : 0;
                  return ' ' + MedApp.Utils.fmtExact(ctx.parsed.x) + ' estudios · ' + MedApp.Utils.fmtPct(pct) + ' del líder';
                }
              }
            }
          },
          scales: {
            x: { beginAtZero: true, grid: { color: MedApp.Charts.gridColor() }, ticks: { callback: v => MedApp.Utils.fmt(v) } },
            y: { grid: { display: false } }
          }
        }
      });

      // Tabla de crecimiento
      const curYear = year == null ? 2025 : year;
      const prevYear = curYear - 1;
      document.getElementById('modCurHead').textContent = 'Año ' + curYear;
      document.getElementById('modPrevHead').textContent = 'Año ' + prevYear;

      const cur = MedApp.Queries.byModality(records, curYear);
      const prev = MedApp.Queries.byModality(records, prevYear);
      const prevMap = {};
      prev.forEach(p => { prevMap[p.modality] = p.total; });

      document.getElementById('modGrowthBody').innerHTML = cur.map((m, i) => {
        const p = prevMap[m.modality] || 0;
        const g = MedApp.Utils.pctGrowth(m.total, p);
        const gClass = g == null ? 'badge-neutral' : (g >= 0 ? 'badge-up' : 'badge-down');
        const gText = g == null ? 'n/a' : MedApp.Utils.fmtPct(g, true);
        return `
          <tr>
            <td><span class="chip">${m.modality}</span></td>
            <td><b>${MedApp.Utils.fmtExact(m.total)}</b></td>
            <td>${MedApp.Utils.fmtExact(p)}</td>
            <td><span class="badge ${gClass}">${gText}</span></td>
          </tr>`;
      }).join('');

      // Apilado mensual
      document.getElementById('modStackHead').textContent = year == null ? 'Global (promedio mensual por año)' : 'Año ' + year;

      const monthlyByMod = MedApp.Queries.monthlyByModality(records, year, mods.slice(0, 9).map(m => m.modality));
      const datasets = mods.slice(0, 9).map((m, i) => ({
        label: m.modality,
        data: monthlyByMod[m.modality],
        backgroundColor: MedApp.Charts.color(i) + 'cc',
        borderColor: MedApp.Charts.color(i),
        borderWidth: 1,
        stack: 'stack'
      }));
      MedApp.Charts.create('chartModStack', {
        type: 'bar',
        data: { labels: MedApp.Utils.MONTHS_SHORT, datasets },
        options: {
          scales: MedApp.Charts.intY(),
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } }
        }
      });
    }
  };

})(window);

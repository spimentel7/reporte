/* ==========================================================================
   dashboard.js — Panel principal: KPIs + evolución mensual + comparativo anual
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const Views = MedApp.Views = MedApp.Views || {};

  Views.dashboard = {

    _last: null,

    mount(container) {
      MedApp.Lifecycle.beforeMount('dashboard');
      container.innerHTML = `
        <div class="flex-between mb-16">
          <div>
            <h1>Panel General</h1>
            <p class="muted">Resumen y evolución del volumen de estudios médicos por centro clínico.</p>
          </div>
          <div class="field">
            <label class="label" for="dashYear">Año de análisis</label>
            <select id="dashYear" class="control"></select>
          </div>
        </div>

        <div class="grid grid-4" id="kpiGrid"></div>

        <div class="grid grid-2 mt-16">
          <div class="card">
            <div class="card-head">
              <div>
                <h3 class="card-title">Evolución mensual de estudios</h3>
                <p class="card-sub">Volumen de estudios mes a mes en <strong id="dashYearLbl"></strong></p>
              </div>
              <span class="badge badge-primary" id="dashMonthAvg">—</span>
            </div>
            <div class="chart-box"><canvas id="chartDashMonthly"></canvas></div>
          </div>
          <div class="card">
            <div class="card-head">
              <div>
                <h3 class="card-title">Comparativo anual · estacionalidad</h3>
                <p class="card-sub">Líneas superpuestas de los 4 años (2026: datos parciales a Julio)</p>
              </div>
            </div>
            <div class="chart-box"><canvas id="chartDashOverlay"></canvas></div>
          </div>
        </div>

        <div class="grid grid-2 mt-16">
          <div class="card">
            <div class="card-head">
              <h3 class="card-title">Top 5 clientes · <span id="dashTopYear"></span></h3>
              <span class="badge badge-neutral">por volumen</span>
            </div>
            <div id="dashTopClients"></div>
          </div>
          <div class="card">
            <div class="card-head">
              <h3 class="card-title">Modalidades más solicitadas · <span id="dashModYear"></span></h3>
              <span class="badge badge-neutral">% del total</span>
            </div>
            <div id="dashModList"></div>
          </div>
        </div>
      `;

      const state = MedApp.State.get();
      const select = container.querySelector('#dashYear');
      MedApp.Utils.YEARS.forEach(y => {
        const op = document.createElement('option');
        op.value = y;
        op.textContent = y;
        if (y === state.year) op.selected = true;
        select.appendChild(op);
      });
      select.addEventListener('change', () => {
        MedApp.State.set({ year: parseInt(select.value, 10) });
        Views.dashboard.mount(container);
      });

      Views.dashboard._render();
    },

    _render() {
      const state = MedApp.State.get();
      const records = MedApp.Store.getRecords();
      const meta = MedApp.Store.getMeta();
      const year = state.year;

      document.getElementById('dashYearLbl').textContent = year;
      document.getElementById('dashTopYear').textContent = year;
      document.getElementById('dashModYear').textContent = year;

      // ---------- KPIs ----------
      const prevYear = year - 1;
      const prevTotal = meta.totalsByYear[prevYear] || 0;
      const yearTotal = meta.totalsByYear[year] || 0;
      const growth = MedApp.Utils.pctGrowth(yearTotal, prevTotal);
      const monthly = MedApp.Queries.monthlyTotals(records, year);

      // Último mes con datos cargados del año seleccionado
      let lastMonth = 0;
      for (let i = 11; i >= 0; i--) {
        if (monthly[i] > 0) { lastMonth = i + 1; break; }
      }
      const lastMonthTotal = lastMonth ? monthly[lastMonth - 1] : 0;
      const prevMonthTotal = lastMonth > 1 ? monthly[lastMonth - 2] : 0;
      const monthGrowth = prevMonthTotal > 0 ? MedApp.Utils.pctGrowth(lastMonthTotal, prevMonthTotal) : null;
      const avgMonth = lastMonth > 0 ? yearTotal / lastMonth : 0;

      const kpiHtml = `
        ${MedApp.UI.kpiCard(`Estudios en ${lastMonth ? MedApp.Utils.monthLong(lastMonth).toLowerCase() : '—'} · ${year}`, MedApp.Utils.fmtExact(lastMonthTotal), lastMonth ? 'Último mes con datos cargados' : '', lastMonth ? `<span class="flex gap-8"><span class="badge badge-primary">${MedApp.Utils.fmtExact(lastMonthTotal)} estudios</span></span>` : '')}
        ${MedApp.UI.kpiCard('Comparación con mes anterior', monthGrowth == null ? '—' : MedApp.Utils.fmtPct(monthGrowth, true),
          prevMonthTotal > 0 ? `vs. ${MedApp.Utils.monthLong(lastMonth - 1)} (${MedApp.Utils.fmtExact(prevMonthTotal)} estudios)` : '',
          MedApp.UI.growthBadge(monthGrowth))}
        ${MedApp.UI.kpiCard(`Estudios en ${year}`, MedApp.Utils.fmtExact(yearTotal),
          growth == null ? '—' : `vs. ${prevYear} (${MedApp.Utils.fmtExact(prevTotal)} estudios)`,
          MedApp.UI.growthBadge(growth))}
        ${MedApp.UI.kpiCard('Total histórico', MedApp.Utils.fmtExact(meta.totalGlobal), 'Estudios 2023–2026', `<span class="flex gap-8">${MedApp.Utils.YEARS.map(y => `<span>${y}: <b>${MedApp.Utils.fmt(meta.totalsByYear[y] || 0)}</b></span>`).join('')}</span>`)}
      `;
      document.getElementById('kpiGrid').innerHTML = kpiHtml;
      document.getElementById('dashMonthAvg').textContent = 'Promedio mensual: ' + MedApp.Utils.fmt(avgMonth);

      // ---------- Gráfico: evolución mensual ----------
      const prevMonthly = year > 2023 ? MedApp.Queries.monthlyTotals(records, prevYear) : null;

      MedApp.Charts.create('chartDashMonthly', {
        type: 'bar',
        data: {
          labels: MedApp.Utils.MONTHS_SHORT,
          datasets: [{
            label: 'Estudios',
            data: monthly,
            backgroundColor: MedApp.Charts.color(0) + 'cc',
            hoverBackgroundColor: MedApp.Charts.color(0),
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 42
          }]
        },
        options: {
          plugins: {
            tooltip: {
              callbacks: {
                title: (items) => MedApp.Utils.monthLong(items[0].dataIndex + 1) + ' · ' + year,
                label: (ctx) => ' Estudios: ' + MedApp.Utils.fmtExact(ctx.parsed.y),
                afterLabel: (ctx) => {
                  if (!prevMonthly) return '';
                  const cur = ctx.parsed.y, p = prevMonthly[ctx.dataIndex];
                  if (!p) return '';
                  const g = MedApp.Utils.pctGrowth(cur, p);
                  return g == null ? '' : ' vs ' + prevYear + ': ' + MedApp.Utils.fmtPct(g, true);
                }
              }
            }
          },
          scales: MedApp.Charts.intY()
        }
      });

      // ---------- Gráfico: comparativo anual ----------
      const byYear = MedApp.Queries.monthlyByYear(records);
      const datasets = MedApp.Utils.YEARS.map((y, i) => {
        const data = byYear[y].map((v, mi) => {
          if (y === 2026 && mi >= 7) return null; // datos parciales
          return v;
        });
        return {
          label: String(y),
          data,
          borderColor: MedApp.Charts.color(i),
          backgroundColor: MedApp.Charts.color(i) + '18',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          borderDash: y === 2026 ? [6, 4] : undefined,
          fill: false
        };
      });

      MedApp.Charts.create('chartDashOverlay', {
        type: 'line',
        data: { labels: MedApp.Utils.MONTHS_SHORT, datasets },
        options: {
          plugins: {
            tooltip: {
              callbacks: {
                title: (items) => MedApp.Utils.monthLong(items[0].dataIndex + 1),
                label: (ctx) => ' ' + ctx.dataset.label + ': ' + MedApp.Utils.fmtExact(ctx.parsed.y) + ' estudios'
              }
            }
          },
          scales: MedApp.Charts.intY()
        }
      });

      // ---------- Top 5 clientes ----------
      const top5 = MedApp.Queries.byClient(records, year).slice(0, 5);
      const maxV = top5[0] ? top5[0].total : 0;
      document.getElementById('dashTopClients').innerHTML =
        top5.length === 0
          ? '<div class="empty-state">Sin datos para el año seleccionado.</div>'
          : '<div class="client-list">' + top5.map((c, i) => `
              <div class="client-item" data-client="${MedApp.Utils.escapeHtml(c.client)}" title="Ver detalle del cliente">
                <span class="ci-rank">#${i + 1}</span>
                <span class="ci-name">${MedApp.Utils.escapeHtml(c.client)}</span>
                <span class="ci-val">${MedApp.Utils.fmt(c.total)}</span>
                <span class="ci-bar" style="width:${Math.round((c.total / maxV) * 100)}%"></span>
              </div>`).join('') + '</div>';

      document.getElementById('dashTopClients').querySelectorAll('.client-item').forEach(el => {
        el.addEventListener('click', () => {
          MedApp.State.set({ client: el.getAttribute('data-client'), view: 'clients', clientYear: year });
          MedApp.App.navigate('clients');
        });
      });

      // ---------- Modalidades (mini distribución) ----------
      const mods = MedApp.Queries.byModality(records, year);
      const maxM = mods[0] ? mods[0].total : 0;
      document.getElementById('dashModList').innerHTML =
        mods.length === 0
          ? '<div class="empty-state">Sin datos para el año seleccionado.</div>'
          : '<div class="client-list">' + mods.slice(0, 9).map(m => {
              const pct = yearTotal ? (m.total / yearTotal) * 100 : 0;
              return `
              <div class="client-item">
                <span class="ci-name mono" style="font-weight:800;color:var(--primary)">${m.modality}</span>
                <span class="ci-val">${MedApp.Utils.fmt(m.total)}</span>
                <span class="badge badge-neutral">${MedApp.Utils.fmtPct(pct)}</span>
                <span class="ci-bar" style="width:${maxM ? Math.round((m.total / maxM) * 100) : 0}%"></span>
              </div>`;
            }).join('') + '</div>';

      Views.dashboard._last = { year };
      MedApp.Lifecycle.afterMount('dashboard');
    }
  };

})(window);

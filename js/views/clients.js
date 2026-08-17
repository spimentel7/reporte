/* ==========================================================================
   clients.js — Análisis detallado por cliente
   Pie (modalidades) · histórico anual · comportamiento mensual
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const Views = MedApp.Views = MedApp.Views || {};

  Views.clients = {

    mount(container) {
      MedApp.Lifecycle.beforeMount('clients');
      const state = MedApp.State.get();
      const records = MedApp.Store.getRecords();

      if (!state.client) {
        const top = MedApp.Queries.topClient(records, state.clientYear || state.year);
        if (top) MedApp.State.set({ client: top.client });
      }

      container.innerHTML = `
        <div class="flex-between mb-16">
          <div>
            <h1>Análisis por cliente</h1>
            <p class="muted">Seleccione un centro clínico para ver su distribución de modalidades e histórico.</p>
          </div>
          <div class="flex gap-8">
            <div class="search-wrap" style="min-width:300px">
              <span class="search-ic">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </span>
              <input type="text" id="clSearch" class="search-input" placeholder="Filtrar lista de clientes…" />
            </div>
            <div class="field">
              <label class="label" for="clYear">Año</label>
              <select id="clYear" class="control"></select>
            </div>
          </div>
        </div>

        <div class="grid grid-side">
          <div>
            <div class="card">
              <div class="card-head">
                <div class="flex gap-8">
                  <h2 id="clName" style="font-size:19px"></h2>
                  <span id="clBadges"></span>
                </div>
              </div>
              <div class="grid grid-4" id="clKpis"></div>
            </div>

            <div class="grid grid-3">
              <div class="card">
                <div class="card-head">
                  <h3 class="card-title">Distribución por modalidad</h3>
                </div>
                <div class="chart-box-xs"><canvas id="chartClPie"></canvas></div>
              </div>
              <div class="card">
                <div class="card-head">
                  <h3 class="card-title">Histórico anual del cliente</h3>
                  <span class="badge badge-neutral">estudios</span>
                </div>
                <div class="chart-box-sm"><canvas id="chartClYears"></canvas></div>
              </div>
              <div class="card">
                <div class="card-head">
                  <h3 class="card-title">Comportamiento mensual</h3>
                  <span class="badge badge-neutral" id="clYearBadge"></span>
                </div>
                <div class="chart-box-sm"><canvas id="chartClMonthly"></canvas></div>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                <h3 class="card-title">Detalle por modalidad · <span id="clTableYear"></span></h3>
                <span class="badge badge-neutral" id="clTableTot"></span>
              </div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr>
                    <th>Modalidad</th>
                    <th>Estudios</th>
                    <th>% del cliente</th>
                    <th>Ingreso proyectado</th>
                  </tr></thead>
                  <tbody id="clTableBody"></tbody>
                </table>
              </div>
            </div>
          </div>

          <aside>
            <div class="card">
              <div class="card-head"><h3 class="card-title">Centros clínicos</h3></div>
              <div id="clList" class="client-list"></div>
            </div>
          </aside>
        </div>
      `;

      const yearSel = container.querySelector('#clYear');
      MedApp.Utils.YEARS.forEach(y => {
        const op = document.createElement('option');
        op.value = y; op.textContent = y;
        if (y === state.clientYear) op.selected = true;
        yearSel.appendChild(op);
      });
      yearSel.addEventListener('change', () => {
        MedApp.State.set({ clientYear: parseInt(yearSel.value, 10) });
        Views.clients.mount(container);
      });

      container.querySelector('#clSearch').addEventListener('input', MedApp.Utils.debounce(e => {
        Views.clients._renderList(container, e.target.value.trim());
      }, 200));

      container.querySelector('#clList').addEventListener('click', e => {
        const item = e.target.closest('[data-client]');
        if (!item) return;
        MedApp.State.set({ client: item.getAttribute('data-client') });
        Views.clients.mount(container);
      });

      Views.clients._render(container);
      Views.clients._renderList(container, '');
      MedApp.Lifecycle.afterMount('clients');
    },

    _render(container) {
      const state = MedApp.State.get();
      const client = state.client;
      const year = state.clientYear;
      const records = MedApp.Store.getRecords();
      const rates = MedApp.Store.getRates();

      if (!client) return;

      const clientRecords = records.filter(r => r.client === client);
      const yearTotalAll = MedApp.Queries.sum(records.filter(r => r.year === year));
      const historical = MedApp.Queries.sum(clientRecords);
      const yearTotal = MedApp.Queries.sum(clientRecords.filter(r => r.year === year));
      const prevTotal = MedApp.Queries.sum(clientRecords.filter(r => r.year === year - 1));
      const growth = MedApp.Utils.pctGrowth(yearTotal, prevTotal);
      const participation = yearTotalAll ? (yearTotal / yearTotalAll) * 100 : 0;
      const rate = rates[client] != null ? rates[client] : 0;
      const revenue = yearTotal * rate;

      document.getElementById('clName').textContent = client;
      document.getElementById('clYearBadge').textContent = year;
      document.getElementById('clTableYear').textContent = year;
      document.getElementById('clTableTot').textContent = MedApp.Utils.fmtExact(yearTotal) + ' estudios';

      const modBadges = MedApp.Queries.clientModalityDist(records, client, year).slice(0, 4);
      document.getElementById('clBadges').innerHTML = modBadges.map(m =>
        `<span class="chip">${m.modality} ${MedApp.Utils.fmt(m.total)}</span>`).join('');

      document.getElementById('clKpis').innerHTML = `
        ${MedApp.UI.kpi('Total histórico', MedApp.Utils.fmtExact(historical), 'Estudios 2023–2026')}
        ${MedApp.UI.kpi('Estudios en ' + year, MedApp.Utils.fmtExact(yearTotal), growth == null ? '—' : 'vs. ' + (year - 1), MedApp.UI.growthBadge(growth))}
        ${MedApp.UI.kpi('Participación', MedApp.Utils.fmtPct(participation), 'del total ' + year)}
        ${MedApp.UI.kpi('Ingreso proyectado', MedApp.Utils.fmtMoney(revenue), 'Tarifa: ' + MedApp.Utils.fmtMoney(rate) + '/estudio')}
      `;

      // Doughnut modalidades
      const dist = MedApp.Queries.clientModalityDist(records, client, year);
      MedApp.Charts.create('chartClPie', {
        type: 'doughnut',
        data: {
          labels: dist.map(d => d.modality),
          datasets: [{
            data: dist.map(d => d.total),
            backgroundColor: dist.map((_, i) => MedApp.Charts.color(i) + 'cc'),
            borderWidth: 2,
            borderColor: 'transparent',
            hoverOffset: 8
          }]
        },
        options: {
          cutout: '62%',
          plugins: {
            tooltip: {
              callbacks: {
                title: (items) => dist[items[0].dataIndex].modality,
                label: (ctx) => {
                  const total = dist.reduce((a, d) => a + d.total, 0);
                  const pct = total ? (ctx.parsed / total) * 100 : 0;
                  return ' ' + MedApp.Utils.fmtExact(ctx.parsed) + ' estudios (' + MedApp.Utils.fmtPct(pct) + ')';
                }
              }
            },
            legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }
          }
        }
      });

      // Barras histórico anual
      const yearly = MedApp.Queries.clientYearly(records, client);
      MedApp.Charts.create('chartClYears', {
        type: 'bar',
        data: {
          labels: yearly.map(y => String(y.year)),
          datasets: [{
            label: 'Estudios',
            data: yearly.map(y => y.total),
            backgroundColor: yearly.map((_, i) => MedApp.Charts.color(i) + 'cc'),
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 46
          }]
        },
        options: {
          plugins: {
            tooltip: { callbacks: { title: (i) => 'Año ' + i[0].label, label: (c) => ' Estudios: ' + MedApp.Utils.fmtExact(c.parsed.y) } }
          },
          scales: MedApp.Charts.intY()
        }
      });

      // Mensual
      const monthly = MedApp.Queries.clientMonthly(records, client, year);
      MedApp.Charts.create('chartClMonthly', {
        type: 'line',
        data: {
          labels: MedApp.Utils.MONTHS_SHORT,
          datasets: [{
            label: client,
            data: monthly,
            borderColor: MedApp.Charts.color(0),
            backgroundColor: MedApp.Charts.color(0) + '22',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5
          }]
        },
        options: {
          plugins: {
            tooltip: { callbacks: { title: (i) => MedApp.Utils.monthLong(i[0].dataIndex + 1), label: (c) => ' Estudios: ' + MedApp.Utils.fmtExact(c.parsed.y) } }
          },
          scales: MedApp.Charts.intY()
        }
      });

      // Tabla de modalidades
      const distRows = dist.map(d => {
        const pct = yearTotal ? (d.total / yearTotal) * 100 : 0;
        const rev = d.total * rate;
        return `
          <tr>
            <td><span class="chip">${d.modality}</span></td>
            <td><b>${MedApp.Utils.fmtExact(d.total)}</b></td>
            <td>${MedApp.Utils.fmtPct(pct)}</td>
            <td class="mono">${MedApp.Utils.fmtMoney(rev)}</td>
          </tr>`;
      }).join('');
      document.getElementById('clTableBody').innerHTML = distRows || '<tr><td colspan="4" class="empty-state">Sin datos.</td></tr>';
    },

    _renderList(container, search) {
      const state = MedApp.State.get();
      const records = MedApp.Store.getRecords();
      const year = state.clientYear;
      const clients = MedApp.Queries.byClient(records, year);
      const needle = MedApp.Utils.slugify(search);
      const list = (needle ? clients.filter(c => MedApp.Utils.slugify(c.client).indexOf(needle) !== -1) : clients)
        .slice(0, 50);
      const maxV = clients[0] ? clients[0].total : 0;
      const el = container.querySelector('#clList');
      if (!el) return;
      el.innerHTML = list.map(c => `
        <div class="client-item ${c.client === state.client ? 'active' : ''}" data-client="${MedApp.Utils.escapeHtml(c.client)}" title="${MedApp.Utils.escapeHtml(c.client)}">
          <span class="ci-name">${MedApp.Utils.escapeHtml(c.client)}</span>
          <span class="ci-val">${MedApp.Utils.fmt(c.total)}</span>
          <span class="ci-bar" style="width:${Math.round((c.total / maxV) * 100)}%"></span>
        </div>`).join('') || '<div class="empty-state">Sin coincidencias.</div>';
    }
  };

})(window);

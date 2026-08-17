/* ==========================================================================
   finance.js — Módulo financiero / cotización
   Ingresos proyectados = volumen de estudios × tarifa base por cliente
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const Views = MedApp.Views = MedApp.Views || {};

  Views.finance = {

    mount(container) {
      MedApp.Lifecycle.beforeMount('finance');
      container.innerHTML = `
        <div class="flex-between mb-16">
          <div>
            <h1>Módulo financiero · Cotización</h1>
            <p class="muted">Ingresos proyectados según tarifas base por estudio asignadas a cada cliente (basadas en la data de tarifas 2023).</p>
          </div>
          <div class="field">
            <label class="label" for="finYear">Año</label>
            <select id="finYear" class="control"></select>
          </div>
        </div>

        <div class="grid grid-4" id="finKpis"></div>

        <div class="grid grid-2 mt-16">
          <div class="card">
            <div class="card-head">
              <h3 class="card-title">Ingresos proyectados mensuales</h3>
              <span class="badge badge-primary" id="finMonthlyTot">—</span>
            </div>
            <div class="chart-box"><canvas id="chartFinMonthly"></canvas></div>
          </div>
          <div class="card">
            <div class="card-head">
              <h3 class="card-title">Ingresos por cliente · Top 10</h3>
            </div>
            <div class="chart-box"><canvas id="chartFinClients"></canvas></div>
          </div>
        </div>

        <div class="card mt-16">
          <div class="card-head">
            <div>
              <h3 class="card-title">Tarifas base por estudio</h3>
              <p class="card-sub">Edite una tarifa y los gráficos se actualizan automáticamente.</p>
            </div>
            <span class="badge badge-neutral" id="finRatesTot">—</span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr>
                <th style="text-align:left">Cliente</th>
                <th>Tarifa / estudio</th>
                <th>Estudios · <span id="finRatesYear"></span></th>
                <th>Ingreso proyectado</th>
              </tr></thead>
              <tbody id="finRatesBody"></tbody>
              <tfoot><tr><td id="finRatesFootClient">TOTAL</td><td>—</td><td id="finRatesFootStud"></td><td id="finRatesFootRev"></td></tr></tfoot>
            </table>
          </div>
        </div>
      `;

      const state = MedApp.State.get();
      const sel = container.querySelector('#finYear');
      MedApp.Utils.YEARS.forEach(y => {
        const op = document.createElement('option');
        op.value = y; op.textContent = y;
        if (y === state.year) op.selected = true;
        sel.appendChild(op);
      });
      sel.addEventListener('change', () => {
        MedApp.State.set({ year: parseInt(sel.value, 10) });
        Views.finance.mount(container);
      });

      Views.finance._render(container);
    },

    _render(container) {
      const state = MedApp.State.get();
      const year = state.year;
      const records = MedApp.Store.getRecords();
      const rates = MedApp.Store.getRates();

      const revByMonth = MedApp.Queries.revenueByMonth(records, rates, year);
      const totalRev = revByMonth.reduce((a, b) => a + b, 0);
      const monthsActive = year === 2026 ? 7 : 12;
      const avgMonth = totalRev / monthsActive;

      const byClient = MedApp.Queries.revenueByClient(records, rates, year);
      const topClient = byClient[0];

      let totalStudies = 0, weightedRate = 0;
      const byClientStudies = MedApp.Queries.byClient(records, year);
      const studyMap = {};
      byClientStudies.forEach(c => { studyMap[c.client] = c.total; totalStudies += c.total; });
      byClient.forEach(c => { weightedRate += (studyMap[c.client] || 0) * (rates[c.client] || 0); });
      const avgRate = totalStudies ? weightedRate / totalStudies : 0;

      document.getElementById('finMonthlyTot').textContent = 'Total anual: ' + MedApp.Utils.fmtMoney(totalRev);
      document.getElementById('finRatesYear').textContent = year;

      document.getElementById('finKpis').innerHTML = `
        ${MedApp.UI.kpi('Ingreso proyectado · ' + year, MedApp.Utils.fmtMoney(totalRev), MedApp.Utils.fmtExact(totalStudies) + ' estudios facturables')}
        ${MedApp.UI.kpi('Promedio mensual', MedApp.Utils.fmtMoney(avgMonth), year === 2026 ? 'Datos parciales (7 meses)' : 'Media de 12 meses')}
        ${MedApp.UI.kpi('Mayor ingreso', topClient ? MedApp.Utils.escapeHtml(topClient.client) : '—', topClient ? MedApp.Utils.fmtMoney(topClient.revenue) : '')}
        ${MedApp.UI.kpi('Tarifa promedio ponderada', MedApp.Utils.fmtMoney(avgRate), 'USD por estudio')}
      `;

      // Mensual
      MedApp.Charts.create('chartFinMonthly', {
        type: 'bar',
        data: {
          labels: MedApp.Utils.MONTHS_SHORT,
          datasets: [{
            label: 'Ingreso proyectado',
            data: revByMonth,
            backgroundColor: '#45bfeecc',
            hoverBackgroundColor: '#e6ab69',
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
                label: (ctx) => ' Ingreso: ' + MedApp.Utils.fmtMoney(ctx.parsed.y)
              }
            }
          },
          scales: MedApp.Charts.moneyY()
        }
      });

      // Por cliente
      const top10 = byClient.slice(0, 10).reverse();
      MedApp.Charts.create('chartFinClients', {
        type: 'bar',
        data: {
          labels: top10.map(c => c.client),
          datasets: [{
            label: 'Ingreso',
            data: top10.map(c => Math.round(c.revenue)),
            backgroundColor: top10.map((_, i) => MedApp.Charts.color(9 - i) + 'cc'),
            borderRadius: 6,
            maxBarThickness: 22
          }]
        },
        options: {
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => items[0].label,
                label: (ctx) => ' Ingreso: ' + MedApp.Utils.fmtMoney(ctx.parsed.x)
              }
            }
          },
          scales: {
            x: { beginAtZero: true, grid: { color: MedApp.Charts.gridColor() }, ticks: { callback: v => '$' + MedApp.Utils.fmt(v) } },
            y: { grid: { display: false }, ticks: { font: { size: 11 } } }
          }
        }
      });

      // Tabla de tarifas editable
      const rows = byClient.map(c => {
        const rate = rates[c.client] != null ? rates[c.client] : 0;
        const stud = studyMap[c.client] || 0;
        return `
          <tr>
            <td>${MedApp.Utils.escapeHtml(c.client)}</td>
            <td>
              <input type="number" step="0.01" min="0" class="control rate-input" style="width:92px;text-align:right;padding:5px 8px;font-family:var(--mono)"
                     data-client="${MedApp.Utils.escapeHtml(c.client)}" value="${rate.toFixed(2)}" />
            </td>
            <td>${MedApp.Utils.fmtExact(stud)}</td>
            <td class="mono"><b>${MedApp.Utils.fmtMoney(c.revenue)}</b></td>
          </tr>`;
      }).join('');
      document.getElementById('finRatesBody').innerHTML = rows;
      document.getElementById('finRatesFootStud').textContent = MedApp.Utils.fmtExact(totalStudies);
      document.getElementById('finRatesFootRev').textContent = MedApp.Utils.fmtMoney(totalRev);
      document.getElementById('finRatesTot').textContent = byClient.length + ' clientes con tarifa';

      container.querySelectorAll('.rate-input').forEach(input => {
        input.addEventListener('change', () => {
          MedApp.Store.setRates({ [input.getAttribute('data-client')]: parseFloat(input.value) });
          MedApp.Utils.toast('Tarifa actualizada para ' + input.getAttribute('data-client'), 'success');
          Views.finance._render(container);
        });
      });
      MedApp.Lifecycle.afterMount('finance');
    }
  };

})(window);

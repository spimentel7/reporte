/* ==========================================================================
   explorer.js — Búsqueda global + filtros combinables + tabla interactiva
   Columnas: [Cliente | Modalidad | Ene … Dic | Total] con paginación,
   ordenamiento y exportación CSV.
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const Views = MedApp.Views = MedApp.Views || {};

  Views.explorer = {

    mount(container) {
      MedApp.Lifecycle.beforeMount('explorer');
      const state = MedApp.State.get();

      container.innerHTML = `
        <div class="mb-16">
          <h1>Explorador de datos</h1>
          <p class="muted">Busque centros clínicos y combine filtros por año, mes y modalidad.</p>
        </div>

        <div class="card">
          <div class="toolbar">
            <div class="search-wrap">
              <span class="search-ic">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </span>
              <input type="text" id="expSearch" class="search-input" placeholder="Buscar cliente o centro clínico…" value="${MedApp.Utils.escapeHtml(state.search)}" />
            </div>
            <div class="field">
              <label class="label" for="expYear">Año</label>
              <select id="expYear" class="control"></select>
            </div>
            <div class="field">
              <label class="label" for="expMonth">Mes</label>
              <select id="expMonth" class="control"></select>
            </div>
            <div class="field">
              <label class="label" for="expModality">Modalidad</label>
              <select id="expModality" class="control"></select>
            </div>
            <div style="align-self:flex-end" class="flex gap-8">
              <label class="check-control" title="Ocultar el desglose mensual y mostrar solo el total por cliente × modalidad">
                <input type="checkbox" id="expTotalsOnly" ${state.totalsOnly ? 'checked' : ''} />
                <span>Solo totales</span>
              </label>
              <button id="expExport" class="btn btn-primary">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Exportar CSV
              </button>
              <button id="expReset" class="btn btn-ghost" title="Limpiar filtros">Limpiar</button>
            </div>
          </div>
          <p class="muted" id="expHint" style="font-size:12.5px"></p>
          <div id="expTable"></div>
        </div>
      `;

      // Poblar selects
      const yearSel = container.querySelector('#expYear');
      MedApp.Utils.YEARS.forEach(y => {
        const op = document.createElement('option');
        op.value = y; op.textContent = y;
        if (y === state.year) op.selected = true;
        yearSel.appendChild(op);
      });

      const monthSel = container.querySelector('#expMonth');
      [['all', 'Todos los meses'], ['1', 'Enero'], ['2', 'Febrero'], ['3', 'Marzo'], ['4', 'Abril'],
       ['5', 'Mayo'], ['6', 'Junio'], ['7', 'Julio'], ['8', 'Agosto'], ['9', 'Septiembre'],
       ['10', 'Octubre'], ['11', 'Noviembre'], ['12', 'Diciembre']].forEach(([v, l]) => {
        const op = document.createElement('option');
        op.value = v; op.textContent = l;
        if (String(state.month) === v) op.selected = true;
        monthSel.appendChild(op);
      });

      const modSel = container.querySelector('#expModality');
      const allOp = document.createElement('option');
      allOp.value = 'all'; allOp.textContent = 'Todas las modalidades';
      if (state.modality === 'all') allOp.selected = true;
      modSel.appendChild(allOp);
      MedApp.Generator.MODALITIES.forEach(m => {
        const op = document.createElement('option');
        op.value = m; op.textContent = m;
        if (state.modality === m) op.selected = true;
        modSel.appendChild(op);
      });

      // Eventos
      const debouncedSearch = MedApp.Utils.debounce(v => {
        MedApp.State.set({ search: v, page: 1 });
        Views.explorer._render();
      }, 280);

      container.querySelector('#expSearch').addEventListener('input', e => debouncedSearch(e.target.value));

      yearSel.addEventListener('change', () => {
        MedApp.State.set({ year: parseInt(yearSel.value, 10), page: 1 });
        Views.explorer._render();
      });
      monthSel.addEventListener('change', () => {
        MedApp.State.set({ month: monthSel.value === 'all' ? 'all' : parseInt(monthSel.value, 10), page: 1 });
        Views.explorer._render();
      });
      modSel.addEventListener('change', () => {
        MedApp.State.set({ modality: modSel.value, page: 1 });
        Views.explorer._render();
      });
      container.querySelector('#expReset').addEventListener('click', () => {
        MedApp.State.set({ search: '', month: 'all', modality: 'all', totalsOnly: false, page: 1 });
        Views.explorer.mount(container);
      });
      container.querySelector('#expTotalsOnly').addEventListener('change', e => {
        MedApp.State.set({ totalsOnly: e.target.checked, page: 1 });
        Views.explorer._render();
      });
      container.querySelector('#expExport').addEventListener('click', () => Views.explorer._export());

      Views.explorer._render();
      MedApp.Lifecycle.afterMount('explorer');
    },

    _compute() {
      const state = MedApp.State.get();
      const records = MedApp.Store.getRecords();
      const filtered = MedApp.Filters.apply(records, {
        year: state.year,
        month: state.month,
        modality: state.modality,
        search: state.search
      });

      const totalsOnly = state.totalsOnly;
      const group = new Map();
      for (const r of filtered) {
        const key = totalsOnly ? r.client : r.client + '|' + r.modality;
        let g = group.get(key);
        if (!g) {
          g = totalsOnly
            ? { client: r.client, modality: null, months: new Array(12).fill(0), total: 0 }
            : { client: r.client, modality: r.modality, months: new Array(12).fill(0), total: 0 };
          group.set(key, g);
        }
        g.months[r.month - 1] += r.studies;
        g.total += r.studies;
      }

      let rows = Array.from(group.values());
      if (state.month !== 'all') {
        rows = rows.filter(r => r.months[state.month - 1] > 0);
      }

      // Orden
      const { key, dir } = state.sort;
      const factor = dir === 'desc' ? -1 : 1;
      rows.sort((a, b) => {
        const ka = key.startsWith('m') ? (a.months[parseInt(key.slice(1), 10) - 1] || 0) : a[key];
        const kb = key.startsWith('m') ? (b.months[parseInt(key.slice(1), 10) - 1] || 0) : b[key];
        if (typeof ka === 'number' && typeof kb === 'number') return (ka - kb) * factor;
        return String(ka).localeCompare(String(kb), 'es') * factor;
      });

      return { rows, total: rows.length };
    },

    _render() {
      const state = MedApp.State.get();
      const { rows, total } = Views.explorer._compute();
      const container = document.getElementById('expTable');
      if (!container) return;

      const month = state.month;
      const totalsOnly = state.totalsOnly;
      const hint = document.getElementById('expHint');
      if (hint) {
        hint.textContent = totalsOnly
          ? (month === 'all'
              ? `Estudios totales por cliente · año ${state.year} · ${MedApp.Utils.fmtExact(total)} clientes.`
              : `Clientes con actividad en ${MedApp.Utils.monthLong(month)} · año ${state.year} · ${MedApp.Utils.fmtExact(total)}.`)
          : (month === 'all'
              ? `Tabla de volumen por cliente × modalidad · año ${state.year} · ${MedApp.Utils.fmtExact(total)} combinaciones.`
              : `Combinaciones con actividad en ${MedApp.Utils.monthLong(month)} · año ${state.year} · ${MedApp.Utils.fmtExact(total)} filas.`);
      }

      const columns = totalsOnly
        ? [{ key: 'client', label: 'Cliente', align: 'left', sortable: true }]
        : [
            { key: 'client', label: 'Cliente', align: 'left', sortable: true },
            { key: 'modality', label: 'Modalidad', align: 'left', sortable: true }
          ];
      MedApp.Utils.MONTHS_SHORT.forEach((m, i) => {
        columns.push({
          key: 'm' + (i + 1),
          label: m,
          align: 'right',
          sortable: true,
          isHl: month !== 'all' && month === i + 1,
          render: (row) => '<span class="mono">' + MedApp.Utils.fmtExact(row.months[i]) + '</span>'
        });
      });
      columns.push({ key: 'total', label: 'Total', align: 'right', sortable: true });

      const start = (state.page - 1) * state.pageSize;
      const pageRows = rows.slice(start, start + state.pageSize);

      MedApp.UI.Table(container, {
        columns,
        rows: pageRows,
        total,
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        highlightCol: month !== 'all' ? 'm' + month : null,
        emptyText: 'No se encontraron registros. Pruebe con otros filtros.',
        footer: (() => {
          const tds = ['<b>Totales</b>'];
          if (!totalsOnly) tds.push('');
          for (let m = 1; m <= 12; m++) {
            let s = 0;
            for (const r of rows) s += r.months[m - 1];
            tds.push('<b>' + MedApp.Utils.fmtExact(s) + '</b>');
          }
          let s = 0;
          for (const r of rows) s += r.total;
          tds.push('<b>' + MedApp.Utils.fmtExact(s) + '</b>');
          return tds;
        })(),
        onSort: (key) => {
          let dir = 'desc';
          if (state.sort.key === key) dir = state.sort.dir === 'desc' ? 'asc' : 'desc';
          MedApp.State.set({ sort: { key, dir }, page: 1 });
          Views.explorer._render();
        },
        onPage: (p) => {
          MedApp.State.set({ page: MedApp.Utils.clamp(p, 1, Math.max(1, Math.ceil(total / state.pageSize))) });
          Views.explorer._render();
        },
        onPageSize: (n) => {
          MedApp.State.set({ pageSize: n, page: 1 });
          Views.explorer._render();
        }
      });
    },

    _export() {
      const state = MedApp.State.get();
      const { rows } = Views.explorer._compute();
      const totalsOnly = state.totalsOnly;

      const head = totalsOnly
        ? ['Cliente'].concat(MedApp.Utils.MONTHS_SHORT, ['Total'])
        : ['Cliente', 'Modalidad'].concat(MedApp.Utils.MONTHS_SHORT, ['Total']);
      const body = rows.map(r => {
        const base = totalsOnly ? [r.client] : [r.client, r.modality];
        return base.concat(r.months.map(v => v), r.total);
      });
      let sum = 0;
      const totalRow = (totalsOnly ? ['TOTAL'] : ['TOTAL', '']).concat(Array.from({ length: 12 }, (_, m) => {
        let s = 0;
        for (const r of rows) s += r.months[m];
        sum += s;
        return s;
      }), [sum]);
      body.push(totalRow);

      const suffix = (state.month !== 'all' ? '_' + MedApp.Utils.monthShort(state.month) : '') + '_' + state.year;
      MedApp.Utils.downloadCsv(`medanalytics_volumen${suffix}.csv`, [head].concat(body));
      MedApp.Utils.toast('Archivo CSV exportado correctamente.', 'success');
    }
  };

})(window);

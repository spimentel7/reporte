/* ==========================================================================
   datamanager.js — Gestión de datos: CRUD completo
   Formulario individual + tabla editable inline + eliminación múltiple
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const Views = MedApp.Views = MedApp.Views || {};

  const DM_PAGE_SIZES = [10, 25, 50, 100];

  Views.datamanager = {

    _state: {
      page: 1,
      pageSize: 25,
      search: '',
      year: 'all',
      month: 'all',
      modality: 'all',
      selected: new Set(),
      editingIdx: null
    },

    mount(container) {
      MedApp.Lifecycle.beforeMount('datamanager');
      const st = this._state;
      st.selected.clear();
      st.editingIdx = null;

      container.innerHTML = `
        <div class="flex-between mb-16">
          <div>
            <h1>Gestionar datos</h1>
            <p class="muted">Agregue, edite o elimine registros de estudios médicos.</p>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-head">
              <h3 class="card-title">Agregar registro</h3>
            </div>
            <form id="dmForm" class="dm-form" novalidate>
              <div class="grid grid-3">
                <div class="field">
                  <label class="label" for="dmYear">Año *</label>
                  <select id="dmYear" class="control" required></select>
                </div>
                <div class="field">
                  <label class="label" for="dmMonth">Mes *</label>
                  <select id="dmMonth" class="control" required></select>
                </div>
                <div class="field">
                  <label class="label" for="dmModality">Modalidad *</label>
                  <select id="dmModality" class="control" required></select>
                </div>
              </div>
              <div class="grid grid-2">
                <div class="field">
                  <label class="label" for="dmClient">Cliente *</label>
                  <input type="text" id="dmClient" class="control" list="dmClientList" placeholder="Nombre del centro clínico" required autocomplete="off" />
                  <datalist id="dmClientList"></datalist>
                </div>
                <div class="field">
                  <label class="label" for="dmStudies">Estudios *</label>
                  <input type="number" id="dmStudies" class="control" min="0" step="1" placeholder="0" required />
                </div>
              </div>
              <div class="flex gap-8 mt-8">
                <button type="submit" class="btn btn-primary" id="dmSubmitBtn">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  Agregar registro
                </button>
                <button type="button" class="btn btn-ghost" id="dmClearForm">Limpiar</button>
              </div>
            </form>
          </div>

          <div class="card">
            <div class="card-head">
              <h3 class="card-title">Resumen rápido</h3>
            </div>
            <div class="grid grid-3" id="dmSummary"></div>
          </div>
        </div>

        <div class="card mt-16">
          <div class="card-head">
            <div>
              <h3 class="card-title">Registros existentes</h3>
              <p class="card-sub" id="dmHint"></p>
            </div>
            <div class="flex gap-8">
              <button id="dmDeleteSelected" class="btn btn-ghost" style="color:var(--danger);display:none" aria-label="Eliminar registros seleccionados">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Eliminar seleccionados (<span id="dmSelectedCount">0</span>)
              </button>
              <button id="dmExportFiltered" class="btn btn-ghost">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Exportar filtrados
              </button>
            </div>
          </div>

          <div class="toolbar">
            <div class="search-wrap">
              <span class="search-ic">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </span>
              <input type="text" id="dmSearch" class="search-input" placeholder="Buscar cliente…" />
            </div>
            <div class="field">
              <label class="label" for="dmFilterYear">Año</label>
              <select id="dmFilterYear" class="control"></select>
            </div>
            <div class="field">
              <label class="label" for="dmFilterMonth">Mes</label>
              <select id="dmFilterMonth" class="control"></select>
            </div>
            <div class="field">
              <label class="label" for="dmFilterMod">Modalidad</label>
              <select id="dmFilterMod" class="control"></select>
            </div>
          </div>

          <div id="dmTable"></div>
        </div>
      `;

      this._initForm(container);
      this._initFilters(container);
      this._initActions(container);
      this._renderSummary(container);
      this._renderTable(container);
      MedApp.Lifecycle.afterMount('datamanager');
    },

    _initForm(container) {
      const form = container.querySelector('#dmForm');
      const yearSel = container.querySelector('#dmYear');
      const monthSel = container.querySelector('#dmMonth');
      const modSel = container.querySelector('#dmModality');
      const clientInput = container.querySelector('#dmClient');
      const clientList = container.querySelector('#dmClientList');

      MedApp.Utils.YEARS.slice().reverse().forEach(y => {
        const op = document.createElement('option');
        op.value = y; op.textContent = y;
        yearSel.appendChild(op);
      });

      MedApp.Utils.MONTHS_LONG.forEach((m, i) => {
        const op = document.createElement('option');
        op.value = i + 1; op.textContent = m;
        monthSel.appendChild(op);
      });
      const now = new Date();
      monthSel.value = now.getMonth() + 1;

      MedApp.Generator.MODALITIES.forEach(m => {
        const op = document.createElement('option');
        op.value = m; op.textContent = m;
        modSel.appendChild(op);
      });

      const clients = MedApp.Store.getClientNames();
      clientList.innerHTML = clients.map(c => `<option value="${MedApp.Utils.escapeHtml(c)}">`).join('');

      form.addEventListener('submit', e => {
        e.preventDefault();
        const rec = {
          year: parseInt(yearSel.value, 10),
          month: parseInt(monthSel.value, 10),
          client: clientInput.value.trim(),
          modality: modSel.value,
          studies: parseInt(container.querySelector('#dmStudies').value, 10)
        };
        if (!rec.client || !rec.studies || rec.studies <= 0) {
          MedApp.Utils.toast('Complete todos los campos obligatorios.', 'error');
          return;
        }
        const result = MedApp.Store.addRecord(rec);
        if (result.success) {
          MedApp.Utils.toast(result.action === 'updated' ? 'Registro actualizado.' : 'Registro agregado.', 'success');
          container.querySelector('#dmStudies').value = '';
          clientInput.value = '';
          this._renderSummary(container);
          this._renderTable(container);
          this._syncToServer();
        } else {
          MedApp.Utils.toast(result.error, 'error');
        }
      });

      container.querySelector('#dmClearForm').addEventListener('click', () => {
        form.reset();
        monthSel.value = now.getMonth() + 1;
        yearSel.value = MedApp.Utils.YEARS[MedApp.Utils.YEARS.length - 1];
      });
    },

    _initFilters(container) {
      const st = this._state;
      const yearSel = container.querySelector('#dmFilterYear');
      const monthSel = container.querySelector('#dmFilterMonth');
      const modSel = container.querySelector('#dmFilterMod');

      const allOp = document.createElement('option');
      allOp.value = 'all'; allOp.textContent = 'Todos';
      yearSel.appendChild(allOp.cloneNode(true));
      monthSel.appendChild(allOp.cloneNode(true));
      modSel.appendChild(allOp.cloneNode(true));

      MedApp.Utils.YEARS.slice().reverse().forEach(y => {
        const op = document.createElement('option');
        op.value = y; op.textContent = y;
        yearSel.appendChild(op);
      });
      MedApp.Utils.MONTHS_LONG.forEach((m, i) => {
        const op = document.createElement('option');
        op.value = i + 1; op.textContent = m;
        monthSel.appendChild(op);
      });
      MedApp.Generator.MODALITIES.forEach(m => {
        const op = document.createElement('option');
        op.value = m; op.textContent = m;
        modSel.appendChild(op);
      });

      const debouncedSearch = MedApp.Utils.debounce(() => {
        st.page = 1;
        this._renderTable(container);
      }, 280);

      container.querySelector('#dmSearch').addEventListener('input', e => {
        st.search = e.target.value;
        debouncedSearch();
      });
      yearSel.addEventListener('change', () => { st.year = yearSel.value; st.page = 1; this._renderTable(container); });
      monthSel.addEventListener('change', () => { st.month = monthSel.value; st.page = 1; this._renderTable(container); });
      modSel.addEventListener('change', () => { st.modality = modSel.value; st.page = 1; this._renderTable(container); });
    },

    _initActions(container) {
      const st = this._state;

      container.querySelector('#dmDeleteSelected').addEventListener('click', () => {
        if (st.selected.size === 0) return;
        if (!confirm('¿Eliminar ' + st.selected.size + ' registro(s)? Esta acción no se puede deshacer.')) return;
        MedApp.Store.deleteRecords(Array.from(st.selected));
        st.selected.clear();
        MedApp.Utils.toast('Registros eliminados.', 'success');
        this._renderSummary(container);
        this._renderTable(container);
        this._syncToServer();
      });

      container.querySelector('#dmExportFiltered').addEventListener('click', () => {
        const { rows } = this._compute();
        const head = ['Año', 'Mes', 'Cliente', 'Modalidad', 'Estudios'];
        const body = rows.map(r => [r.year, r.month, r.client, r.modality, r.studies]);
        MedApp.Utils.downloadCsv('medanalytics_gestion_datos.csv', [head].concat(body));
        MedApp.Utils.toast('CSV exportado.', 'success');
      });
    },

    async _syncToServer() {
      try {
        const records = MedApp.Store.getRecords();
        const rates = MedApp.Store.getRates();
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records, rates })
        });
      } catch (err) {
        console.warn('[datamanager] Sync falló:', err);
      }
    },

    _getFilteredRecords() {
      const st = this._state;
      const records = MedApp.Store.getRecords();
      const needle = MedApp.Utils.slugify(st.search);

      return records.filter(r => {
        if (st.year !== 'all' && r.year !== parseInt(st.year, 10)) return false;
        if (st.month !== 'all' && r.month !== parseInt(st.month, 10)) return false;
        if (st.modality !== 'all' && r.modality !== st.modality) return false;
        if (needle && !MedApp.Utils.slugify(r.client).includes(needle)) return false;
        return true;
      }).map((r, i) => ({ ...r, _idx: records.indexOf(r) }));
    },

    _compute() {
      const rows = this._getFilteredRecords();
      return { rows, total: rows.length };
    },

    _renderSummary(container) {
      const records = MedApp.Store.getRecords();
      const clients = new Set();
      const mods = new Set();
      let total = 0;
      records.forEach(r => { clients.add(r.client); mods.add(r.modality); total += r.studies; });

      container.querySelector('#dmSummary').innerHTML = `
        <div class="kpi-card">
          <span class="kpi-label">Total registros</span>
          <span class="kpi-value">${MedApp.Utils.fmtExact(records.length)}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Clientes</span>
          <span class="kpi-value">${clients.size}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Estudios totales</span>
          <span class="kpi-value">${MedApp.Utils.fmt(total)}</span>
        </div>
      `;
    },

    _renderTable(container) {
      const st = this._state;
      const { rows, total } = this._compute();
      const totalPages = Math.max(1, Math.ceil(total / st.pageSize));
      if (st.page > totalPages) st.page = totalPages;

      const start = (st.page - 1) * st.pageSize;
      const pageRows = rows.slice(start, start + st.pageSize);

      const hint = container.querySelector('#dmHint');
      if (hint) {
        hint.textContent = total + ' registros' + (st.search || st.year !== 'all' || st.month !== 'all' || st.modality !== 'all' ? ' (filtrados)' : '');
      }

      const delBtn = container.querySelector('#dmDeleteSelected');
      const selCount = container.querySelector('#dmSelectedCount');
      if (delBtn) {
        delBtn.style.display = st.selected.size > 0 ? '' : 'none';
        selCount.textContent = st.selected.size;
      }

      const tableEl = container.querySelector('#dmTable');
      const allChecked = pageRows.length > 0 && pageRows.every(r => st.selected.has(r._idx));

      let html = '<div class="table-wrap"><table class="data-table dm-editable-table"><thead><tr>';
      html += '<th style="width:40px;text-align:center"><input type="checkbox" id="dmSelectAll" ' + (allChecked ? 'checked' : '') + ' aria-label="Seleccionar todos" /></th>';
      html += '<th style="text-align:left">Año</th>';
      html += '<th style="text-align:left">Mes</th>';
      html += '<th style="text-align:left">Cliente</th>';
      html += '<th style="text-align:left">Modalidad</th>';
      html += '<th>Estudios</th>';
      html += '<th style="width:80px">Acciones</th>';
      html += '</tr></thead><tbody>';

      if (pageRows.length === 0) {
        html += '<tr><td colspan="7" class="empty-state"><strong>Sin resultados</strong><span>No se encontraron registros para los filtros aplicados.</span></td></tr>';
      } else {
        pageRows.forEach(r => {
          const checked = st.selected.has(r._idx) ? 'checked' : '';
          const isEditing = st.editingIdx === r._idx;
          html += '<tr class="' + (isEditing ? 'dm-editing' : '') + '">';
          html += '<td style="text-align:center"><input type="checkbox" class="dm-check" data-idx="' + r._idx + '" ' + checked + ' aria-label="Seleccionar registro" /></td>';
          html += '<td>' + (isEditing ? '<input type="number" class="control dm-inline" data-field="year" value="' + r.year + '" />' : r.year) + '</td>';
          html += '<td>' + (isEditing
            ? '<select class="control dm-inline" data-field="month">' + MedApp.Utils.MONTHS_LONG.map((m, i) => '<option value="' + (i + 1) + '"' + (r.month === i + 1 ? ' selected' : '') + '>' + m + '</option>').join('') + '</select>'
            : MedApp.Utils.monthLong(r.month)) + '</td>';
          html += '<td style="text-align:left">' + (isEditing ? '<input type="text" class="control dm-inline" data-field="client" value="' + MedApp.Utils.escapeHtml(r.client) + '" />' : MedApp.Utils.escapeHtml(r.client)) + '</td>';
          html += '<td style="text-align:left">' + (isEditing
            ? '<select class="control dm-inline" data-field="modality">' + MedApp.Generator.MODALITIES.map(m => '<option' + (r.modality === m ? ' selected' : '') + '>' + m + '</option>').join('') + '</select>'
            : '<span class="chip">' + r.modality + '</span>') + '</td>';
          html += '<td>' + (isEditing ? '<input type="number" class="control dm-inline" data-field="studies" value="' + r.studies + '" min="0" />' : '<b>' + MedApp.Utils.fmtExact(r.studies) + '</b>') + '</td>';
          html += '<td style="text-align:center">';
          if (isEditing) {
            html += '<button class="btn btn-sm btn-primary dm-save" data-idx="' + r._idx + '" title="Guardar">✓</button> ';
            html += '<button class="btn btn-sm btn-ghost dm-cancel" title="Cancelar">✗</button>';
          } else {
            html += '<button class="btn btn-sm btn-ghost dm-edit" data-idx="' + r._idx + '" title="Editar" aria-label="Editar registro">✎</button> ';
            html += '<button class="btn btn-sm btn-ghost dm-delete" data-idx="' + r._idx + '" title="Eliminar" style="color:var(--danger)" aria-label="Eliminar registro">🗑</button>';
          }
          html += '</td></tr>';
        });
      }
      html += '</tbody></table></div>';

      const from = total === 0 ? 0 : start + 1;
      const to = Math.min(start + st.pageSize, total);
      html += '<div class="pagination">';
      html += '<div><strong>' + MedApp.Utils.fmtExact(total) + '</strong> registros · mostrando ' + MedApp.Utils.fmtExact(from) + '–' + MedApp.Utils.fmtExact(to) + ' · página ' + st.page + ' de ' + totalPages + '</div>';
      html += '<div class="pagination-controls">';

      html += '<button class="page-btn" data-page="' + (st.page - 1) + '"' + (st.page <= 1 ? ' disabled' : '') + '>‹</button>';
      const wp = this._pageWindow(st.page, totalPages);
      wp.forEach(p => {
        if (p === '…') {
          html += '<span style="color:var(--muted);padding:0 2px">…</span>';
        } else {
          html += '<button class="page-btn' + (p === st.page ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
        }
      });
      html += '<button class="page-btn" data-page="' + (st.page + 1) + '"' + (st.page >= totalPages ? ' disabled' : '') + '>›</button>';
      html += '</div>';

      html += '<select class="control" id="dmPageSize" style="padding:5px 24px 5px 8px;font-size:13px">';
      DM_PAGE_SIZES.forEach(n => {
        html += '<option value="' + n + '"' + (n === st.pageSize ? ' selected' : '') + '>' + n + ' / página</option>';
      });
      html += '</select>';
      html += '</div>';

      tableEl.innerHTML = html;
      this._bindTableEvents(container);
    },

    _bindTableEvents(container) {
      const st = this._state;
      const tableEl = container.querySelector('#dmTable');

      tableEl.querySelector('#dmSelectAll')?.addEventListener('change', e => {
        const rows = this._compute().rows;
        const start = (st.page - 1) * st.pageSize;
        const pageRows = rows.slice(start, start + st.pageSize);
        if (e.target.checked) {
          pageRows.forEach(r => st.selected.add(r._idx));
        } else {
          pageRows.forEach(r => st.selected.delete(r._idx));
        }
        this._renderTable(container);
      });

      tableEl.querySelectorAll('.dm-check').forEach(cb => {
        cb.addEventListener('change', () => {
          const idx = parseInt(cb.dataset.idx, 10);
          if (cb.checked) st.selected.add(idx); else st.selected.delete(idx);
          this._renderTable(container);
        });
      });

      tableEl.querySelectorAll('.dm-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          st.editingIdx = parseInt(btn.dataset.idx, 10);
          this._renderTable(container);
        });
      });

      tableEl.querySelectorAll('.dm-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
          st.editingIdx = null;
          this._renderTable(container);
        });
      });

      tableEl.querySelectorAll('.dm-save').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx, 10);
          const row = btn.closest('tr');
          const patch = {};
          row.querySelectorAll('.dm-inline').forEach(input => {
            const field = input.dataset.field;
            if (field === 'year' || field === 'month' || field === 'studies') {
              patch[field] = parseInt(input.value, 10);
            } else {
              patch[field] = input.value.trim();
            }
          });
          if (!patch.client || patch.studies == null || patch.studies < 0) {
            MedApp.Utils.toast('Complete todos los campos.', 'error');
            return;
          }
          MedApp.Store.updateRecord(idx, patch);
          st.editingIdx = null;
          MedApp.Utils.toast('Registro actualizado.', 'success');
          this._renderSummary(container);
          this._renderTable(container);
          this._syncToServer();
        });
      });

      tableEl.querySelectorAll('.dm-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!confirm('¿Eliminar este registro?')) return;
          MedApp.Store.deleteRecords([parseInt(btn.dataset.idx, 10)]);
          st.selected.delete(parseInt(btn.dataset.idx, 10));
          MedApp.Utils.toast('Registro eliminado.', 'success');
          this._renderSummary(container);
          this._renderTable(container);
          this._syncToServer();
        });
      });

      tableEl.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          st.page = parseInt(btn.dataset.page, 10);
          this._renderTable(container);
        });
      });

      const sizeSel = tableEl.querySelector('#dmPageSize');
      if (sizeSel) {
        sizeSel.addEventListener('change', () => {
          st.pageSize = parseInt(sizeSel.value, 10);
          st.page = 1;
          this._renderTable(container);
        });
      }
    },

    _pageWindow(current, total) {
      const out = [];
      const push = n => { if (out[out.length - 1] !== n) out.push(n); };
      push(1);
      if (current > 3) push('…');
      for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) push(p);
      if (current < total - 2) push('…');
      if (total > 1) push(total);
      return out;
    }
  };

})(window);

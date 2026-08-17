/* ==========================================================================
   table.js — Componente de tabla interactiva (orden, paginación)
   Config:
     columns: [{ key, label, align: 'left'|'right', sortable, render(row, val) }]
     rows: array de objetos
     total: número de filas filtradas
     page, pageSize, sort: { key, dir }   (estado manejado por el llamador)
     onSort(key), onPage(page), onPageSize(size)
     footer: [texto] | null
     emptyText: string
     highlightCol: key de columna a resaltar
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};

  const ARROW_DOWN = '↓';
  const ARROW_UP = '↑';

  function buildHeader(columns, sort, onSort, highlightCol) {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const th = document.createElement('th');
      th.setAttribute('scope', 'col');
      if (col.align === 'left') th.style.textAlign = 'left';
      if (highlightCol && col.key === highlightCol) th.style.color = 'var(--primary)';
      th.textContent = col.label;

      if (col.sortable !== false) {
        th.classList.add('sortable');
        const arrow = document.createElement('span');
        arrow.className = 'sort-arrow';
        arrow.textContent = (sort.key === col.key) ? (sort.dir === 'desc' ? ARROW_DOWN : ARROW_UP) : '';
        th.appendChild(arrow);
        th.addEventListener('click', () => onSort(col.key));
      }
      tr.appendChild(th);
    });
    return tr;
  }

  function renderTable(container, cfg) {
    container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'data-table';

    const thead = document.createElement('thead');
    thead.appendChild(buildHeader(cfg.columns, cfg.sort, cfg.onSort, cfg.highlightCol));
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const totalPages = Math.max(1, Math.ceil(cfg.total / cfg.pageSize));

    if (cfg.rows.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = cfg.columns.length;
      td.className = 'empty-state';
      td.innerHTML = '<strong>Sin resultados</strong><span>' + (cfg.emptyText || 'No se encontraron registros para los filtros aplicados.') + '</span>';
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      cfg.rows.forEach(row => {
        const tr = document.createElement('tr');
        cfg.columns.forEach(col => {
          const td = document.createElement('td');
          if (col.align === 'left') td.style.textAlign = 'left';
          const raw = row[col.key];
          td.innerHTML = col.render ? col.render(row, raw) : MedApp.Utils.escapeHtml(raw == null ? '' : String(raw));
          if (col.isHl) td.classList.add('month-hl');
          if (col.key === 'total') td.classList.add('col-total');
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      if (cfg.footer) {
        const tr = document.createElement('tr');
        cfg.footer.forEach((cell, i) => {
          const td = document.createElement('td');
          if (i === 0) td.style.textAlign = 'left';
          td.innerHTML = cell;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      }
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);

    // --- Paginación ---
    const pag = document.createElement('div');
    pag.className = 'pagination';

    const info = document.createElement('div');
    const from = cfg.total === 0 ? 0 : (cfg.page - 1) * cfg.pageSize + 1;
    const to = Math.min(cfg.page * cfg.pageSize, cfg.total);
    info.innerHTML = '<strong>' + MedApp.Utils.fmtExact(cfg.total) + '</strong> resultados · mostrando ' +
      MedApp.Utils.fmtExact(from) + '–' + MedApp.Utils.fmtExact(to) +
      ' · página ' + cfg.page + ' de ' + MedApp.Utils.fmtExact(totalPages);

    const controls = document.createElement('div');
    controls.className = 'pagination-controls';

    const btnPrev = pageBtn('‹', cfg.page > 1, () => cfg.onPage(cfg.page - 1));
    const btnNext = pageBtn('›', cfg.page < totalPages, () => cfg.onPage(cfg.page + 1));
    controls.appendChild(btnPrev);

    const windowPages = pageWindow(cfg.page, totalPages);
    windowPages.forEach(p => {
      if (p === '…') {
        const ell = document.createElement('span');
        ell.textContent = '…';
        ell.style.color = 'var(--muted)';
        ell.style.padding = '0 2px';
        controls.appendChild(ell);
      } else {
        const b = pageBtn(String(p), true, () => cfg.onPage(p));
        if (p === cfg.page) b.classList.add('active');
        controls.appendChild(b);
      }
    });
    controls.appendChild(btnNext);

    const sizeSel = document.createElement('select');
    sizeSel.className = 'control';
    sizeSel.style.padding = '5px 24px 5px 8px';
    [10, 25, 50, 100].forEach(n => {
      const op = document.createElement('option');
      op.value = n;
      op.textContent = n + ' / página';
      if (n === cfg.pageSize) op.selected = true;
      sizeSel.appendChild(op);
    });
    sizeSel.addEventListener('change', () => cfg.onPageSize(parseInt(sizeSel.value, 10)));

    pag.appendChild(info);
    pag.appendChild(controls);
    pag.appendChild(sizeSel);
    container.appendChild(pag);
  }

  function pageBtn(label, enabled, onClick) {
    const b = document.createElement('button');
    b.className = 'page-btn';
    b.textContent = label;
    b.disabled = !enabled;
    if (enabled) b.addEventListener('click', onClick);
    return b;
  }

  function pageWindow(current, total) {
    const out = [];
    const push = (n) => { if (out[out.length - 1] !== n) out.push(n); };
    push(1);
    if (current > 3) push('…');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) push(p);
    if (current < total - 2) push('…');
    if (total > 1) push(total);
    return out;
  }

  MedApp.UI = MedApp.UI || {};
  MedApp.UI.Table = renderTable;

})(window);

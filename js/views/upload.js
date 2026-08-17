/* ==========================================================================
   upload.js — Carga de archivos .txt delimitados por pipe (|)
   Formato: study_modality | month | qty
   Ejemplo: CR | 07/2026 | 73
   ========================================================================== */
(function (global) {
  'use strict';

  const MedApp = global.MedApp = global.MedApp || {};
  const Views = MedApp.Views = MedApp.Views || {};

  function parseTxt(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const records = [];

    for (const line of lines) {
      if (line.includes('---')) continue;

      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 3) continue;

      const modality = parts[0].toUpperCase();
      const monthRaw = parts[1];
      const qty = parseInt(parts[2], 10);

      if (!modality || !monthRaw || isNaN(qty) || qty <= 0) continue;

      const monthMatch = monthRaw.match(/^(\d{1,2})\/(\d{4})$/);
      if (!monthMatch) continue;

      const month = parseInt(monthMatch[1], 10);
      const year = parseInt(monthMatch[2], 10);

      if (month < 1 || month > 12 || year < 2000) continue;

      records.push({ year, month, modality, studies: qty });
    }

    return records;
  }

  Views.upload = {
    mount(container) {
      MedApp.Lifecycle.beforeMount('upload');

      container.innerHTML = `
        <div class="mb-16">
          <h1>Carga de datos</h1>
          <p class="muted">Suba un archivo .txt con el formato: <code>study_modality | month | qty</code></p>
        </div>

        <div class="card">
          <h3>Subir archivo .txt</h3>

          <div class="grid grid-2 mt-16">
            <div class="field">
              <label class="label" for="upClient">Cliente</label>
              <select id="upClient" class="control"></select>
            </div>
            <div class="field">
              <label class="label" for="upYear">Año (opcional — si el .txt trae MM/YYYY se ignora)</label>
              <select id="upYear" class="control">
                <option value="auto">Automático (desde el archivo)</option>
              </select>
            </div>
          </div>

          <div class="dropzone mt-16" id="dropzone" role="button" tabindex="0" aria-label="Zona de carga de archivos .txt">
            <div class="dz-ic">
              <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
            <p><b>Arrastre aquí su archivo .txt</b> o haga clic para seleccionarlo</p>
            <p class="muted">Formato: study_modality | month | qty</p>
            <input type="file" id="fileInput" accept=".txt" hidden />
          </div>

          <div class="hint-box mt-16">
            <b>Formato del archivo:</b><br />
            <pre style="margin:8px 0;padding:8px;background:var(--bg-alt);border-radius:4px">study_modality |  month   | qty
----------------+---------+-----
 CR             | 07/2026 |  73
 RX             | 07/2026 | 120</pre>
            <span class="muted">Una línea por modalidad. El separador es <code>|</code> (pipe). El año se lee del campo <code>month</code> (MM/YYYY).</span>
          </div>
        </div>

        <div id="upResult"></div>
      `;

      const clientSel = container.querySelector('#upClient');
      const clients = MedApp.Store.getClientNames();
      clients.forEach(c => {
        const op = document.createElement('option');
        op.value = c; op.textContent = c;
        clientSel.appendChild(op);
      });

      const yearSel = container.querySelector('#upYear');
      const years = MedApp.Utils.YEARS;
      years.forEach(y => {
        const op = document.createElement('option');
        op.value = y; op.textContent = y;
        yearSel.appendChild(op);
      });

      const dropzone = container.querySelector('#dropzone');
      const fileInput = container.querySelector('#fileInput');

      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
      });
      fileInput.addEventListener('change', e => {
        if (e.target.files[0]) Views.upload._handle(e.target.files[0]);
        e.target.value = '';
      });

      ['dragover', 'dragenter'].forEach(ev => dropzone.addEventListener(ev, e => {
        e.preventDefault(); dropzone.classList.add('dragover');
      }));
      ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, e => {
        e.preventDefault(); dropzone.classList.remove('dragover');
      }));
      dropzone.addEventListener('drop', e => {
        const file = e.dataTransfer?.files?.[0];
        if (file) Views.upload._handle(file);
      });

      MedApp.Lifecycle.afterMount('upload');
    },

    _handle(file) {
      const client = document.getElementById('upClient').value;
      const yearOverride = document.getElementById('upYear').value;

      if (!client) {
        MedApp.Utils.toast('Seleccione un cliente.', 'error');
        return;
      }

      const el = document.getElementById('upResult');
      el.innerHTML = MedApp.UI.loading('Procesando <b>' + MedApp.Utils.escapeHtml(file.name) + '</b>…');

      const reader = new FileReader();
      reader.onload = ev => {
        const records = parseTxt(ev.target.result);

        if (records.length === 0) {
          el.innerHTML = `
            <div class="card">
              <div class="empty-state">
                <strong>No se encontraron datos válidos</strong>
                <span>Verifique que el archivo tenga el formato: study_modality | month | qty</span>
              </div>
            </div>`;
          MedApp.Utils.toast('Formato de archivo no reconocido.', 'error');
          return;
        }

        const fullRecords = records.map(r => ({
          year: yearOverride !== 'auto' ? parseInt(yearOverride, 10) : r.year,
          month: r.month,
          client: client,
          modality: r.modality,
          studies: r.studies
        }));

        const displayYear = yearOverride !== 'auto' ? parseInt(yearOverride, 10) : fullRecords[0].year;
        Views.upload._showResult(el, file.name, client, displayYear, fullRecords);
      };
      reader.readAsText(file, 'utf-8');
    },

    _showResult(el, name, client, year, records) {
      const distinctMods = new Set(records.map(r => r.modality)).size;
      const sum = records.reduce((a, r) => a + r.studies, 0);
      const preview = records.slice(0, 10);

      el.innerHTML = `
        <div class="card">
          <div class="card-head">
            <div>
              <h3>Vista previa · <span class="muted" style="font-size:13px">${MedApp.Utils.escapeHtml(name)}</span></h3>
              <p class="card-sub">Cliente: <b>${MedApp.Utils.escapeHtml(client)}</b> · Año: <b>${year}</b></p>
            </div>
            <div class="flex gap-8">
              <button id="upIngest" class="btn btn-primary">Cargar Archivo</button>
              <button id="upCancel" class="btn btn-ghost">Descartar</button>
            </div>
          </div>

          <div class="grid grid-3 mb-16">
            <div class="kpi-card"><span class="kpi-label">Registros</span><span class="kpi-value">${records.length}</span><span class="kpi-sub">filas a procesar</span></div>
            <div class="kpi-card"><span class="kpi-label">Modalidades</span><span class="kpi-value">${distinctMods}</span><span class="kpi-sub">detectadas</span></div>
            <div class="kpi-card"><span class="kpi-label">Volumen</span><span class="kpi-value">${MedApp.Utils.fmtExact(sum)}</span><span class="kpi-sub">estudios totales</span></div>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Año</th><th>Mes</th><th style="text-align:left">Cliente</th><th style="text-align:left">Modalidad</th><th>Estudios</th></tr></thead>
              <tbody>${preview.map(r => `<tr>
                <td>${r.year}</td>
                <td>${MedApp.Utils.monthShort(r.month)}</td>
                <td style="text-align:left">${MedApp.Utils.escapeHtml(r.client)}</td>
                <td style="text-align:left">${MedApp.Utils.escapeHtml(r.modality)}</td>
                <td><b>${MedApp.Utils.fmtExact(r.studies)}</b></td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
          <p class="muted mt-8" style="font-size:12.5px">${records.length > 10 ? 'Mostrando las primeras 10 de ' + records.length + ' filas.' : ''}</p>
        </div>
      `;

      document.getElementById('upIngest').addEventListener('click', async () => {
        const btn = document.getElementById('upIngest');
        btn.disabled = true;
        btn.textContent = 'Validando…';

        try {
          const resp = await fetch('/api/records');
          const data = await resp.json();
          const serverRecords = data.records || [];

          const conflicts = [];
          for (const rec of records) {
            const match = serverRecords.find(s =>
              s.year === rec.year && s.month === rec.month &&
              s.client === rec.client && s.modality === rec.modality
            );
            if (match) {
              conflicts.push({ ...match, newStudies: rec.studies });
            }
          }

          if (conflicts.length > 0) {
            const listHtml = conflicts.map(c =>
              `<li>${c.modality} — ${MedApp.Utils.monthShort(c.month)}/${c.year}: <b>${c.studies}</b> → <b>${c.newStudies}</b></li>`
            ).join('');

            el.innerHTML = `
              <div class="card">
                <h3>Datos existentes en el servidor</h3>
                <p class="muted mt-8">Ya hay registros para <b>${MedApp.Utils.escapeHtml(client)}</b> en:</p>
                <ul style="margin:12px 0;padding-left:20px">${listHtml}</ul>
                <p class="muted">¿Desea sobrescribir estos datos?</p>
                <div class="flex gap-8 mt-16">
                  <button id="upConfirmOverwrite" class="btn btn-primary">Sí, sobrescribir</button>
                  <button id="upCancelOverwrite" class="btn btn-ghost">Cancelar</button>
                </div>
              </div>`;

            document.getElementById('upConfirmOverwrite').addEventListener('click', () => {
              Views.upload._doIngest(el, records, client);
            });
            document.getElementById('upCancelOverwrite').addEventListener('click', () => {
              Views.upload._showResult(el, name, client, year, records);
            });
            return;
          }

          await Views.upload._doIngest(el, records, client);
        } catch (err) {
          MedApp.Utils.toast('No se pudo validar con el servidor. Intente de nuevo.', 'error');
          btn.disabled = false;
          btn.textContent = 'Cargar Archivo';
        }
      });

      document.getElementById('upCancel').addEventListener('click', () => {
        el.innerHTML = '<div class="card"><p class="muted">Ingesta descartada.</p></div>';
      });
    },

    async _doIngest(el, records, client) {
      const btn = document.getElementById('upIngest');
      if (btn) { btn.disabled = true; btn.textContent = 'Cargando…'; }

      const result = MedApp.Store.upsert(records);
      MedApp.Utils.toast('Ingesta completada: ' + result.added + ' nuevos · ' + result.updated + ' actualizados.', 'success');

      if (btn) btn.textContent = 'Sincronizando…';
      try {
        const allRecords = MedApp.Store.getRecords();
        const rates = MedApp.Store.getRates();
        const resp = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: allRecords, rates })
        });
        const data = await resp.json();
        if (data.success) {
          MedApp.Utils.toast('Servidor sincronizado: ' + data.records + ' registros guardados.', 'success');
        } else {
          MedApp.Utils.toast('Error del servidor: ' + (data.error || 'Desconocido'), 'error');
        }
      } catch (err) {
        MedApp.Utils.toast('No se pudo conectar al servidor. Asegúrese de que server.js está corriendo.', 'error');
      }

      el.innerHTML = `
        <div class="card">
          <div class="grid grid-3">
            <div class="kpi-card"><span class="kpi-label">Nuevos registros</span><span class="kpi-value">${result.added}</span><span class="kpi-sub">agregados</span></div>
            <div class="kpi-card"><span class="kpi-label">Actualizados</span><span class="kpi-value">${result.updated}</span><span class="kpi-sub">sobrescritos</span></div>
            <div class="kpi-card"><span class="kpi-label">Total en base</span><span class="kpi-value">${MedApp.Store.getRecords().length}</span><span class="kpi-sub">registros</span></div>
          </div>
          <div class="mt-16 flex gap-8">
            <a class="btn btn-primary" href="#dashboard">Ir al dashboard</a>
            <button class="btn" id="upExport">Exportar base completa (CSV)</button>
          </div>
        </div>`;
      document.getElementById('upExport').addEventListener('click', () => {
        MedApp.Utils.downloadCsv('medanalytics_base_completa.csv', MedApp.Store.toCSV());
      });
      MedApp.App.updateStatus();
    }
  };

})(window);

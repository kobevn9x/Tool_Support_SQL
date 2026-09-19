/**
 * SQL Server object browser and script export.
 */

const sqlExportState = {
    objects: [],
    selected: new Set(),
    downloadUrls: []
};

function sqlExportObjectKey(object) {
    return JSON.stringify([object.type, object.schema, object.name]);
}

function filterSqlExportObjects(objects, query) {
    const term = query.trim().toLocaleLowerCase();
    return term
        ? objects.filter(object => `${object.schema}.${object.name}`.toLocaleLowerCase().includes(term))
        : objects;
}

function normalizeSqlExportFileName(fileName, object) {
    const fallback = object.type === 'StoredProcedure' ? `${object.name}.Procedure.sql` : `${object.name}.Table.sql`;
    const normalized = String(fileName || fallback)
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
        .replace(/[. ]+$/g, '');
    const withExtension = normalized.toLocaleLowerCase().endsWith('.sql') ? normalized : `${normalized}.sql`;
    const base = withExtension.slice(0, -4).slice(0, 176).replace(/[. ]+$/g, '') || 'script';
    return `${base}.sql`;
}

function uniqueSqlExportFileName(fileName, usedNames) {
    let candidate = fileName;
    let counter = 2;
    while (usedNames.has(candidate.toLocaleLowerCase())) {
        const suffix = ` (${counter++}).sql`;
        candidate = `${fileName.slice(0, -4).slice(0, 180 - suffix.length)}${suffix}`;
    }
    usedNames.add(candidate.toLocaleLowerCase());
    return candidate;
}

const SQL_EXPORT_API_ORIGIN = (() => {
    const localServer = (location.hostname === '127.0.0.1' || location.hostname === 'localhost')
        && location.port === '5178';
    return localServer ? '' : 'http://127.0.0.1:5178';
})();

async function sqlExportRequest(url, options) {
    const response = await fetch(SQL_EXPORT_API_ORIGIN + url, options);
    let body = null;
    try {
        body = await response.json();
    } catch (_) {
        // The UI intentionally does not expose raw server responses.
    }
    if (!response.ok || !body) throw new Error(`Request failed (${response.status})`);
    return body;
}

function setSqlExportStatus(key, state, ...args) {
    const status = document.getElementById('sqlExportStatus');
    const dot = document.getElementById('sqlExportStatusDot');
    if (!status || !dot) return;
    const value = t(key);
    status.textContent = typeof value === 'function' ? value(...args) : value;
    dot.className = `sql-export-status-dot ${state || ''}`.trim();
}

function getVisibleSqlExportObjects() {
    const query = document.getElementById('sqlExportSearch')?.value || '';
    return filterSqlExportObjects(sqlExportState.objects, query);
}

function createSqlExportObjectRow(object) {
    const key = sqlExportObjectKey(object);
    const selected = sqlExportState.selected.has(key);
    const label = document.createElement('label');
    label.className = selected ? 'sql-export-object is-selected' : 'sql-export-object';
    label.dataset.key = key;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selected;
    checkbox.addEventListener('change', () => {
        checkbox.checked ? sqlExportState.selected.add(key) : sqlExportState.selected.delete(key);
        label.classList.toggle('is-selected', checkbox.checked);
        updateSqlExportSelection();
    });

    const name = document.createElement('span');
    name.textContent = `${object.schema}.${object.name}`;
    label.append(checkbox, name);
    return label;
}

function renderSqlExportList(containerId, objects) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.replaceChildren();

    if (!objects.length) {
        const empty = document.createElement('p');
        empty.className = 'sql-export-empty';
        empty.textContent = t('sqlExportEmpty');
        container.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();
    objects.forEach(object => fragment.appendChild(createSqlExportObjectRow(object)));
    container.appendChild(fragment);
}

function renderSqlExportObjects() {
    const visible = getVisibleSqlExportObjects();
    const procedures = visible.filter(object => object.type === 'StoredProcedure');
    const tables = visible.filter(object => object.type === 'Table');
    renderSqlExportList('sqlExportProceduresList', procedures);
    renderSqlExportList('sqlExportTablesList', tables);
    updateSqlExportSelection();
}

function selectedSqlExportObjects() {
    return sqlExportState.objects.filter(object => sqlExportState.selected.has(sqlExportObjectKey(object)));
}

function renderSqlExportQueueList(containerId, objects) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.replaceChildren();
    if (!objects.length) {
        const empty = document.createElement('li');
        empty.className = 'sql-export-queue-empty';
        empty.textContent = t('sqlExportQueueEmpty');
        container.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();
    objects.forEach(object => {
        const item = document.createElement('li');
        item.className = 'sql-export-queue-item';
        const name = document.createElement('span');
        name.textContent = `${object.schema}.${object.name}`;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'sql-export-queue-remove';
        remove.textContent = t('sqlExportRemoveSelected');
        remove.addEventListener('click', () => {
            sqlExportState.selected.delete(sqlExportObjectKey(object));
            syncSqlExportListSelection();
            updateSqlExportSelection();
        });
        item.append(name, remove);
        fragment.appendChild(item);
    });
    container.appendChild(fragment);
}

function updateSqlExportSelection() {
    const selected = selectedSqlExportObjects();
    const procedures = selected.filter(object => object.type === 'StoredProcedure');
    const tables = selected.filter(object => object.type === 'Table');
    const visible = getVisibleSqlExportObjects();
    document.getElementById('sqlExportSelectionCount').textContent = t('sqlExportSelected')(selected.length);
    document.getElementById('sqlExportProcedureMeta').textContent = t('sqlExportListMeta')(
        procedures.length,
        visible.filter(object => object.type === 'StoredProcedure').length
    );
    document.getElementById('sqlExportTableMeta').textContent = t('sqlExportListMeta')(
        tables.length,
        visible.filter(object => object.type === 'Table').length
    );
    document.getElementById('sqlExportQueueSummary').textContent = t('sqlExportQueueSummary')(procedures.length, tables.length);
    renderSqlExportQueueList('sqlExportSelectedProcedures', procedures);
    renderSqlExportQueueList('sqlExportSelectedTables', tables);
    document.getElementById('sqlExportDownloadBtn').disabled = selected.length === 0;
}
function syncSqlExportListSelection() {
    document.querySelectorAll('.sql-export-object').forEach(label => {
        const selected = sqlExportState.selected.has(label.dataset.key);
        label.classList.toggle('is-selected', selected);
        const checkbox = label.querySelector('input');
        if (checkbox) checkbox.checked = selected;
    });
}

function selectVisibleSqlExportObjects(type) {
    const visible = getVisibleSqlExportObjects();
    sqlExportState.selected.clear();
    visible.filter(object => !type || object.type === type)
        .forEach(object => sqlExportState.selected.add(sqlExportObjectKey(object)));
    syncSqlExportListSelection();
    updateSqlExportSelection();
}

function deselectVisibleSqlExportObjects() {
    const visible = getVisibleSqlExportObjects();
    visible.forEach(object => sqlExportState.selected.delete(sqlExportObjectKey(object)));
    syncSqlExportListSelection();
    updateSqlExportSelection();
}

function normalizeSqlExportObjects(body) {
    return [...(body.storedProcedures || []), ...(body.tables || [])].filter(object =>
        object &&
        (object.type === 'StoredProcedure' || object.type === 'Table') &&
        typeof object.schema === 'string' &&
        typeof object.name === 'string'
    );
}

function clearSqlExportObjects() {
    sqlExportState.objects = [];
    sqlExportState.selected.clear();
    renderSqlExportObjects();
}

async function loadSqlExportObjects() {
    try {
        const body = await sqlExportRequest('/api/sql/objects');
        sqlExportState.objects = normalizeSqlExportObjects(body);
        const available = new Set(sqlExportState.objects.map(sqlExportObjectKey));
        sqlExportState.selected.forEach(key => {
            if (!available.has(key)) sqlExportState.selected.delete(key);
        });
        renderSqlExportObjects();
        return true;
    } catch (_) {
        clearSqlExportObjects();
        setSqlExportStatus('sqlExportLoadFailed', 'error');
        showToast(t('sqlExportLoadFailed'), 'error');
        return false;
    }
}

async function loadSqlExportStatus() {
    if (typeof Neutralino !== 'undefined' && typeof ensureSqlServerSidecar === 'function') {
        setSqlExportStatus('sqlExportStartingServer', '');
        const ready = await ensureSqlServerSidecar();
        if (!ready) {
            clearSqlExportObjects();
            setSqlExportStatus('sqlExportServerStartFailed', 'error');
            return;
        }
    }
    setSqlExportStatus('sqlExportChecking', '');
    try {
        const status = await sqlExportRequest('/api/sql/status');
        if (!status.configured) {
            clearSqlExportObjects();
            setSqlExportStatus('sqlExportNotConfigured', 'error');
            return;
        }
        if (!status.connected) {
            clearSqlExportObjects();
            setSqlExportStatus('sqlExportDisconnected', 'error');
            return;
        }
        setSqlExportStatus('sqlExportConnected', 'connected', status.server || 'SQL Server', status.database || 'Database');
        if (await loadSqlExportObjects()) {
            setSqlExportStatus('sqlExportConnected', 'connected', status.server || 'SQL Server', status.database || 'Database');
        }
    } catch (_) {
        clearSqlExportObjects();
        setSqlExportStatus('sqlExportDisconnected', 'error');
    }
}

async function testSqlExportConnection() {
    const button = document.getElementById('sqlExportTestBtn');
    button.disabled = true;
    setSqlExportStatus('sqlExportChecking', '');
    try {
        const status = await sqlExportRequest('/api/sql/status');
        if (!status.connected) throw new Error('disconnected');
        showToast(t('sqlExportTestSuccess'), 'success');
        await loadSqlExportStatus();
    } catch (_) {
        setSqlExportStatus('sqlExportDisconnected', 'error');
        showToast(t('sqlExportTestFailed'), 'error');
    } finally {
        button.disabled = false;
    }
}

async function setupSqlExportConnection(event) {
    event.preventDefault();
    const button = document.getElementById('sqlExportSetupBtn');
    const password = document.getElementById('sqlExportPassword');
    button.disabled = true;
    setSqlExportStatus('sqlExportChecking', '');
    try {
        await sqlExportRequest('/api/sql/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                server: document.getElementById('sqlExportServer').value.trim(),
                database: document.getElementById('sqlExportDatabase').value.trim(),
                username: document.getElementById('sqlExportUsername').value.trim(),
                password: password.value,
                trustServerCertificate: document.getElementById('sqlExportTrustCertificate').checked
            })
        });
        showToast(t('sqlExportSetupSuccess'), 'success');
        await loadSqlExportStatus();
    } catch (_) {
        setSqlExportStatus('sqlExportSetupFailed', 'error');
        showToast(t('sqlExportSetupFailed'), 'error');
    } finally {
        password.value = '';
        button.disabled = false;
    }
}

function clearSqlExportDownloads() {
    sqlExportState.downloadUrls.forEach(URL.revokeObjectURL);
    sqlExportState.downloadUrls = [];
    document.getElementById('sqlExportDownloads').replaceChildren();
}

async function requestSqlExportScripts(objects) {
    const body = await sqlExportRequest('/api/sql/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objects: objects.map(object => ({ type: object.type, schema: object.schema, name: object.name })) })
    });
    if (!Array.isArray(body.scripts) || body.scripts.length !== objects.length) throw new Error('Invalid script response');
    return body.scripts.map((script, index) => {
        if (!script || typeof script.content !== 'string') throw new Error('Invalid script response');
        return { fileName: normalizeSqlExportFileName(script.fileName, objects[index]), content: script.content };
    });
}

let sqlExportProgressTimeout = null;

function showSqlExportProgressModal(title = 'Exporting SQL Scripts') {
    if (sqlExportProgressTimeout) {
        clearTimeout(sqlExportProgressTimeout);
        sqlExportProgressTimeout = null;
    }
    const overlay = document.getElementById('sqlExportProgressOverlay');
    const titleEl = document.getElementById('sqlExportProgressTitle');
    const bar = document.getElementById('sqlExportProgressBar');
    const countEl = document.getElementById('sqlExportProgressCount');
    const percentEl = document.getElementById('sqlExportProgressPercent');
    const currentEl = document.getElementById('sqlExportProgressCurrent');
    const closeBtn = document.getElementById('sqlExportProgressCloseBtn');

    if (titleEl) titleEl.textContent = title;
    if (bar) bar.style.width = '0%';
    if (countEl) countEl.textContent = 'Preparing scripts...';
    if (percentEl) percentEl.textContent = '0%';
    if (currentEl) currentEl.textContent = '';
    if (closeBtn) closeBtn.disabled = true;
    if (overlay) overlay.style.display = 'flex';
}

function updateSqlExportProgress(current, total, currentFileName = '') {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const bar = document.getElementById('sqlExportProgressBar');
    const countEl = document.getElementById('sqlExportProgressCount');
    const percentEl = document.getElementById('sqlExportProgressPercent');
    const currentEl = document.getElementById('sqlExportProgressCurrent');

    if (bar) bar.style.width = `${percent}%`;
    if (countEl) countEl.textContent = `Saving ${current}/${total}`;
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (currentEl) currentEl.textContent = currentFileName ? `Current: ${currentFileName}` : '';
}

function completeSqlExportProgress(total) {
    const bar = document.getElementById('sqlExportProgressBar');
    const countEl = document.getElementById('sqlExportProgressCount');
    const percentEl = document.getElementById('sqlExportProgressPercent');
    const currentEl = document.getElementById('sqlExportProgressCurrent');
    const closeBtn = document.getElementById('sqlExportProgressCloseBtn');

    if (bar) bar.style.width = '100%';
    if (countEl) countEl.textContent = `Completed! Saved ${total}/${total} files.`;
    if (percentEl) percentEl.textContent = '100%';
    if (currentEl) currentEl.textContent = 'All scripts exported successfully.';
    if (closeBtn) closeBtn.disabled = false;

    sqlExportProgressTimeout = setTimeout(() => {
        closeSqlExportProgressModal();
    }, 1500);
}

function failSqlExportProgress(errorMessage) {
    const countEl = document.getElementById('sqlExportProgressCount');
    const currentEl = document.getElementById('sqlExportProgressCurrent');
    const closeBtn = document.getElementById('sqlExportProgressCloseBtn');

    if (countEl) countEl.textContent = 'Export failed';
    if (currentEl) currentEl.textContent = errorMessage || 'An error occurred during export.';
    if (closeBtn) closeBtn.disabled = false;
}

function closeSqlExportProgressModal() {
    if (sqlExportProgressTimeout) {
        clearTimeout(sqlExportProgressTimeout);
        sqlExportProgressTimeout = null;
    }
    const overlay = document.getElementById('sqlExportProgressOverlay');
    if (overlay) overlay.style.display = 'none';
}

async function saveSqlExportToDirectory(directory, scripts, onProgress) {
    const usedNames = new Set();
    const total = scripts.length;
    for (let i = 0; i < total; i++) {
        const script = scripts[i];
        const fileName = uniqueSqlExportFileName(script.fileName, usedNames);
        if (typeof onProgress === 'function') {
            onProgress(i + 1, total, fileName);
        }
        const handle = await directory.getFileHandle(fileName, { create: true });
        const writable = await handle.createWritable();
        await writable.write(script.content);
        await writable.close();
    }
}

function createSqlExportDownloadLinks(scripts) {
    const container = document.getElementById('sqlExportDownloads');
    const usedNames = new Set();
    const title = document.createElement('p');
    title.className = 'comment-help';
    title.textContent = t('sqlExportManualTitle');
    container.appendChild(title);

    for (const script of scripts) {
        const fileName = uniqueSqlExportFileName(script.fileName, usedNames);
        const url = URL.createObjectURL(new Blob([script.content], { type: 'text/sql;charset=utf-8' }));
        sqlExportState.downloadUrls.push(url);

        const link = document.createElement('a');
        link.className = 'btn btn-secondary sql-export-download-link';
        link.href = url;
        link.download = fileName;
        link.textContent = fileName;
        container.appendChild(link);
    }
}

async function exportSelectedSqlObjects() {
    const selected = selectedSqlExportObjects();
    if (!selected.length) return;

    const button = document.getElementById('sqlExportDownloadBtn');
    button.disabled = true;
    clearSqlExportDownloads();
    try {
        const directory = 'showDirectoryPicker' in window
            ? await window.showDirectoryPicker({ mode: 'readwrite' })
            : null;

        showSqlExportProgressModal();
        const currentEl = document.getElementById('sqlExportProgressCurrent');
        if (currentEl) currentEl.textContent = 'Requesting scripts from server...';

        const scripts = await requestSqlExportScripts(selected);
        if (directory) {
            await saveSqlExportToDirectory(directory, scripts, (current, total, fileName) => {
                updateSqlExportProgress(current, total, fileName);
            });
            completeSqlExportProgress(selected.length);
            showToast(t('sqlExportSaved')(selected.length), 'success');
        } else {
            createSqlExportDownloadLinks(scripts);
            completeSqlExportProgress(selected.length);
        }
    } catch (error) {
        if (error?.name === 'AbortError') {
            closeSqlExportProgressModal();
        } else {
            failSqlExportProgress(error?.message || 'Export failed');
            showToast(t('sqlExportFailed'), 'error');
        }
    } finally {
        button.disabled = sqlExportState.selected.size === 0;
    }
}

function refreshSqlExportLanguage() {
    if (!document.getElementById('sqlExportSelectionCount')) return;
    renderSqlExportObjects();
}

function runSqlExportTests() {
    const objects = [
        { type: 'Table', schema: 'sales', name: 'Orders' },
        { type: 'StoredProcedure', schema: 'dbo', name: 'GetUsers' }
    ];
    console.assert(filterSqlExportObjects(objects, 'sales.ord').length === 1, 'SQL export filtering');
    console.assert(normalizeSqlExportFileName('', objects[0]) === 'Orders.Table.sql', 'SQL export table filename');
    console.assert(normalizeSqlExportFileName('', objects[1]) === 'GetUsers.Procedure.sql', 'SQL export procedure filename');
    console.assert(normalizeSqlExportFileName('../bad:name', objects[0]) === '.._bad_name.sql', 'SQL export filename safety');
    console.assert(sqlExportObjectKey({ type: 'Table', schema: 'a|b', name: 'c' }) !== sqlExportObjectKey({ type: 'Table', schema: 'a', name: 'b|c' }), 'SQL export selection keys');
    const usedNames = new Set();
    console.assert(uniqueSqlExportFileName('Table.dbo.a_b.sql', usedNames) === 'Table.dbo.a_b.sql', 'SQL export first filename');
    console.assert(uniqueSqlExportFileName('Table.dbo.a_b.sql', usedNames) === 'Table.dbo.a_b (2).sql', 'SQL export duplicate filename');
    sqlExportState.objects = objects;
    sqlExportState.selected = new Set([sqlExportObjectKey(objects[1])]);
    console.assert(selectedSqlExportObjects()[0]?.type === 'StoredProcedure', 'SQL export selected grouping');
    sqlExportState.objects = [];
    sqlExportState.selected.clear();
    console.info('SQL export self-tests passed.');
}

async function initSqlExport() {
    document.getElementById('sqlExportSearch').addEventListener('input', renderSqlExportObjects);
    document.getElementById('sqlExportRefreshBtn').addEventListener('click', loadSqlExportStatus);
    document.getElementById('sqlExportTestBtn').addEventListener('click', testSqlExportConnection);
    document.getElementById('sqlExportSetupForm').addEventListener('submit', setupSqlExportConnection);
    document.getElementById('sqlExportClearBtn').addEventListener('click', () => {
        sqlExportState.selected.clear();
        syncSqlExportListSelection();
        updateSqlExportSelection();
    });
    document.getElementById('sqlExportSelectVisibleBtn').addEventListener('click', () => selectVisibleSqlExportObjects());
    document.getElementById('sqlExportDeselectVisibleBtn').addEventListener('click', deselectVisibleSqlExportObjects);
    document.getElementById('sqlExportSelectProceduresBtn').addEventListener('click', () => selectVisibleSqlExportObjects('StoredProcedure'));
    document.getElementById('sqlExportSelectTablesBtn').addEventListener('click', () => selectVisibleSqlExportObjects('Table'));
    document.getElementById('sqlExportDownloadBtn').addEventListener('click', exportSelectedSqlObjects);
    document.getElementById('sqlExportProgressCloseBtn').addEventListener('click', closeSqlExportProgressModal);
    window.addEventListener('beforeunload', clearSqlExportDownloads);
    updateSqlExportSelection();
    await loadSqlExportStatus();
}

window.addEventListener('DOMContentLoaded', initSqlExport);

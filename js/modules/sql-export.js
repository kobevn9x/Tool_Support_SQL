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
    const fallback = `${object.type}.${object.schema}.${object.name}.sql`;
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

async function sqlExportRequest(url, options) {
    const response = await fetch(url, options);
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
    const label = document.createElement('label');
    label.className = 'sql-export-object';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = sqlExportState.selected.has(sqlExportObjectKey(object));
    checkbox.addEventListener('change', () => {
        const key = sqlExportObjectKey(object);
        checkbox.checked ? sqlExportState.selected.add(key) : sqlExportState.selected.delete(key);
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
    renderSqlExportList('sqlExportProceduresList', visible.filter(object => object.type === 'StoredProcedure'));
    renderSqlExportList('sqlExportTablesList', visible.filter(object => object.type === 'Table'));
    updateSqlExportSelection();
}

function updateSqlExportSelection() {
    const count = sqlExportState.selected.size;
    const value = t('sqlExportSelected');
    document.getElementById('sqlExportSelectionCount').textContent = value(count);
    document.getElementById('sqlExportDownloadBtn').disabled = count === 0;
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
        await sqlExportRequest('/api/sql/test', { method: 'POST' });
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

async function saveSqlExportToDirectory(directory, scripts) {
    const usedNames = new Set();
    for (const script of scripts) {
        const fileName = uniqueSqlExportFileName(script.fileName, usedNames);
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
    const selected = sqlExportState.objects.filter(object => sqlExportState.selected.has(sqlExportObjectKey(object)));
    if (!selected.length) return;

    const button = document.getElementById('sqlExportDownloadBtn');
    button.disabled = true;
    clearSqlExportDownloads();
    try {
        const directory = 'showDirectoryPicker' in window
            ? await window.showDirectoryPicker({ mode: 'readwrite' })
            : null;
        showToast(t('sqlExportGenerating')(1, selected.length), 'info');
        const scripts = await requestSqlExportScripts(selected);
        if (directory) {
            await saveSqlExportToDirectory(directory, scripts);
            showToast(t('sqlExportSaved')(selected.length), 'success');
        } else {
            createSqlExportDownloadLinks(scripts);
        }
    } catch (error) {
        if (error?.name !== 'AbortError') showToast(t('sqlExportFailed'), 'error');
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
    console.assert(normalizeSqlExportFileName('../bad:name', objects[0]) === '.._bad_name.sql', 'SQL export filename safety');
    console.assert(sqlExportObjectKey({ type: 'Table', schema: 'a|b', name: 'c' }) !== sqlExportObjectKey({ type: 'Table', schema: 'a', name: 'b|c' }), 'SQL export selection keys');
    const usedNames = new Set();
    console.assert(uniqueSqlExportFileName('Table.dbo.a_b.sql', usedNames) === 'Table.dbo.a_b.sql', 'SQL export first filename');
    console.assert(uniqueSqlExportFileName('Table.dbo.a_b.sql', usedNames) === 'Table.dbo.a_b (2).sql', 'SQL export duplicate filename');
    console.info('SQL export self-tests passed.');
}

function initSqlExport() {
    document.getElementById('sqlExportSearch').addEventListener('input', renderSqlExportObjects);
    document.getElementById('sqlExportRefreshBtn').addEventListener('click', loadSqlExportStatus);
    document.getElementById('sqlExportTestBtn').addEventListener('click', testSqlExportConnection);
    document.getElementById('sqlExportSetupForm').addEventListener('submit', setupSqlExportConnection);
    document.getElementById('sqlExportClearBtn').addEventListener('click', () => {
        sqlExportState.selected.clear();
        renderSqlExportObjects();
    });
    document.getElementById('sqlExportSelectVisibleBtn').addEventListener('click', () => {
        getVisibleSqlExportObjects().forEach(object => sqlExportState.selected.add(sqlExportObjectKey(object)));
        renderSqlExportObjects();
    });
    document.getElementById('sqlExportDownloadBtn').addEventListener('click', exportSelectedSqlObjects);
    window.addEventListener('beforeunload', clearSqlExportDownloads);
    updateSqlExportSelection();
    loadSqlExportStatus();
}

window.addEventListener('DOMContentLoaded', initSqlExport);

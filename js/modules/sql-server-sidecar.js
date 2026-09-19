/**
 * Starts ToolSql.Server.exe next to the portable app and stops it on close.
 */

const sqlServerSidecar = {
    origin: 'http://127.0.0.1:5178',
    processId: null,
    startedHere: false,
    hooksBound: false
};

function sqlServerSidecarAvailable() {
    return typeof Neutralino !== 'undefined'
        && typeof window.NL_PORT !== 'undefined'
        && typeof window.NL_TOKEN !== 'undefined'
        && Boolean(Neutralino.os)
        && typeof Neutralino.os.spawnProcess === 'function';
}

function sqlServerSidecarDirectory() {
    const path = typeof NL_PATH === 'string' && NL_PATH
        ? NL_PATH
        : (typeof NL_CWD === 'string' && NL_CWD ? NL_CWD : '.');
    return path.replace(/[\\/]+$/, '');
}

async function sqlServerSidecarPing() {
    const response = await fetch(`${sqlServerSidecar.origin}/api/sql/status`, { cache: 'no-store' });
    return response.ok;
}

async function waitForSqlServerSidecar(timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            if (await sqlServerSidecarPing()) return true;
        } catch (_) {
            // Server is not listening yet.
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    return false;
}

function bindSqlServerSidecarHooks() {
    if (sqlServerSidecar.hooksBound) return;
    try {
        Neutralino.init();
    } catch (_) {
        // Native bridge already initialized.
    }
    Neutralino.events.on('windowClose', async () => {
        await stopSqlServerSidecar();
        await Neutralino.app.exit();
    });
    Neutralino.events.on('spawnedProcess', event => {
        if (event.detail.id === sqlServerSidecar.processId && event.detail.action === 'exit') {
            sqlServerSidecar.processId = null;
            sqlServerSidecar.startedHere = false;
        }
    });
    sqlServerSidecar.hooksBound = true;
}

async function startSqlServerSidecar() {
    if (!sqlServerSidecarAvailable()) return false;
    try {
        if (await sqlServerSidecarPing()) return true;
    } catch (_) {
        // Spawn a local copy when nothing is listening.
    }

    const appDir = sqlServerSidecarDirectory();
    const exePath = `${appDir}\\ToolSql.Server.exe`;
    const spawned = await Neutralino.os.spawnProcess(`"${exePath}"`, { cwd: appDir });
    sqlServerSidecar.processId = spawned.id;
    sqlServerSidecar.startedHere = true;
    return waitForSqlServerSidecar(15000);
}

async function stopSqlServerSidecar() {
    if (!sqlServerSidecar.startedHere || sqlServerSidecar.processId == null) return;
    try {
        await Neutralino.os.updateSpawnedProcess(sqlServerSidecar.processId, 'exit');
    } catch (_) {
        // Process already exited.
    }
}

async function ensureSqlServerSidecar() {
    if (!sqlServerSidecarAvailable()) return false;
    bindSqlServerSidecarHooks();
    try {
        return await startSqlServerSidecar();
    } catch (_) {
        return false;
    }
}

window.ensureSqlServerSidecar = ensureSqlServerSidecar;
window.sqlServerSidecar = sqlServerSidecar;

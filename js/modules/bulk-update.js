(function (global) {
    'use strict';

    const DELIMITERS = ['\t', ',', ';', '|'];
    const DELIMITER_LABELS = { '\t': 'TAB', ',': ',', ';': ';', '|': '|' };
    const KEYWORDS = new Set([
        'AS', 'BEGIN', 'COMMIT', 'DECLARE', 'FROM', 'INNER', 'INSERT', 'INTO',
        'JOIN', 'NVARCHAR', 'ON', 'ROLLBACK', 'SELECT', 'SET', 'TABLE', 'TRAN',
        'UPDATE', 'VALUES', 'WHERE'
    ]);
    const IDENTIFIER_PATTERN = '(?:[A-Za-z_][A-Za-z0-9_$#@]*|\\[(?:[^\\]]|\\]\\])+\\])';
    const TABLE_PATTERN = `${IDENTIFIER_PATTERN}(?:\\s*\\.\\s*${IDENTIFIER_PATTERN}){0,2}`;

    let lastFormatError = '';

    function error(messageKey, extra) {
        return Object.assign({ ok: false, messageKey }, extra || {});
    }

    function validIdentifier(value) {
        return new RegExp(`^${IDENTIFIER_PATTERN}$`).test(value);
    }

    function unbracketIdentifier(value) {
        if (value.startsWith('[') && value.endsWith(']')) {
            return value.slice(1, -1).replace(/\]\]/g, ']');
        }
        return value;
    }

    function quoteIdentifier(value) {
        return `[${unbracketIdentifier(value).replace(/\]/g, ']]')}]`;
    }

    function splitQualified(value) {
        const parts = [];
        let start = 0;
        let bracketed = false;
        for (let i = 0; i < value.length; i++) {
            const char = value[i];
            if (char === '[' && !bracketed) bracketed = true;
            else if (char === ']' && bracketed) {
                if (value[i + 1] === ']') i++;
                else bracketed = false;
            } else if (char === '.' && !bracketed) {
                parts.push(value.slice(start, i).trim());
                start = i + 1;
            }
        }
        parts.push(value.slice(start).trim());
        return parts;
    }

    function parseTemplate(template) {
        const source = String(template ?? '');
        if (!source.trim()) return error('bulkUpdateTemplateError');

        const pattern = new RegExp(
            `^\\s*UPDATE\\s+(${TABLE_PATTERN})\\s+SET\\s+(${IDENTIFIER_PATTERN})\\s*=\\s*\\{\\s*(${IDENTIFIER_PATTERN})\\s*\\}\\s+WHERE\\s+(${IDENTIFIER_PATTERN})\\s*=\\s*\\{\\s*(${IDENTIFIER_PATTERN})\\s*\\}\\s*;?\\s*$`,
            'i'
        );
        const match = source.match(pattern);
        if (!match) return error('bulkUpdateTemplateError');

        const tableParts = splitQualified(match[1]);
        if (tableParts.length < 1 || tableParts.length > 3 || !tableParts.every(validIdentifier)) {
            return error('bulkUpdateTemplateError');
        }

        const setColumn = match[2];
        const setPlaceholder = match[3];
        const keyColumn = match[4];
        const keyPlaceholder = match[5];
        const same = (left, right) => unbracketIdentifier(left).toLowerCase() === unbracketIdentifier(right).toLowerCase();
        if (!validIdentifier(setColumn) || !validIdentifier(keyColumn) || !validIdentifier(setPlaceholder) || !validIdentifier(keyPlaceholder) ||
            !same(setColumn, setPlaceholder) || !same(keyColumn, keyPlaceholder) || same(setColumn, keyColumn)) {
            return error('bulkUpdateTemplateError');
        }

        return {
            ok: true,
            table: tableParts.join('.'),
            tableParts,
            setColumn,
            setName: unbracketIdentifier(setColumn),
            setPlaceholder,
            keyColumn,
            keyName: unbracketIdentifier(keyColumn),
            keyPlaceholder,
            columns: [unbracketIdentifier(keyColumn), unbracketIdentifier(setColumn)]
        };
    }

    function parseRows(raw, expectedColumnCount) {
        const source = String(raw ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (/[\0-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(source)) {
            return error('bulkUpdateDataError');
        }
        const lines = source.split('\n');
        const nonEmpty = lines.map((text, index) => ({ text, line: index + 1 })).filter(item => item.text.trim() !== '');
        if (!nonEmpty.length) return { ok: true, rows: [], delimiter: null };

        let delimiter = null;
        for (const candidate of DELIMITERS) {
            if (nonEmpty.every(item => item.text.split(candidate).length === expectedColumnCount)) {
                delimiter = candidate;
                break;
            }
        }
        if (delimiter === null) {
            const firstBad = nonEmpty.find(item => !DELIMITERS.some(candidate => item.text.split(candidate).length === expectedColumnCount));
            return error('bulkUpdateDelimiterError', { line: firstBad ? firstBad.line : nonEmpty[0].line });
        }

        const rows = nonEmpty.map(item => item.text.split(delimiter).map(cell => {
            const trimmed = cell.trim();
            return trimmed ? trimmed : null;
        }));
        return { ok: true, rows, delimiter };
    }

    function buildPreviewModel(templateInfo, rowResult) {
        if (!templateInfo || !templateInfo.ok) return { headers: [], rows: [] };
        return {
            headers: [templateInfo.keyName, templateInfo.setName],
            rows: rowResult && rowResult.ok ? rowResult.rows : []
        };
    }

    function sqlLiteral(value) {
        if (value === null) return 'NULL';
        return `N'${String(value).replace(/'/g, "''")}'`;
    }

    function sqlType(rows, columnIndex) {
        let max = 0;
        rows.forEach(row => {
            if (row[columnIndex] !== null) max = Math.max(max, String(row[columnIndex]).length);
        });
        const length = Math.max(50, max);
        return length > 4000 ? 'NVARCHAR(MAX)' : `NVARCHAR(${length})`;
    }

    function generateSql(templateInfo, rows, mode) {
        if (!templateInfo || !templateInfo.ok || !Array.isArray(rows) || rows.length === 0) {
            throw new Error('Cannot generate SQL without valid template and rows');
        }
        const safeMode = mode === 'commit' ? 'commit' : 'rollback';
        const key = quoteIdentifier(templateInfo.keyColumn);
        const set = quoteIdentifier(templateInfo.setColumn);
        const table = templateInfo.tableParts.join('.');
        const lines = [
            'BEGIN TRAN;',
            '',
            'DECLARE @DATA TABLE (',
            `    ${key} ${sqlType(rows, 0)},`,
            `    ${set} ${sqlType(rows, 1)}`,
            ');',
            ''
        ];

        for (let start = 0; start < rows.length; start += 1000) {
            const batch = rows.slice(start, start + 1000);
            lines.push(`INSERT INTO @DATA (${key}, ${set})`);
            lines.push('VALUES');
            batch.forEach((row, index) => {
                const suffix = index === batch.length - 1 ? ';' : ',';
                lines.push(`    (${sqlLiteral(row[0])}, ${sqlLiteral(row[1])})${suffix}`);
            });
            lines.push('');
        }

        lines.push(
            'UPDATE T',
            `SET T.${set} = D.${set}`,
            `FROM ${table} AS T`,
            'INNER JOIN @DATA AS D',
            `    ON T.${key} = D.${key};`,
            '',
            `SELECT T.${key}, T.${set}`,
            `FROM ${table} AS T`,
            'INNER JOIN @DATA AS D',
            `    ON T.${key} = D.${key};`,
            '',
            safeMode === 'commit' ? '-- ROLLBACK TRAN;' : 'ROLLBACK TRAN;',
            safeMode === 'commit' ? 'COMMIT TRAN;' : '-- COMMIT TRAN;'
        );
        return lines.join('\n');
    }

    function tokenize(sql) {
        const tokens = [];
        let i = 0;
        const source = String(sql ?? '');
        while (i < source.length) {
            const char = source[i];
            if (/\s/.test(char)) { i++; continue; }
            if (source.startsWith('--', i)) {
                const end = source.indexOf('\n', i);
                const finish = end < 0 ? source.length : end;
                tokens.push({ type: 'line-comment', value: source.slice(i, finish) });
                i = finish;
                continue;
            }
            if (source.startsWith('/*', i)) {
                const end = source.indexOf('*/', i + 2);
                if (end < 0) return error('bulkUpdateUnclosedFormat');
                tokens.push({ type: 'block-comment', value: source.slice(i, end + 2) });
                i = end + 2;
                continue;
            }
            if (char === "'") {
                let end = i + 1;
                let closed = false;
                while (end < source.length) {
                    if (source[end] === "'") {
                        if (source[end + 1] === "'") { end += 2; continue; }
                        end++;
                        closed = true;
                        break;
                    }
                    end++;
                }
                if (!closed) return error('bulkUpdateUnclosedFormat');
                tokens.push({ type: 'string', value: source.slice(i, end) });
                i = end;
                continue;
            }
            if (char === '[') {
                let end = i + 1;
                let closed = false;
                while (end < source.length) {
                    if (source[end] === ']') {
                        if (source[end + 1] === ']') { end += 2; continue; }
                        end++;
                        closed = true;
                        break;
                    }
                    end++;
                }
                if (!closed) return error('bulkUpdateUnclosedFormat');
                tokens.push({ type: 'bracket', value: source.slice(i, end) });
                i = end;
                continue;
            }
            if (/[A-Za-z0-9_@$#]/.test(char)) {
                let end = i + 1;
                while (end < source.length && /[A-Za-z0-9_@$#]/.test(source[end])) end++;
                tokens.push({ type: 'word', value: source.slice(i, end) });
                i = end;
                continue;
            }
            const pair = source.slice(i, i + 2);
            if (['<>', '<=', '>=', '!='].includes(pair)) {
                tokens.push({ type: 'operator', value: pair });
                i += 2;
                continue;
            }
            tokens.push({ type: 'symbol', value: char });
            i++;
        }
        return { ok: true, tokens };
    }

    function normalizedToken(token) {
        if (token.type === 'word' && KEYWORDS.has(token.value.toUpperCase())) {
            return Object.assign({}, token, { value: token.value.toUpperCase() });
        }
        return token;
    }

    function joinTokens(tokens) {
        let output = '';
        let previous = null;
        tokens.filter(token => token.type !== 'line-comment').forEach(rawToken => {
            const token = normalizedToken(rawToken);
            const value = token.value;
            const noBefore = !output || previous === '(' || previous === '.' || value === ')' || value === ',' || value === '.' || value === ';';
            const noAfterPrevious = previous === 'N' && token.type === 'string';
            const noBeforeParen = value === '(' && previous && (previous === 'NVARCHAR' || previous === 'TABLE');
            if (!noBefore && !noAfterPrevious && !noBeforeParen) output += ' ';
            output += value;
            previous = value;
        });
        return output;
    }

    function topLevelParts(tokens, separator) {
        const parts = [];
        let start = 0;
        let depth = 0;
        tokens.forEach((token, index) => {
            if (token.value === '(') depth++;
            if (token.value === ')') depth--;
            if (token.value === separator && depth === 0) {
                parts.push(tokens.slice(start, index));
                start = index + 1;
            }
        });
        parts.push(tokens.slice(start));
        return parts.filter(part => part.length);
    }

    function matchingParen(tokens, openIndex) {
        let depth = 0;
        for (let i = openIndex; i < tokens.length; i++) {
            if (tokens[i].value === '(') depth++;
            if (tokens[i].value === ')' && --depth === 0) return i;
        }
        return -1;
    }

    function firstIndex(tokens, value, start) {
        const upper = value.toUpperCase();
        for (let i = start || 0; i < tokens.length; i++) {
            if (tokens[i].type === 'word' && tokens[i].value.toUpperCase() === upper) return i;
        }
        return -1;
    }

    function formatKnown(tokens, first) {
        if (first === 'BEGIN') return 'BEGIN TRAN;';
        if (first === 'ROLLBACK' || first === 'COMMIT') return `${first} TRAN;`;

        if (first === 'DECLARE') {
            const open = tokens.findIndex(token => token.value === '(');
            const close = open < 0 ? -1 : matchingParen(tokens, open);
            if (open < 0 || close < 0) return null;
            const columns = topLevelParts(tokens.slice(open + 1, close), ',');
            return `${joinTokens(tokens.slice(0, open))} (\n${columns.map((column, index) => `    ${joinTokens(column)}${index < columns.length - 1 ? ',' : ''}`).join('\n')}\n);`;
        }

        if (first === 'INSERT') {
            const values = firstIndex(tokens, 'VALUES');
            if (values < 0) return null;
            const header = joinTokens(tokens.slice(0, values));
            const tuples = [];
            let index = values + 1;
            while (index < tokens.length) {
                if (tokens[index].value !== '(') { index++; continue; }
                const close = matchingParen(tokens, index);
                if (close < 0) return null;
                tuples.push(`(${joinTokens(tokens.slice(index + 1, close))})`);
                index = close + 1;
            }
            if (!tuples.length) return null;
            return `${header}\nVALUES\n${tuples.map((tuple, tupleIndex) => `    ${tuple}${tupleIndex < tuples.length - 1 ? ',' : ';'}`).join('\n')}`;
        }

        if (first === 'UPDATE' || first === 'SELECT') {
            const setIndex = first === 'UPDATE' ? firstIndex(tokens, 'SET') : -1;
            const fromIndex = firstIndex(tokens, 'FROM');
            const joinIndex = firstIndex(tokens, 'INNER');
            const onIndex = firstIndex(tokens, 'ON');
            if (fromIndex < 0 || joinIndex < 0 || onIndex < 0) return null;
            const lines = [];
            if (first === 'UPDATE') {
                if (setIndex < 0) return null;
                lines.push('UPDATE T', `SET ${joinTokens(tokens.slice(setIndex + 1, fromIndex))}`);
            } else {
                const selectColumns = topLevelParts(tokens.slice(1, fromIndex), ',');
                if (!selectColumns.length) return null;
                lines.push(`SELECT ${joinTokens(selectColumns[0])}${selectColumns.length > 1 ? ',' : ''}`);
                selectColumns.slice(1).forEach((column, index) => {
                    lines.push(`    ${joinTokens(column)}${index < selectColumns.length - 2 ? ',' : ''}`);
                });
            }
            lines.push(`FROM ${joinTokens(tokens.slice(fromIndex + 1, joinIndex))}`);
            lines.push(`INNER JOIN ${joinTokens(tokens.slice(joinIndex + 2, onIndex))}`);
            lines.push(`    ON ${joinTokens(tokens.slice(onIndex + 1))};`);
            return lines.join('\n');
        }
        return null;
    }

    function formatGeneric(tokens) {
        const lines = [];
        let normal = [];
        const flush = () => {
            if (normal.length) {
                lines.push(joinTokens(normal));
                normal = [];
            }
        };
        tokens.forEach(token => {
            if (token.type === 'line-comment') {
                flush();
                lines.push(token.value);
            } else if (token.type === 'block-comment') {
                normal.push(token);
            } else {
                normal.push(token);
            }
        });
        flush();
        return lines.join('\n');
    }

    function formatSql(sql) {
        lastFormatError = '';
        const scanned = tokenize(sql);
        if (!scanned.ok) {
            lastFormatError = scanned.messageKey;
            return String(sql ?? '');
        }
        const segments = [];
        let current = [];
        scanned.tokens.forEach(token => {
            if (token.value === ';' && token.type === 'symbol') {
                if (current.length) segments.push(current);
                current = [];
            } else {
                current.push(token);
            }
        });
        if (current.length) segments.push(current);

        const formatted = segments.map(segment => {
            const hasComment = segment.some(token => token.type === 'line-comment' || token.type === 'block-comment');
            if (hasComment) return formatGeneric(segment);
            const meaningful = segment.filter(token => token.type !== 'line-comment' && token.type !== 'block-comment');
            const first = meaningful.find(token => token.type === 'word')?.value.toUpperCase();
            return formatKnown(meaningful, first) || formatGeneric(meaningful);
        }).filter(Boolean);
        return formatted.join('\n\n');
    }

    function message(key, ...args) {
        const value = typeof global.t === 'function' ? global.t(key) : key;
        return typeof value === 'function' ? value(...args) : value;
    }

    function currentMode() {
        return document.querySelector('input[name="bulkUpdateTransactionMode"]:checked')?.value || 'rollback';
    }

    const state = {
        templateInfo: null,
        rowResult: null,
        generated: false,
        generatedSignature: '',
        initialized: false
    };

    function signature() {
        return `${document.getElementById('bulkUpdateTemplateInput')?.value || ''}\u0000${document.getElementById('bulkUpdateRowsInput')?.value || ''}\u0000${currentMode()}`;
    }

    function setFieldError(id, messageText) {
        const field = document.getElementById(id);
        const errorId = id === 'bulkUpdateTemplateInput' ? 'bulkUpdateTemplateError' : 'bulkUpdateRowsError';
        const errorEl = document.getElementById(errorId);
        if (field) field.setAttribute('aria-invalid', messageText ? 'true' : 'false');
        if (errorEl) {
            errorEl.textContent = messageText || '';
            errorEl.hidden = !messageText;
        }
    }

    function setStatus(id, text, type) {
        const element = document.getElementById(id);
        if (!element) return;
        element.textContent = text || '';
        element.className = `code-status bulk-update-status${type ? ` ${type}` : ''}`;
    }

    function clearGeneratedOutput() {
        const output = document.getElementById('bulkUpdateSqlOutput');
        const copy = document.getElementById('bulkUpdateCopyBtn');
        const format = document.getElementById('bulkUpdateFormatBtn');
        if (output) output.value = '';
        if (copy) copy.disabled = true;
        if (format) format.disabled = true;
        state.generated = false;
        state.generatedSignature = '';
    }

    function renderPreview(model) {
        const table = document.getElementById('bulkUpdatePreview');
        const empty = document.getElementById('bulkUpdatePreviewEmpty');
        if (!table) return;
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        thead.replaceChildren();
        tbody.replaceChildren();
        if (!model.headers.length) {
            if (empty) empty.hidden = false;
            return;
        }
        const headerRow = document.createElement('tr');
        model.headers.forEach(header => {
            const cell = document.createElement('th');
            cell.scope = 'col';
            cell.textContent = header;
            headerRow.appendChild(cell);
        });
        thead.appendChild(headerRow);
        model.rows.forEach(row => {
            const rowElement = document.createElement('tr');
            row.forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value === null ? 'NULL' : value;
                rowElement.appendChild(cell);
            });
            tbody.appendChild(rowElement);
        });
        if (empty) empty.hidden = model.rows.length > 0;
    }

    function refreshBulkUpdate(showErrors = true) {
        clearGeneratedOutput();
        const templateInput = document.getElementById('bulkUpdateTemplateInput');
        const rowsInput = document.getElementById('bulkUpdateRowsInput');
        if (!templateInput || !rowsInput) return;
        state.templateInfo = parseTemplate(templateInput.value);
        state.rowResult = parseRows(rowsInput.value, 2);

        const templateError = showErrors && !state.templateInfo.ok ? message(state.templateInfo.messageKey) : '';
        const rowError = showErrors && !state.rowResult.ok ? message(state.rowResult.messageKey, state.rowResult.line) : '';
        setFieldError('bulkUpdateTemplateInput', templateError);
        setFieldError('bulkUpdateRowsInput', rowError);
        renderPreview(buildPreviewModel(state.templateInfo, state.rowResult));

        if (rowError) {
            setStatus('bulkUpdateRowsStatus', rowError, 'error');
        } else if (state.rowResult.ok && state.rowResult.rows.length) {
            setStatus('bulkUpdateRowsStatus', message('bulkUpdateRowStatus', state.rowResult.rows.length, DELIMITER_LABELS[state.rowResult.delimiter]), 'success');
        } else {
            setStatus('bulkUpdateRowsStatus', message('bulkUpdateStatusEmpty'), 'info');
        }
    }

    function isOutputReady() {
        const output = document.getElementById('bulkUpdateSqlOutput');
        return state.generated && state.generatedSignature === signature() && Boolean(output?.value.trim());
    }

    function generateBulkUpdate() {
        clearGeneratedOutput();
        refreshBulkUpdate();
        if (!state.templateInfo.ok || !state.rowResult.ok || !state.rowResult.rows.length) {
            const rowMessage = !state.rowResult.ok ? message(state.rowResult.messageKey, state.rowResult.line) : message('bulkUpdateDataError');
            if (!state.templateInfo.ok) setStatus('bulkUpdateOutputStatus', message(state.templateInfo.messageKey), 'error');
            else setStatus('bulkUpdateOutputStatus', rowMessage, 'error');
            return false;
        }
        const mode = currentMode();
        const output = document.getElementById('bulkUpdateSqlOutput');
        output.value = generateSql(state.templateInfo, state.rowResult.rows, mode);
        state.generated = true;
        state.generatedSignature = signature();
        document.getElementById('bulkUpdateCopyBtn').disabled = false;
        document.getElementById('bulkUpdateFormatBtn').disabled = false;
        setStatus('bulkUpdateOutputStatus', message('bulkUpdateGenerated').replace('ROLLBACK', mode === 'commit' ? 'COMMIT' : 'ROLLBACK'), 'success');
        return true;
    }

    async function copyBulkUpdateSql() {
        if (!isOutputReady()) {
            setStatus('bulkUpdateOutputStatus', message('bulkUpdateStale'), 'error');
            showToast(message('bulkUpdateStale'), 'error');
            return false;
        }
        try {
            await global.copyToClipboardModern(document.getElementById('bulkUpdateSqlOutput').value);
            setStatus('bulkUpdateOutputStatus', message('bulkUpdateCopied'), 'success');
            showToast(message('bulkUpdateCopied'), 'success');
            return true;
        } catch (copyError) {
            const text = message('bulkUpdateCopyFailed') + (copyError.message || copyError);
            setStatus('bulkUpdateOutputStatus', text, 'error');
            showToast(text, 'error');
            return false;
        }
    }

    function formatBulkUpdateSql() {
        if (!isOutputReady()) {
            setStatus('bulkUpdateOutputStatus', message('bulkUpdateInvalidOutput'), 'error');
            showToast(message('bulkUpdateInvalidOutput'), 'error');
            return false;
        }
        const output = document.getElementById('bulkUpdateSqlOutput');
        const formatted = formatSql(output.value);
        if (lastFormatError) {
            const text = message(lastFormatError);
            setStatus('bulkUpdateOutputStatus', text, 'error');
            showToast(text, 'error');
            return false;
        }
        output.value = formatted;
        setStatus('bulkUpdateOutputStatus', message('bulkUpdateFormatted'), 'success');
        return true;
    }

    function initBulkUpdate() {
        if (state.initialized) return;
        const templateInput = document.getElementById('bulkUpdateTemplateInput');
        const rowsInput = document.getElementById('bulkUpdateRowsInput');
        if (!templateInput || !rowsInput) return;
        state.initialized = true;
        templateInput.addEventListener('input', refreshBulkUpdate);
        rowsInput.addEventListener('input', refreshBulkUpdate);
        document.querySelectorAll('input[name="bulkUpdateTransactionMode"]').forEach(input => input.addEventListener('change', refreshBulkUpdate));
        setStatus('bulkUpdateOutputStatus', '', '');
        refreshBulkUpdate(false);
    }

    function refreshBulkUpdateLanguage() {
        if (!state.initialized) return;
        if (state.rowResult?.ok && state.rowResult.rows.length) {
            setStatus('bulkUpdateRowsStatus', message('bulkUpdateRowStatus', state.rowResult.rows.length, DELIMITER_LABELS[state.rowResult.delimiter]), 'success');
        } else if (state.rowResult && !state.rowResult.ok) {
            setStatus('bulkUpdateRowsStatus', message(state.rowResult.messageKey, state.rowResult.line), 'error');
        } else {
            setStatus('bulkUpdateRowsStatus', message('bulkUpdateStatusEmpty'), 'info');
        }
        if (state.generated) {
            const mode = currentMode();
            setStatus('bulkUpdateOutputStatus', message('bulkUpdateGenerated').replace('ROLLBACK', mode === 'commit' ? 'COMMIT' : 'ROLLBACK'), 'success');
        }
    }

    function runBulkUpdateTests() {
        const failures = [];
        let count = 0;
        const eq = (label, actual, expected) => {
            count++;
            if (actual !== expected) failures.push({ label, actual, expected });
        };
        const ok = (label, value) => eq(label, Boolean(value), true);
        const sample = 'UPDATE PP0041\nSET PACKAGING_LOT = {PACKAGING_LOT}\nWHERE LOT_NO = {LOT_NO}';
        const info = parseTemplate(sample);
        ok('sample template', info.ok);
        eq('mapping order', info.columns.join(','), 'LOT_NO,PACKAGING_LOT');
        ok('keyword and whitespace flexibility', parseTemplate(' update [dbo].[PP0041] set [PACKAGING_LOT]={PACKAGING_LOT} where [LOT_NO]={LOT_NO}; ').ok);
        ok('three-part table', parseTemplate('UPDATE db.schema.table SET value_col={value_col} WHERE key_col={key_col}').ok);
        ok('reject extra SQL', !parseTemplate(`${sample} SELECT 1`).ok);
        ok('reject missing placeholder', !parseTemplate('UPDATE T SET A = 1 WHERE B = {B}').ok);
        ok('reject mismatched placeholder', !parseTemplate('UPDATE T SET A = {B} WHERE B = {B}').ok);
        ok('reject same field', !parseTemplate('UPDATE T SET A = {A} WHERE A = {A}').ok);

        ['\t', ',', ';', '|'].forEach((delimiter, index) => {
            const parsed = parseRows(`a${delimiter}b\r\nc${delimiter}d\r\n`, 2);
            ok(`delimiter ${index}`, parsed.ok && parsed.delimiter === delimiter && parsed.rows.length === 2);
        });
        ok('blank lines removed', parseRows('a\tb\n\n c\td\n', 2).rows.length === 2);
        ok('wrong row width reports line', parseRows('a\tb\nc\n', 2).line === 2);

        const rows = parseRows("LOT001\tPACK'01\nLOT002\t값\nLOT003\tNULL", 2);
        const sql = generateSql(info, rows.rows, 'rollback');
        eq('preview headers', buildPreviewModel(info, rows).headers.join(','), 'LOT_NO,PACKAGING_LOT');
        eq('preview row count', buildPreviewModel(info, rows).rows.length, 3);
        ok('unicode literals', sql.includes("N'PACK''01'") && sql.includes("N'값'") && sql.includes("N'NULL'"));
        ok('rollback ending', sql.endsWith('ROLLBACK TRAN;\n-- COMMIT TRAN;'));
        ok('commit ending', generateSql(info, rows.rows, 'commit').endsWith('-- ROLLBACK TRAN;\nCOMMIT TRAN;'));
        ok('dynamic NVARCHAR 50', sql.includes('NVARCHAR(50)'));
        ok('empty cell NULL', generateSql(info, [[null, 'x']], 'rollback').includes('(NULL, N\'x\')'));
        ok('larger NVARCHAR', generateSql(info, [['x'.repeat(51), 'x']], 'rollback').includes('NVARCHAR(51)'));
        ok('NVARCHAR MAX', generateSql(info, [['x'.repeat(4001), 'x']], 'rollback').includes('NVARCHAR(MAX)'));
        const many = Array.from({ length: 1001 }, (_, index) => [`K${index}`, `V${index}`]);
        eq('1001 row batches', (generateSql(info, many, 'rollback').match(/INSERT INTO @DATA/g) || []).length, 2);

        const formatted = formatSql(sql);
        ok('format preserves literal', formatted.includes("N'PACK''01'") && formatted.includes("N'값'"));
        ok('format idempotent', formatSql(formatted) === formatted);
        ok('format preserves comments and brackets', formatSql("select [A]]B] /* keep */ from T -- line").includes('[A]]B]') && formatSql("select [A]]B] /* keep */ from T -- line").includes('/* keep */'));
        eq('unclosed format unchanged', formatSql("SELECT 'broken"), "SELECT 'broken");
        ok('unclosed format reports error', lastFormatError === 'bulkUpdateUnclosedFormat');

        if (failures.length) {
            console.error(`Bulk Update tests failed (${failures.length}/${count})`, failures);
            return false;
        }
        console.info(`Bulk Update tests passed (${count})`);
        return true;
    }

    const api = {
        parseTemplate,
        parseRows,
        buildPreviewModel,
        generateSql,
        formatSql,
        getLastFormatError: () => lastFormatError
    };
    global.BulkUpdate = api;
    global.generateBulkUpdate = generateBulkUpdate;
    global.copyBulkUpdateSql = copyBulkUpdateSql;
    global.formatBulkUpdateSql = formatBulkUpdateSql;
    global.runBulkUpdateTests = runBulkUpdateTests;
    global.refreshBulkUpdateLanguage = refreshBulkUpdateLanguage;

    window.addEventListener('DOMContentLoaded', initBulkUpdate);
})(window);

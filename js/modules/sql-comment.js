/**
 * ============================================================
 *  sql-comment.js — SQL Table Comment Generator Module
 * ============================================================
 *  Extracts table and alias pairs from SQL queries and generates
 *  header comments: -- table | alias
 * ============================================================
 */

(function (global) {
    'use strict';

    const SQL_COMMENT_RESERVED = new Set([
        'ON', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS',
        'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'EXCEPT', 'INTERSECT',
        'SET', 'INTO', 'VALUES', 'SELECT', 'FROM', 'AS', 'AND', 'OR', 'NOT', 'IN',
        'USING', 'WITH', 'BY', 'ASC', 'DESC', 'FETCH', 'ONLY', 'ROWS', 'ROW',
        'NATURAL', 'APPLY', 'LATERAL', 'WHEN', 'THEN', 'ELSE', 'END', 'CASE'
    ]);

    function stripSqlLiteralsAndComments(sql) {
        let out = '';
        let i = 0;
        while (i < sql.length) {
            // Line comment
            if (sql[i] === '-' && sql[i + 1] === '-') {
                out += '  ';
                i += 2;
                while (i < sql.length && sql[i] !== '\n') {
                    out += ' ';
                    i++;
                }
                continue;
            }
            // Block comment
            if (sql[i] === '/' && sql[i + 1] === '*') {
                out += '  ';
                i += 2;
                while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) {
                    out += sql[i] === '\n' ? '\n' : ' ';
                    i++;
                }
                if (i < sql.length) {
                    out += '  ';
                    i += 2;
                }
                continue;
            }
            // Single-quoted string
            if (sql[i] === "'") {
                out += ' ';
                i++;
                while (i < sql.length) {
                    if (sql[i] === "'" && sql[i + 1] === "'") {
                        out += '  ';
                        i += 2;
                        continue;
                    }
                    if (sql[i] === "'") {
                        out += ' ';
                        i++;
                        break;
                    }
                    out += sql[i] === '\n' ? '\n' : ' ';
                    i++;
                }
                continue;
            }
            // Double-quoted identifier — keep content for matching via brackets later; blank for safety
            if (sql[i] === '"') {
                let chunk = '"';
                i++;
                while (i < sql.length && sql[i] !== '"') {
                    chunk += sql[i];
                    i++;
                }
                if (i < sql.length) {
                    chunk += '"';
                    i++;
                }
                out += chunk;
                continue;
            }
            // Bracket identifier [name]
            if (sql[i] === '[') {
                let chunk = '[';
                i++;
                while (i < sql.length && sql[i] !== ']') {
                    chunk += sql[i];
                    i++;
                }
                if (i < sql.length) {
                    chunk += ']';
                    i++;
                }
                out += chunk;
                continue;
            }
            // Backtick identifier
            if (sql[i] === '`') {
                let chunk = '`';
                i++;
                while (i < sql.length && sql[i] !== '`') {
                    chunk += sql[i];
                    i++;
                }
                if (i < sql.length) {
                    chunk += '`';
                    i++;
                }
                out += chunk;
                continue;
            }

            out += sql[i];
            i++;
        }
        return out;
    }

    function extractTableAliases(sql) {
        const scrubbed = stripSqlLiteralsAndComments(sql);
        // Capture FROM / JOIN + table (+ optional AS alias)
        // Table: schema.table or table, optional quotes/brackets/backticks
        const ident = '(?:`[^`]+`|"[^"]+"|\\[[^\\]]+\\]|[A-Za-z_][\\w$#]*)';
        const tableRef = `(${ident}(?:\\s*\\.\\s*${ident})*)`;
        const aliasRef = `(${ident})`;
        const pattern = new RegExp(
            `(?:\\bFROM\\b|\\b(?:(?:LEFT|RIGHT|FULL)(?:\\s+OUTER)?|INNER|CROSS|OUTER|NATURAL)?\\s*JOIN\\b)\\s+${tableRef}` +
            `(?:\\s+(?:AS\\s+)?${aliasRef})?`,
            'gi'
        );

        const pairs = [];
        const seen = new Set();
        let match;
        while ((match = pattern.exec(scrubbed)) !== null) {
            const table = match[1].replace(/\s+/g, '');
            let alias = match[2] ? match[2].replace(/\s+/g, '') : '';

            // Drop false-positive aliases that are SQL keywords (e.g. FROM t WHERE)
            if (alias) {
                const aliasBare = alias.replace(/^[`"\[]/, '').replace(/[`"\]]$/, '').toUpperCase();
                if (SQL_COMMENT_RESERVED.has(aliasBare)) {
                    alias = '';
                }
            }

            // Skip subquery open paren mistaken as table (pattern shouldn't match, but guard)
            if (!table || table === '(') continue;

            const key = table.toLowerCase() + '|' + alias.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            pairs.push({ table, alias });
        }
        return pairs;
    }

    function generateTableComments() {
        const inputEl = document.getElementById('commentSqlInput');
        const outputEl = document.getElementById('commentSqlOutput');
        if (!inputEl || !outputEl) return;

        const sql = inputEl.value;
        if (!sql.trim()) {
            if (typeof showToast === 'function') showToast('Please enter a SQL query', 'error');
            return;
        }

        const pairs = extractTableAliases(sql);
        if (pairs.length === 0) {
            if (typeof showToast === 'function') showToast('No tables found in query', 'error');
            outputEl.value = '';
            return;
        }

        const commentBlock = pairs
            .map(({ table, alias }) => `-- ${table} | ${alias}`)
            .join('\n');

        outputEl.value = commentBlock + '\n\n' + sql;
        if (typeof showToast === 'function') showToast(`Added comments for ${pairs.length} table(s)`, 'success');
    }

    function clearCommentInput() {
        const inputEl = document.getElementById('commentSqlInput');
        const outputEl = document.getElementById('commentSqlOutput');
        if (inputEl) inputEl.value = '';
        if (outputEl) outputEl.value = '';
        if (typeof showToast === 'function') showToast('Cleared', 'success');
    }

    async function copyCommentResult() {
        const outputEl = document.getElementById('commentSqlOutput');
        const text = outputEl ? outputEl.value : '';
        if (!text) {
            if (typeof showToast === 'function') showToast('Nothing to copy', 'error');
            return;
        }
        try {
            if (typeof copyToClipboardModern === 'function') {
                await copyToClipboardModern(text);
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            }
            if (typeof showToast === 'function') showToast('Copied to clipboard!', 'success');
        } catch (err) {
            if (typeof showToast === 'function') showToast('Copy failed', 'error');
        }
    }

    // Export public API
    global.generateTableComments = generateTableComments;
    global.clearCommentInput = clearCommentInput;
    global.copyCommentResult = copyCommentResult;
    global.extractTableAliases = extractTableAliases;
    global.stripSqlLiteralsAndComments = stripSqlLiteralsAndComments;
    global.SqlComment = {
        generate: generateTableComments,
        clear: clearCommentInput,
        copy: copyCommentResult,
        extract: extractTableAliases,
        strip: stripSqlLiteralsAndComments
    };
})(typeof window !== 'undefined' ? window : globalThis);

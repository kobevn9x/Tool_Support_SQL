/*
 * SQL Tools - Additional SQL utility functions
 * Includes: SQL Beautifier, SQL Minifier, Keyword Case Converter, SQL to JSON
 */

// ============================================
// PAGE NAVIGATION
// ============================================

const pageTitles = {
    'formatter': 'Data Formatter',
    'sql-beautify': 'SQL Beautifier',
    'sql-minify': 'SQL Minifier',
    'sql-case': 'Keyword Case',
    'sql-to-json': 'SQL to JSON',
    'history': 'History'
};

function switchPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    
    // Show target page
    const target = document.getElementById('page-' + pageId);
    if (target) target.style.display = 'block';
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });
    
    // Update title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = pageTitles[pageId] || 'ToolSQL';
}

// ============================================
// SQL BEAUTIFIER
// ============================================

const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'AS',
    'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL', 'CROSS', 'ON',
    'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'TOP', 'DISTINCT',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'ALTER',
    'DROP', 'TABLE', 'INDEX', 'VIEW', 'IF', 'EXISTS', 'BETWEEN', 'LIKE',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'ALL', 'ASC', 'DESC',
    'WITH', 'RECURSIVE', 'CTE', 'OVER', 'PARTITION', 'ROW_NUMBER', 'RANK',
    'DENSE_RANK', 'FETCH', 'NEXT', 'ROWS', 'ONLY', 'FIRST', 'LAST',
    'TRUNCATE', 'REPLACE', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'BEGIN',
    'TRANSACTION', 'SAVEPOINT', 'EXEC', 'EXECUTE', 'DECLARE', 'CURSOR',
    'OPEN', 'CLOSE', 'DEALLOCATE', 'PREPARE', 'USING', 'TEMPORARY', 'TEMP'
];

const SQL_FUNCTIONS = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'CAST',
    'CONVERT', 'ISNULL', 'IFNULL', 'NVL', 'DECODE', 'TRIM', 'LTRIM',
    'RTRIM', 'UPPER', 'LOWER', 'SUBSTRING', 'SUBSTR', 'REPLACE', 'CONCAT',
    'LENGTH', 'LEN', 'CHAR_LENGTH', 'POSITION', 'CHARINDEX', 'INSTR',
    'LEFT', 'RIGHT', 'REVERSE', 'REPEAT', 'SPACE', 'FORMAT', 'DATE_FORMAT',
    'GETDATE', 'NOW', 'CURRENT_TIMESTAMP', 'DATEADD', 'DATEDIFF', 'DATEPART',
    'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'ABS', 'CEILING',
    'FLOOR', 'ROUND', 'POWER', 'SQRT', 'LOG', 'EXP', 'SIGN', 'RAND',
    'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD',
    'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE', 'STRING_AGG', 'GROUP_CONCAT',
    'JSON_VALUE', 'JSON_QUERY', 'JSON_MODIFY', 'FOR_JSON', 'FOR_XML',
    'STUFF', 'CHAR', 'ASCII', 'UNICODE', 'TRANSLATE', 'IIF'
];

function beautifySQL() {
    const input = document.getElementById('sqlBeautifyInput').value;
    if (!input.trim()) {
        showToast('Please enter SQL to beautify', 'error');
        return;
    }

    const indentSize = document.getElementById('beautifyIndent').value;
    const keywordCase = document.getElementById('beautifyKeywordCase').value;
    const newLinePerClause = document.getElementById('beautifyLines').checked;

    const indent = indentSize === 'tab' ? '\t' : ' '.repeat(parseInt(indentSize));

    // Tokenize: split SQL into tokens while preserving strings
    let tokens = tokenizeSQL(input);

    // Process tokens
    let result = '';
    let indentLevel = 0;
    let newLine = false;

    const majorClauses = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'INSERT', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'ALTER', 'DROP',
        'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'FULL JOIN', 'CROSS JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN'];
    const subQueryStart = ['(', 'CASE'];
    const subQueryEnd = [')', 'END'];

    // Helper: apply casing to a multi-word token (e.g. "GROUP BY" → "group by")
    function applyKeywordCase(token, targetCase) {
        if (targetCase === 'preserve') return token;
        const parts = token.split(/\s+/);
        const cased = parts.map(p => {
            const up = p.toUpperCase();
            if (SQL_KEYWORDS.includes(up) || SQL_FUNCTIONS.includes(up)) {
                return targetCase === 'upper' ? up : up.toLowerCase();
            }
            return targetCase === 'upper' ? up : p.toLowerCase(); // non-keywords: uppercase all or lowercase all
        });
        return cased.join(' ');
    }

    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];
        let upperToken = token.toUpperCase().trim();

        // Handle string literals - don't modify
        if (token.startsWith("'") || token.startsWith('"') || token.startsWith('`')) {
            if (newLine) {
                result += '\n' + indent.repeat(indentLevel);
                newLine = false;
            }
            result += token;
            continue;
        }

        // Handle comments
        if (token.startsWith('--') || token.startsWith('/*')) {
            result += (newLine ? '\n' + indent.repeat(indentLevel) : ' ') + token;
            newLine = false;
            continue;
        }

        // Apply keyword casing (handles both single-word and multi-word tokens)
        token = applyKeywordCase(token, keywordCase);

        // Major clause: new line
        if (newLinePerClause && majorClauses.includes(upperToken)) {
            if (result.length > 0) {
                result += '\n';
            }
            result += indent.repeat(indentLevel) + token;
            newLine = true;
            continue;
        }

        // Subquery / CASE indent
        if (upperToken === '(' || upperToken === 'CASE') {
            if (newLine) {
                result += '\n' + indent.repeat(indentLevel);
                newLine = false;
            }
            result += token;
            indentLevel++;
            newLine = true;
            continue;
        }

        if (upperToken === ')' || upperToken === 'END') {
            indentLevel = Math.max(0, indentLevel - 1);
            if (newLine) {
                result += '\n' + indent.repeat(indentLevel);
            }
            result += token;
            newLine = false;
            continue;
        }

        // Comma: new line
        if (token === ',' && newLinePerClause) {
            result += token;
            newLine = true;
            continue;
        }

        // Default
        if (newLine) {
            result += '\n' + indent.repeat(indentLevel);
            newLine = false;
        } else if (result.length > 0 && !result.endsWith(' ') && !result.endsWith('\n')) {
            result += ' ';
        }

        result += token;
    }

    // Clean up multiple spaces and trim
    result = result.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

    document.getElementById('sqlBeautifyOutput').value = result;
    showToast('SQL beautified successfully', 'success');
}

function tokenizeSQL(sql) {
    const tokens = [];
    let i = 0;

    while (i < sql.length) {
        // Skip whitespace
        if (/\s/.test(sql[i])) {
            i++;
            continue;
        }

        // Single-quoted string
        if (sql[i] === "'") {
            let str = "'";
            i++;
            while (i < sql.length) {
                if (sql[i] === "'" && sql[i + 1] === "'") {
                    str += "''";
                    i += 2;
                } else if (sql[i] === "'") {
                    str += "'";
                    i++;
                    break;
                } else {
                    str += sql[i];
                    i++;
                }
            }
            tokens.push(str);
            continue;
        }

        // Double-quoted identifier
        if (sql[i] === '"') {
            let str = '"';
            i++;
            while (i < sql.length && sql[i] !== '"') {
                str += sql[i];
                i++;
            }
            if (i < sql.length) {
                str += '"';
                i++;
            }
            tokens.push(str);
            continue;
        }

        // Backtick identifier
        if (sql[i] === '`') {
            let str = '`';
            i++;
            while (i < sql.length && sql[i] !== '`') {
                str += sql[i];
                i++;
            }
            if (i < sql.length) {
                str += '`';
                i++;
            }
            tokens.push(str);
            continue;
        }

        // Line comment
        if (sql[i] === '-' && i + 1 < sql.length && sql[i + 1] === '-') {
            let comment = '';
            while (i < sql.length && sql[i] !== '\n') {
                comment += sql[i];
                i++;
            }
            tokens.push(comment);
            continue;
        }

        // Block comment
        if (sql[i] === '/' && sql[i + 1] === '*') {
            let comment = '/*';
            i += 2;
            while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) {
                comment += sql[i];
                i++;
            }
            if (i < sql.length) {
                comment += '*/';
                i += 2;
            }
            tokens.push(comment);
            continue;
        }

        // Operators and punctuation (dot excluded - handled in identifiers)
        if (/[(),;=<>!+\-*/]/.test(sql[i])) {
            // Multi-char operators
            if (sql[i] === '<' && sql[i + 1] === '=') {
                tokens.push('<=');
                i += 2;
            } else if (sql[i] === '>' && sql[i + 1] === '=') {
                tokens.push('>=');
                i += 2;
            } else if (sql[i] === '!' && sql[i + 1] === '=') {
                tokens.push('!=');
                i += 2;
            } else if (sql[i] === '<' && sql[i + 1] === '>') {
                tokens.push('<>');
                i += 2;
            } else {
                tokens.push(sql[i]);
                i++;
            }
            continue;
        }

        // Identifiers and keywords (including dots for a.columnA)
        let word = '';
        while (i < sql.length && /[a-zA-Z0-9_@#$.]/.test(sql[i])) {
            word += sql[i];
            i++;
        }
        if (word) {
            // Check for multi-word keywords
            const upperWord = word.toUpperCase();
            if (['GROUP', 'ORDER', 'PARTITION', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS'].includes(upperWord)) {
                // Peek ahead for BY/JOIN/OUTER/INNER
                let j = i;
                while (j < sql.length && /\s/.test(sql[j])) j++;
                let nextWord = '';
                let k = j;
                while (k < sql.length && /[a-zA-Z]/.test(sql[k])) {
                    nextWord += sql[k];
                    k++;
                }
                const upperNext = nextWord.toUpperCase();
                if ((upperWord === 'GROUP' || upperWord === 'ORDER' || upperWord === 'PARTITION') && upperNext === 'BY') {
                    tokens.push(upperWord + ' BY');
                    i = k;
                } else if (['LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS'].includes(upperWord)) {
                    // Check for 3-word pattern: LEFT OUTER JOIN, FULL OUTER JOIN
                    if (upperNext === 'OUTER' || upperNext === 'INNER') {
                        // Peek one more word for JOIN
                        let j2 = k;
                        while (j2 < sql.length && /\s/.test(sql[j2])) j2++;
                        let thirdWord = '';
                        let k2 = j2;
                        while (k2 < sql.length && /[a-zA-Z]/.test(sql[k2])) {
                            thirdWord += sql[k2];
                            k2++;
                        }
                        if (thirdWord.toUpperCase() === 'JOIN') {
                            tokens.push(upperWord + ' ' + upperNext + ' JOIN');
                            i = k2;
                        } else {
                            tokens.push(upperWord + ' ' + upperNext);
                            i = k;
                        }
                    } else if (upperNext === 'JOIN') {
                        tokens.push(upperWord + ' JOIN');
                        i = k;
                    } else {
                        tokens.push(word);
                    }
                } else {
                    tokens.push(word);
                }
            } else {
                tokens.push(word);
            }
            continue;
        }

        // Anything else
        tokens.push(sql[i]);
        i++;
    }

    return tokens;
}

// ============================================
// SQL MINIFIER
// ============================================

function minifySQL() {
    const input = document.getElementById('sqlMinifyInput').value;
    if (!input.trim()) {
        showToast('Please enter SQL to minify', 'error');
        return;
    }

    const removeComments = document.getElementById('minifyRemoveComments').checked;
    const compactSpaces = document.getElementById('minifyCompactSpaces').checked;

    let result = input;

    // Remove line comments
    if (removeComments) {
        result = result.replace(/--[^\n]*/g, '');
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    }

    // Protect string literals before space removal
    const stringPlaceholders = [];
    result = result.replace(/('(?:[^']|'')*')/g, (match) => {
        stringPlaceholders.push(match);
        return `\x00STR${stringPlaceholders.length - 1}\x00`;
    });

    // Remove newlines
    result = result.replace(/\r?\n/g, ' ');

    // Compact multiple spaces
    if (compactSpaces) {
        result = result.replace(/\s+/g, ' ');
    }

    // Remove spaces around operators (now safe — string literals are protected)
    result = result.replace(/\s*([(),;])\s*/g, '$1');

    // Restore string literals
    result = result.replace(/\x00STR(\d+)\x00/g, (_, idx) => stringPlaceholders[parseInt(idx)]);

    result = result.trim();

    // Update stats
    document.getElementById('minifyOriginalSize').textContent = input.length;
    document.getElementById('minifyResultSize').textContent = result.length;
    const saved = input.length > 0 ? Math.round((1 - result.length / input.length) * 100) : 0;
    document.getElementById('minifySaved').textContent = saved + '%';

    document.getElementById('sqlMinifyOutput').value = result;
    showToast('SQL minified successfully', 'success');
}

// ============================================
// KEYWORD CASE CONVERTER
// ============================================

function convertKeywordCase() {
    const input = document.getElementById('sqlCaseInput').value;
    if (!input.trim()) {
        showToast('Please enter SQL to convert', 'error');
        return;
    }

    const targetCase = document.getElementById('keywordCaseTarget').value;
    const includeFunctions = document.getElementById('caseFunctions').checked;

    const keywords = includeFunctions ? [...SQL_KEYWORDS, ...SQL_FUNCTIONS] : SQL_KEYWORDS;

    // Tokenize and convert
    let tokens = tokenizeSQL(input);
    let result = tokens.map(token => {
        // Don't modify strings
        if (token.startsWith("'") || token.startsWith('"') || token.startsWith('`')) {
            return token;
        }
        // Don't modify comments
        if (token.startsWith('--') || token.startsWith('/*')) {
            return token;
        }

        const upper = token.toUpperCase().trim();
        if (keywords.includes(upper)) {
            return targetCase === 'upper' ? upper : upper.toLowerCase();
        }
        return token;
    });

    // Reconstruct SQL preserving some structure
    let output = '';
    let lastWasNewline = false;

    for (let i = 0; i < result.length; i++) {
        const token = result[i];
        const upper = token.toUpperCase().trim();

        // Major clauses get newlines
        if (['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'INSERT', 'VALUES', 'UPDATE', 'SET', 'DELETE'].includes(upper)) {
            if (output.length > 0 && !output.endsWith('\n')) {
                output += '\n';
            }
            output += token + ' ';
            lastWasNewline = true;
            continue;
        }

        // Comma + major columns: newline after comma in SELECT
        if (token === ',') {
            output += ', ';
            continue;
        }

        output += token;

        // Add space after token unless next is punctuation
        if (i < result.length - 1) {
            const next = result[i + 1];
            if (!['(', ')', ',', ';', '.'].includes(next)) {
                output += ' ';
            }
        }
    }

    // Clean up
    output = output.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

    document.getElementById('sqlCaseOutput').value = output;
    showToast('Keyword case converted', 'success');
}

// ============================================
// SQL TO JSON CONVERTER
// ============================================

function convertToJson() {
    const input = document.getElementById('sqlToJsonInput').value;
    if (!input.trim()) {
        showToast('Please enter data to convert', 'error');
        return;
    }

    const indentSize = parseInt(document.getElementById('jsonIndent').value);
    const wrapArray = document.getElementById('jsonArrayWrap').checked;

    const lines = input.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
        showToast('Need at least a header row and one data row', 'error');
        return;
    }

    // Detect delimiter (tab or comma)
    const delimiter = lines[0].includes('\t') ? '\t' : ',';

    // Parse header
    const headers = lines[0].split(delimiter).map(h => h.trim());

    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
            let value = values[index] || '';

            // Try to parse numbers
            if (/^-?\d+(\.\d+)?$/.test(value)) {
                row[header] = parseFloat(value);
            }
            // Parse booleans
            else if (value.toLowerCase() === 'true') {
                row[header] = true;
            }
            else if (value.toLowerCase() === 'false') {
                row[header] = false;
            }
            // Parse null
            else if (value.toLowerCase() === 'null' || value === '') {
                row[header] = null;
            }
            // Keep as string
            else {
                row[header] = value;
            }
        });
        rows.push(row);
    }

    const result = wrapArray ? rows : rows[0] || {};
    const json = JSON.stringify(result, null, indentSize || undefined);

    document.getElementById('sqlToJsonOutput').value = json;
    showToast(`Converted ${rows.length} rows to JSON`, 'success');
}

// ============================================
// COPY HELPER
// ============================================

function copyElementText(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const text = el.value || el.textContent;
    if (!text) {
        showToast('Nothing to copy', 'error');
        return;
    }

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard', 'success');
        });
    } else {
        el.select();
        document.execCommand('copy');
        showToast('Copied to clipboard', 'success');
    }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Set default page
    switchPage('formatter');
});

/**
 * ============================================================
 *  cs-formatter.js — C# Repeated Method Call Column Formatter
 * ============================================================
 *  Aligns consecutive calls to the same C# method by argument
 *  column, using East-Asian display width (Korean/CJK = 2 cells)
 *  so columns line up in the source editor.
 *
 *  Conventions (from AGENTS.md):
 *  - Vanilla JS, no build step, no runtime dependencies.
 *  - All user-visible strings go through i18n keys (t()).
 *  - Toasts use showToast() defined in script.js.
 * ============================================================
 */

(function (global) {
    'use strict';

// ============================================
// DISPLAY WIDTH  (wcwidth-style)
// ============================================

// Unicode combining marks, ZWJ/ZWNJ, variation selectors, and
// emoji skin-tone modifiers occupy zero display cells.
const CS_COMBINING = /[\u0300-\u036f\u0483-\u0489\u0591-\u05c7\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0711\u0730-\u074a\u07eb-\u07f3\u0816-\u0830\u0859-\u085b\u08e3-\u0903\u093a-\u094f\u0951-\u0957\u0962\u0963\u0981-\u0983\u09bc-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01-\u0a03\u0a3c-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81-\u0a83\u0abc-\u0acd\u0ae2\u0ae3\u0b01-\u0b03\u0b3c-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe-\u0bc0\u0bcd\u0bd7\u0c00-\u0c04\u0c3e-\u0c56\u0c62\u0c63\u0c81-\u0c83\u0cbc-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d00-\u0d03\u0d3b-\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dd2-\u0dd6\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f87\u0f8d-\u0fbc\u0fc6\u102d-\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082-\u108d\u108f\u109a-\u109d\u135d-\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u180b-\u180e\u1885\u1886\u18a9\u1920-\u192b\u1930-\u193b\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f\u1ab0-\u1aff\u1b00-\u1b04\u1b34-\u1b44\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8-\u1bad\u1be6-\u1bf3\u1c24-\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf8\u1cf9\u1dc0-\u1dff\u200b\u200c\u200d\ufe00-\ufe0f\u20d0-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9e5\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\ufb1e\ufe20-\ufe2f\uff9e\uff9f\u{1f3fb}-\u{1f3ff}]/u;

// East-Asian wide / full-width characters occupy two cells:
// Hangul (Jamo, compatibility, syllables), CJK ideographs,
// Hiragana/Katakana, full-width forms and emoji.
const CS_CJK_WIDE = /[\u1100-\u11ff\u2e80-\u303e\u3040-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua960-\ua97f\uac00-\ud7af\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6\ud7b0-\ud7ff\u{1f000}-\u{1faff}\u{1f1e6}-\u{1f1ff}\u{20000}-\u{3fffd}]/u;

/**
 * Approximate terminal/editor display width of the raw source text.
 * Escapes such as "\\r\\n" are measured literally (visible chars),
 * exactly as they appear in the editor — never decoded.
 * @param {string} text
 * @param {number} [tabSize=4]
 * @returns {number}
 */
function getDisplayWidth(text, tabSize) {
    if (tabSize === undefined) tabSize = 4;
    let width = 0;
    for (const ch of text) {
        const code = ch.codePointAt(0);
        if (code === 0x09) {          // tab
            width += tabSize;
            continue;
        }
        if (code === 0x0d || code === 0x0a) continue; // not expected in single-line args
        if (CS_COMBINING.test(ch)) continue;          // combining marks → 0
        width += CS_CJK_WIDE.test(ch) ? 2 : 1;        // ambiguous width defaults to 1
    }
    return width;
}

// ============================================================
// TOKEN-AWARE SCANNER  (never split(',') — commas inside
// strings, chars, comments, generics and nested calls are safe)
// ============================================================

/**
 * Tokenize a single line of C# into tokens with type + offsets.
 * Strings (regular/verbatim/interpolated/raw), char literals and
 * comments are treated as opaque tokens.
 */
function tokenizeCsLine(code) {
    const tokens = [];
    let i = 0;
    const n = code.length;

    while (i < n) {
        const c = code[i];

        if (/\s/.test(c)) { i++; continue; }

        // Line comment
        if (c === '/' && code[i + 1] === '/') {
            const start = i;
            while (i < n && code[i] !== '\n') i++;
            tokens.push({ type: 'comment', text: code.slice(start, i), start, end: i });
            continue;
        }

        // Block comment
        if (c === '/' && code[i + 1] === '*') {
            const start = i;
            i += 2;
            while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++;
            if (i < n) i += 2;
            tokens.push({ type: 'comment', text: code.slice(start, i), start, end: i });
            continue;
        }

        // Verbatim string  @"..."  (escaped via "")
        if (c === '@' && code[i + 1] === '"') {
            const start = i;
            i += 2;
            while (i < n) {
                if (code[i] === '"' && code[i + 1] === '"') { i += 2; continue; }
                if (code[i] === '"') { i++; break; }
                if (code[i] === '\n') break;
                i++;
            }
            tokens.push({ type: 'string', text: code.slice(start, i), start, end: i });
            continue;
        }

        // Interpolated strings  $"...", $@"...", @$"..."  (braces may nest)
        if (c === '$') {
            let q = i + 1;
            if (code[q] === '@') q++;
            if (code[q] === '"') {
                const start = i;
                let braceDepth = 0;
                i = q + 1;
                const verbatim = code[i - 2] === '@';
                while (i < n) {
                    if (!verbatim && code[i] === '\\') { i += 2; continue; }
                    if (verbatim && code[i] === '"' && code[i + 1] === '"') { i += 2; continue; }
                    if (code[i] === '{') braceDepth++;
                    else if (code[i] === '}') braceDepth = Math.max(0, braceDepth - 1);
                    else if (code[i] === '"' && braceDepth === 0) { i++; break; }
                    if (code[i] === '\n' && braceDepth === 0) break;
                    i++;
                }
                tokens.push({ type: 'string', text: code.slice(start, i), start, end: i });
                continue;
            }
        }

        // Raw string  """..."""
        if (c === '"' && code[i + 1] === '"' && code[i + 2] === '"') {
            const start = i;
            i += 3;
            while (i < n && !(code[i] === '"' && code[i + 1] === '"' && code[i + 2] === '"')) i++;
            if (i < n) i += 3;
            tokens.push({ type: 'string', text: code.slice(start, i), start, end: i });
            continue;
        }

        // Regular string  "..."  (escaped via \)
        if (c === '"') {
            const start = i;
            i++;
            while (i < n) {
                if (code[i] === '\\') { i += 2; continue; }
                if (code[i] === '"') { i++; break; }
                if (code[i] === '\n') break;
                i++;
            }
            tokens.push({ type: 'string', text: code.slice(start, i), start, end: i });
            continue;
        }

        // Char literal  '...'
        if (c === "'") {
            const start = i;
            i++;
            while (i < n) {
                if (code[i] === '\\') { i += 2; continue; }
                if (code[i] === "'") { i++; break; }
                if (code[i] === '\n') break;
                i++;
            }
            tokens.push({ type: 'char', text: code.slice(start, i), start, end: i });
            continue;
        }

        // Identifier / number (includes verbatim identifier @class)
        if (/[A-Za-z0-9_@]/.test(c)) {
            const start = i;
            while (i < n && /[A-Za-z0-9_@]/.test(code[i])) i++;
            tokens.push({ type: 'word', text: code.slice(start, i), start, end: i });
            continue;
        }

        // Single punctuation char
        tokens.push({ type: 'punct', text: c, start: i, end: i + 1 });
        i++;
    }
    return tokens;
}

/**
 * Decide whether a '<' at `index` opens a generic type list
 * (e.g. List<int>) rather than a comparison (a < b). Heuristic:
 * no whitespace around the angle brackets — typical of generic
 * syntax — while comparisons usually have spaces.
 */
function isGenericAngle(text, index) {
    let j = index - 1;
    while (j >= 0 && /\s/.test(text[j])) j--;
    if (j < 0 || !/[A-Za-z0-9_>\]]/.test(text[j])) return false;
    let k = index + 1;
    while (k < text.length && /\s/.test(text[k])) k++;
    if (k >= text.length || !/[A-Za-z0-9_?"']/.test(text[k])) return false;
    return true;
}

/**
 * Split the text inside the call parens into top-level arguments.
 * Commas at depth 0 split arguments; commas inside strings, chars,
 * comments, nested (), [], {}, or generic < > are preserved.
 * Returns null when the source is not well-formed.
 */
function splitTopLevelArgs(text) {
    const args = [];
    const tokens = tokenizeCsLine(text);
    let depth = 0;
    let angleDepth = 0;
    let segStart = 0;

    for (const tok of tokens) {
        if (tok.type !== 'punct') continue;

        const p = tok.text;
        if (p === '(' || p === '[' || p === '{') {
            depth++;
        } else if (p === ')' || p === ']' || p === '}') {
            depth = Math.max(0, depth - 1);
        } else if (p === '<') {
            if (angleDepth === 0 && isGenericAngle(text, tok.start)) angleDepth = 1;
        } else if (p === '>') {
            if (angleDepth > 0) angleDepth--;
        } else if (p === ',') {
            if (depth === 0 && angleDepth === 0) {
                args.push(text.slice(segStart, tok.start).trim());
                segStart = tok.end;
            }
        }
    }
    args.push(text.slice(segStart).trim());

    // Unbalanced angle brackets probably mean a comparison was
    // misread as a generic — fall back to plain () [] {} splitting.
    if (angleDepth > 0) {
        return splitTopLevelArgsPlain(text);
    }
    return args;
}

/** Fallback splitter: only () [] {} depth is tracked. */
function splitTopLevelArgsPlain(text) {
    const args = [];
    let depth = 0;
    let segStart = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"' || c === "'" || c === '@' || c === '$') {
            // Skip whole string/char tokens so embedded commas stay intact
            const toks = tokenizeCsLine(text.slice(i));
            if (toks.length && (toks[0].type === 'string' || toks[0].type === 'char')) {
                i += toks[0].end - 1;
                continue;
            }
        }
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
        else if (c === ',' && depth === 0) {
            args.push(text.slice(segStart, i).trim());
            segStart = i + 1;
        }
    }
    args.push(text.slice(segStart).trim());
    return args;
}

// ============================================================
// ARGUMENT CLASSIFICATION
// ============================================================

function classifyArgument(text) {
    const t = text.trim();
    if (!t) return 'expression';

    const unsigned = t.replace(/^[+\-]/, '');
    if (/^(?:\d[\d_]*(?:\.\d[\d_]*)?|\.\d[\d_]*|0x[\da-fA-F_]+|0b[01_]+)(?:[eE][+-]?\d[\d_]*)?[fFdDmMuUlL]*$/.test(unsigned)) {
        return 'number';
    }
    if (/^true$/i.test(t) || /^false$/i.test(t)) return 'boolean';
    if (t.startsWith('"') || t.startsWith('@"') || t.startsWith('$"') ||
        t.startsWith('$@"') || t.startsWith('@$"') || t.startsWith('"""') ||
        t.startsWith("'")) {
        return 'string';
    }
    if (t.includes('.')) {
        if (!/[()[\]{}]/.test(t)) return 'member-access';
        return 'expression';
    }
    if (/^[A-Za-z_@][A-Za-z0-9_]*$/.test(t)) return 'identifier';
    return 'expression';
}

// ============================================================
// INVOCATION PARSING
// ============================================================

/**
 * Parse a single source line as a one-line method invocation
 * statement, e.g.:
 *     "    _GridUtil.InitColumn(grid2, "PLANT_CD", 140);"
 * Returns null when the line is not a clean single-line call
 * (blank lines, multiline calls, control flow, declarations...).
 */
function parseInvocation(line) {
    if (!line || !line.trim()) return null;

    const tokens = tokenizeCsLine(line);

    // Locate the terminating ';'
    let semiIdx = -1;
    for (let t = tokens.length - 1; t >= 0; t--) {
        if (tokens[t].type === 'comment') continue;
        if (tokens[t].type === 'punct' && tokens[t].text === ';') { semiIdx = t; break; }
        break; // trailing non-comment token that isn't ';' → not a statement
    }
    if (semiIdx < 0) return null;

    // Token before ';' must be the closing paren ')'
    const closeIdx = semiIdx - 1;
    if (closeIdx < 0 || tokens[closeIdx].type !== 'punct' || tokens[closeIdx].text !== ')') return null;

    // Walk backwards to the matching '('
    let depth = 0;
    let openIdx = -1;
    for (let t = closeIdx; t >= 0; t--) {
        const tok = tokens[t];
        if (tok.type !== 'punct') continue;
        if (tok.text === ')') depth++;
        else if (tok.text === '(') {
            depth--;
            if (depth === 0) { openIdx = t; break; }
        }
    }
    if (openIdx < 0) return null;

    const openTok = tokens[openIdx];
    const closeTok = tokens[closeIdx];

    const prefix = line.slice(0, openTok.end);      // indent + receiver path + '('
    const argSource = line.slice(openTok.end, closeTok.start);
    const suffix = line.slice(closeTok.start);      // ')' + ';' + optional comment

    // Everything after ')' must be ';' + optional trailing comment
    if (!/^\)\s*;/.test(suffix)) return null;
    const afterSemi = suffix.replace(/^\)\s*;\s*/, '');
    if (afterSemi && !(/^(\/\/.*|\/\*[\s\S]*\*\/)$/.test(afterSemi))) return null;

    // Multiline argument list → skip (v1 safety rule)
    if (/[\r\n]/.test(argSource)) return null;

    const args = splitTopLevelArgs(argSource);
    if (!args || args.length === 0) return null;
    // A comma must actually exist between arguments (args all from one token
    // range when no split happened is handled by length check below).
    if (argSource.includes(',') && args.length === 1) return null;

    const argList = args.map(sourceText => ({
        sourceText,
        displayWidth: 0,
        kind: classifyArgument(sourceText)
    }));

    const methodName = extractMethodName(tokens, openIdx);

    return {
        prefix,
        suffix,
        arguments: argList,
        methodName,
        argCount: argList.length,
        identity: prefix + '/' + argList.length,
        isMultiline: false
    };
}

/** Method name for the '(' at openIdx — handles generic methods. */
function extractMethodName(tokens, openIdx) {
    for (let t = openIdx - 1; t >= 0; t--) {
        const tok = tokens[t];
        if (tok.type === 'comment') continue;
        if (tok.type === 'word') return tok.text;
        if (tok.type === 'punct' && (tok.text === '>' || tok.text === ']' || tok.text === ')')) continue;
        break;
    }
    return null;
}

// ============================================================
// GROUPING
// ============================================================

/**
 * Walk the parsed lines and collect consecutive lines whose
 * invocation identity matches (same prefix/receiver, same method,
 * same argument count). Any null entry (blank line, unparseable
 * line, different method...) breaks the current group.
 */
function buildGroups(parsedList) {
    const groups = [];
    let current = [];
    let identity = null;

    parsedList.forEach((info, idx) => {
        if (!info) {
            if (current.length) { groups.push(current); current = []; identity = null; }
            return;
        }
        if (identity === null || info.identity === identity) {
            current.push({ idx, info });
            identity = info.identity;
        } else {
            groups.push(current);
            current = [{ idx, info }];
            identity = info.identity;
        }
    });
    if (current.length) groups.push(current);
    return groups;
}

// ============================================================
// CORE ALGORITHM
// ============================================================

const CS_DEFAULT_OPTIONS = {
    minimumGroupSize: 2,
    alignNumbersRight: true,
    alignmentPadding: 1,          // single space after the comma
    tabSize: 4,
    maxOutputLineLength: 240
};

/**
 * Format one group of calls.
 * Returns the aligned lines, or null when the group must be
 * skipped (line-length guard exceeded).
 */
function formatGroup(calls, opts) {
    const columnCount = calls[0].arguments.length;
    const maxWidths = new Array(columnCount).fill(0);

    // Step 1 — max display width per argument column
    for (const call of calls) {
        for (let c = 0; c < columnCount; c++) {
            const arg = call.arguments[c];
            arg.displayWidth = getDisplayWidth(arg.sourceText, opts.tabSize);
            maxWidths[c] = Math.max(maxWidths[c], arg.displayWidth);
        }
    }

    // Step 2 — rebuild each line. Numeric args are right-aligned by
    // default (`alignNumbersRight`); text args emit
    // `arg + padding + "," + " "`. When the option is off, numbers
    // emit their padding before the value instead. The last column
    // never gets a trailing pad, so re-formatting yields identical
    // output.
    const result = calls.map(call => {
        let out = call.prefix;
        for (let c = 0; c < columnCount; c++) {
            const arg = call.arguments[c];
            const pad = maxWidths[c] - arg.displayWidth;
            const isLast = c === columnCount - 1;
            const isNumber = opts.alignNumbersRight && arg.kind === 'number';

            if (isNumber) {
                out += ' '.repeat(pad);
                out += arg.sourceText;
                if (!isLast) out += ',' + ' '.repeat(opts.alignmentPadding);
            } else if (isLast) {
                out += arg.sourceText;
            } else {
                out += arg.sourceText;
                out += ',';
                out += ' '.repeat(pad + opts.alignmentPadding);
            }
        }
        out += call.suffix;
        return out;
    });

    // Optional line-length protection
    if (opts.maxOutputLineLength > 0) {
        for (const line of result) {
            if (getDisplayWidth(line, opts.tabSize) > opts.maxOutputLineLength) {
                return null;
            }
        }
    }
    return result;
}

/** Split source text into lines, keeping each line's EOL. */
function splitKeepingEOL(text) {
    const lines = [];
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') {
            lines.push(text.slice(start, i + 1));
            start = i + 1;
        } else if (text[i] === '\r') {
            if (text[i + 1] === '\n') {
                lines.push(text.slice(start, i + 2));
                start = i + 2;
                i++;
            } else {
                lines.push(text.slice(start, i + 1));
                start = i + 1;
            }
        }
    }
    if (start < text.length) lines.push(text.slice(start));
    return lines;
}

/**
 * Main entry: align repeated method calls across the whole source.
 * Idempotent: format(format(source)) === format(source).
 * Only whitespace between arguments may change.
 */
function formatCSharpColumnAlignment(source, options) {
    const opts = Object.assign({}, CS_DEFAULT_OPTIONS, options || {});

    const lines = splitKeepingEOL(source);
    const parsed = lines.map(l => parseInvocation(l.replace(/\r?\n$|\r$/, '')));
    const groups = buildGroups(parsed);

    const replacements = new Map();
    let groupsFormatted = 0;
    let callsFormatted = 0;

    for (const group of groups) {
        if (group.length < opts.minimumGroupSize) continue;

        const formatted = formatGroup(group.map(g => g.info), opts);
        if (formatted === null) continue;

        formatted.forEach((text, k) => replacements.set(group[k].idx, text));
        groupsFormatted++;
        callsFormatted += group.length;
    }

    const output = lines.map((l, i) => {
        if (replacements.has(i)) {
            const eol = /(\r?\n)$|\r$/.exec(l);
            return replacements.get(i) + (eol ? eol[1] || eol[0] : '');
        }
        return l;
    }).join('');

    return { output, groupsFormatted, callsFormatted };
}

// ============================================================
// UI WIRING
// ============================================================

function csGetOptions() {
    const minGroup = parseInt(document.getElementById('csMinGroupSize')?.value || '2', 10);
    const maxLen = parseInt(document.getElementById('csMaxLineLength')?.value || '240', 10);
    return {
        minimumGroupSize: minGroup >= 2 ? minGroup : 2,
        alignNumbersRight: document.getElementById('csAlignNumbersRight')?.checked ?? true,
        maxOutputLineLength: maxLen >= 0 ? maxLen : 240,
        alignmentPadding: 1,
        tabSize: 4
    };
}

function csAlignColumns() {
    const inputEl = document.getElementById('csInput');
    const outputEl = document.getElementById('csOutput');
    if (!inputEl || !outputEl) return;

    const source = inputEl.value;
    if (!source.trim()) {
        showToast(t('csToastEmpty'), 'error');
        return;
    }

    const opts = csGetOptions();
    const result = formatCSharpColumnAlignment(source, opts);
    outputEl.value = result.output;

    if (result.output) {
        copyToClipboardModern(result.output).catch(() => {});
    }

    if (result.groupsFormatted === 0) {
        showToast(t('csToastNoGroup'), 'info');
    } else {
        const msg = t('csToastSuccess');
        showToast(typeof msg === 'function' ? msg(result.groupsFormatted, result.callsFormatted) : msg, 'success');
    }
    return result;
}

function clearCsInput() {
    const inputEl = document.getElementById('csInput');
    const outputEl = document.getElementById('csOutput');
    if (inputEl) inputEl.value = '';
    if (outputEl) outputEl.value = '';
    showToast(t('csToastCleared'), 'success');
}

async function copyCsResult() {
    const outputEl = document.getElementById('csOutput');
    const text = outputEl ? outputEl.value : '';
    if (!text) {
        showToast(t('csToastNoCopy'), 'error');
        return;
    }
    try {
        await copyToClipboardModern(text);
        showToast(t('csToastCopied'), 'success');
    } catch (err) {
        showToast('Copy failed', 'error');
    }
}

// ============================================================
// SELF-TESTS  (run runCsFormatterTests() from the console)
// ============================================================

function runCsFormatterTests() {
    const failures = [];
    let count = 0;

    function eq(label, actual, expected) {
        count++;
        if (actual !== expected) {
            failures.push({ label, actual, expected });
        }
    }

    const opts = CS_DEFAULT_OPTIONS;

    // Reference example from the spec (section 1)
    const initInput = [
        '_GridUtil.InitColumn(grid2, "PLANT_CD", "사업장", 140, 0, false, false, 2, GridColDataType_emu.VarChar, HAlign.Left, string.Empty, string.Empty);',
        '_GridUtil.InitColumn(grid2, "REC_DT", "생산일자", 90, 0, true, false, 2, GridColDataType_emu.YearMonthDay, HAlign.Center, string.Empty, string.Empty);',
        '_GridUtil.InitColumn(grid2, "OR_NO", "작업지시번호", 140, 0, false, false, 2, GridColDataType_emu.VarChar, HAlign.Center, string.Empty, string.Empty);'
    ].join('\n');
    const initExpected = [
        '_GridUtil.InitColumn(grid2, "PLANT_CD", "사업장",       140, 0, false, false, 2, GridColDataType_emu.VarChar,      HAlign.Left,   string.Empty, string.Empty);',
        '_GridUtil.InitColumn(grid2, "REC_DT",   "생산일자",      90, 0, true,  false, 2, GridColDataType_emu.YearMonthDay, HAlign.Center, string.Empty, string.Empty);',
        '_GridUtil.InitColumn(grid2, "OR_NO",    "작업지시번호", 140, 0, false, false, 2, GridColDataType_emu.VarChar,      HAlign.Center, string.Empty, string.Empty);'
    ].join('\n');
    eq('InitColumn example (Korean width 2)', formatCSharpColumnAlignment(initInput, opts).output, initExpected);

    // Test 1 — Latin
    eq('Test 1 Latin',
        formatCSharpColumnAlignment('Method("A", 10, true);\nMethod("BBBB", 200, false);', opts).output,
        'Method("A",     10, true);\nMethod("BBBB", 200, false);');

    // Test 2 — Korean
    eq('Test 2 Korean',
        formatCSharpColumnAlignment('Method("A", "사업장", 10);\nMethod("BBBB", "작업지시번호", 200);', opts).output,
        'Method("A",    "사업장",        10);\nMethod("BBBB", "작업지시번호", 200);');

    // Test 3 — Mixed Latin/Korean
    eq('Test 3 Mixed',
        formatCSharpColumnAlignment('Method("LOT NO", "사업장");\nMethod("CELL ID", "생산일자");', opts).output,
        'Method("LOT NO",  "사업장");\nMethod("CELL ID", "생산일자");');

    // Test 4 — Comma inside string
    eq('Test 4 comma in string',
        formatCSharpColumnAlignment('Method("A,B,C", 10);\nMethod("D", 200);', opts).output,
        'Method("A,B,C",  10);\nMethod("D",     200);');

    // Test 5 — Nested method
    eq('Test 5 nested method',
        formatCSharpColumnAlignment('Method(GetValue(a, b), 10);\nMethod(GetOtherValue(x, y), 200);', opts).output,
        'Method(GetValue(a, b),       10);\nMethod(GetOtherValue(x, y), 200);');

    // Test 6 — Escaped string (measured as raw source text)
    eq('Test 6 escaped string',
        formatCSharpColumnAlignment('Method("A\\r\\nB", 10);\nMethod("ABC", 200);', opts).output,
        'Method("A\\r\\nB",  10);\nMethod("ABC",    200);');

    // Test 7 — Numeric default: right-aligned
    eq('Test 7 numeric right align',
        formatCSharpColumnAlignment('Method("A", 1, 5);\nMethod("B", 100, 5);', opts).output,
        'Method("A",   1, 5);\nMethod("B", 100, 5);');

    // Test 7b — alignNumbersRight option disables right-alignment
    eq('Test 7b numeric left align option',
        formatCSharpColumnAlignment('Method("A", 1);\nMethod("B", 100);\nMethod("C", 25);',
            Object.assign({}, opts, { alignNumbersRight: false })).output,
        'Method("A", 1);\nMethod("B", 100);\nMethod("C", 25);');

    // Test 8 — Boolean alignment
    eq('Test 8 boolean',
        formatCSharpColumnAlignment('Method("A", true, false);\nMethod("B", false, true);', opts).output,
        'Method("A", true,  false);\nMethod("B", false, true);');

    // Test 9 — Different methods must not group
    const t9 = 'MethodA("A", 10);\nMethodB("BBBB", 200);';
    eq('Test 9 different methods', formatCSharpColumnAlignment(t9, opts).output, t9);

    // Test 10 — Blank line separates groups
    const t10 = 'Method("A", 10);\n\nMethod("BBBB", 200);';
    eq('Test 10 blank line', formatCSharpColumnAlignment(t10, opts).output, t10);

    // Test 11 — Idempotency for every sample
    const samples = [initInput, t9, t10,
        'Method("A", 10, true);\nMethod("BBBB", 200, false);',
        'Method("A", "사업장", 10);\nMethod("BBBB", "작업지시번호", 200);',
        'Method("LOT NO", "사업장");\nMethod("CELL ID", "생산일자");',
        'Method("A,B,C", 10);\nMethod("D", 200);',
        'Method(GetValue(a, b), 10);\nMethod(GetOtherValue(x, y), 200);',
        'Method("A\\r\\nB", 10);\nMethod("ABC", 200);',
        'Method("A", 1);\nMethod("B", 100);\nMethod("C", 25);',
        'Method("A", true, false);\nMethod("B", false, true);'
    ];
    for (const s of samples) {
        const once = formatCSharpColumnAlignment(s, opts).output;
        const twice = formatCSharpColumnAlignment(once, opts).output;
        eq('Idempotency: ' + s.split('\n')[0], twice, once);
    }

    // Comments preserved (and left after ');')
    const tC = 'Method("A", 100, true); // first\nMethod("B", 200, true); // second';
    eq('Comments preserved', formatCSharpColumnAlignment(tC, opts).output,
        'Method("A", 100, true); // first\nMethod("B", 200, true); // second');

    // Different receivers must not group
    const tR = 'gridUtil1.InitColumn(a, 10);\ngridUtil2.InitColumn(b, 200);';
    eq('Different receivers not grouped', formatCSharpColumnAlignment(tR, opts).output, tR);

    // Multiline call skipped (line fragments must not be touched)
    const tM = 'Method(\n    GetValue(a, b),\n    10);\nMethod(\n    GetOtherValue(x, y),\n    200);';
    eq('Multiline groups skipped', formatCSharpColumnAlignment(tM, opts).output, tM);

    // Single call alone → untouched
    eq('Single call untouched',
        formatCSharpColumnAlignment('Method("A", 10, true);', opts).output,
        'Method("A", 10, true);');

    // Group size option
    const tG = 'Method("A", 10);\nMethod("B", 200);';
    eq('min group size respected',
        formatCSharpColumnAlignment(tG, Object.assign({}, opts, { minimumGroupSize: 3 })).output, tG);

    // Line-length guard
    const tL = 'Method("VERY_VERY_VERY_LONG_VALUE_VERY_VERY_VERY_LONG_VALUE", value);\nMethod("A", value);';
    eq('Line-length guard skips group',
        formatCSharpColumnAlignment(tL, Object.assign({}, opts, { maxOutputLineLength: 60 })).output, tL);

    // \r\n line endings preserved
    eq('CRLF preserved', formatCSharpColumnAlignment('Method("A", 10);\r\nMethod("BBBB", 200);', opts).output,
        'Method("A",     10);\r\nMethod("BBBB", 200);');

    console.log(`CS Formatter tests: ${count - failures.length}/${count} passed`);
    if (failures.length) {
        console.table(failures.map(f => ({ label: f.label, expected: JSON.stringify(f.expected), actual: JSON.stringify(f.actual) })));
    }
    return failures.length === 0;
}

    // Export public API to global scope (preserving backward compatibility)
    global.formatCSharpColumnAlignment = formatCSharpColumnAlignment;
    global.csGetOptions = csGetOptions;
    global.csAlignColumns = csAlignColumns;
    global.clearCsInput = clearCsInput;
    global.runCsFormatterTests = runCsFormatterTests;
    global.CsFormatter = {
        format: formatCSharpColumnAlignment,
        getOptions: csGetOptions,
        align: csAlignColumns,
        clear: clearCsInput,
        runTests: runCsFormatterTests
    };
})(typeof window !== 'undefined' ? window : globalThis);
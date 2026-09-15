/**
 * ============================================================
 *  code-generator.js — QR & Data Matrix Generator Module
 * ============================================================
 *  Batch generates QR Codes and Data Matrix barcodes via bwip-js
 *  with customizable grid layout, sizing, and print styling.
 * ============================================================
 */

(function (global) {
    'use strict';

    let codeGeneratorState = {
        payloads: [],
        options: null,
        generated: false,
        errors: [],
        generating: false
    };

    const CODE_OPTION_LIMITS = {
        columns: { min: 1, max: 8 },
        rows: { min: 1, max: 20 },
        size: { min: 8, max: 60 },
        spacing: { min: 0, max: 20 }
    };

    function getCodeMessage(key, ...args) {
        if (typeof t !== 'function') return key;
        const message = t(key);
        return typeof message === 'function' ? message(...args) : message;
    }

    function setCodeStatus(message, type = '') {
        const statusEl = document.getElementById('codeStatus');
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.className = `code-status${type ? ` ${type}` : ''}`;
    }

    function parseCodeInput(input, removeEmpty = true) {
        const lines = input.split(/\r?\n/);
        return removeEmpty ? lines.filter(line => line.length > 0) : lines;
    }

    function readCodeOptions() {
        const values = {
            type: document.getElementById('codeType')?.value || 'qrcode',
            errorCorrection: document.getElementById('qrErrorCorrection')?.value || 'M',
            columns: Number.parseInt(document.getElementById('gridColumns')?.value || '', 10),
            rows: Number.parseInt(document.getElementById('gridRows')?.value || '', 10),
            size: Number.parseInt(document.getElementById('codeSize')?.value || '', 10),
            spacing: Number.parseInt(document.getElementById('labelSpacing')?.value || '', 10),
            removeEmpty: document.getElementById('codeRemoveEmpty')?.checked ?? true
        };

        if (!['qrcode', 'datamatrix'].includes(values.type)) {
            throw new Error(getCodeMessage('codeInvalidOptions'));
        }

        for (const key of ['columns', 'rows', 'size', 'spacing']) {
            const limits = CODE_OPTION_LIMITS[key];
            if (!Number.isInteger(values[key]) || values[key] < limits.min || values[key] > limits.max) {
                throw new Error(getCodeMessage('codeInvalidOptions'));
            }
        }

        return values;
    }

    function updateCodeInputStats() {
        const inputEl = document.getElementById('codeInput');
        const statsEl = document.getElementById('codeInputStats');
        if (!inputEl || !statsEl) return;
        const removeEmpty = document.getElementById('codeRemoveEmpty')?.checked ?? true;
        statsEl.textContent = getCodeMessage('codeInputStats', parseCodeInput(inputEl.value, removeEmpty).length);
    }

    function invalidateCodeGeneration() {
        codeGeneratorState.generated = false;
        const printBtn = document.getElementById('codePrintBtn');
        if (printBtn) printBtn.disabled = true;
        if (codeGeneratorState.payloads.length > 0) {
            setCodeStatus(getCodeMessage('codeStaleState'), 'info');
        }
    }

    function renderCodeCanvas(canvas, payload, options) {
        if (!window.bwipjs || typeof window.bwipjs.toCanvas !== 'function') {
            throw new Error(getCodeMessage('codeLibraryMissing'));
        }

        window.bwipjs.toCanvas(canvas, {
            bcid: options.type,
            text: payload,
            scale: 4,
            padding: 2,
            includetext: false,
            eclevel: options.type === 'qrcode' ? options.errorCorrection : undefined
        });
    }

    function createCodeLabel(payload, index, options) {
        const label = document.createElement('article');
        label.className = 'code-label';
        label.setAttribute('aria-label', getCodeMessage('codeLabelAria', index + 1));

        const canvas = document.createElement('canvas');
        canvas.className = 'code-symbol';
        canvas.setAttribute('aria-label', getCodeMessage('codeSymbolAria', options.type));
        label.appendChild(canvas);

        const text = document.createElement('div');
        text.className = 'code-label-text';
        text.textContent = payload;
        label.appendChild(text);

        try {
            renderCodeCanvas(canvas, payload, options);
        } catch (error) {
            label.classList.add('code-label-error');
            canvas.remove();
            const errorEl = document.createElement('div');
            errorEl.className = 'code-label-error-message';
            errorEl.textContent = getCodeMessage('codeEncodingError', index + 1);
            label.insertBefore(errorEl, text);
            return { label, error };
        }

        canvas.style.width = `${options.size}mm`;
        canvas.style.height = 'auto';
        return { label, error: null };
    }

    async function renderCodeGrid(payloads, options) {
        const previewEl = document.getElementById('codePreview');
        if (!previewEl) return [];

        previewEl.textContent = '';
        previewEl.style.setProperty('--code-columns', options.columns);
        previewEl.style.setProperty('--code-rows', options.rows);
        previewEl.style.setProperty('--code-size', `${options.size}mm`);
        previewEl.style.setProperty('--code-spacing', `${options.spacing}mm`);

        const errors = [];
        const perPage = options.columns * options.rows;
        let page;

        for (let index = 0; index < payloads.length; index++) {
            if (index % 12 === 0) {
                await new Promise(resolve => requestAnimationFrame(resolve));
            }

            if (index % perPage === 0) {
                page = document.createElement('section');
                page.className = 'code-print-page';
                page.setAttribute('aria-label', getCodeMessage('codePageAria', Math.floor(index / perPage) + 1));
                page.style.setProperty('--code-columns', options.columns);
                page.style.setProperty('--code-rows', options.rows);
                page.style.setProperty('--code-size', `${options.size}mm`);
                page.style.setProperty('--code-spacing', `${options.spacing}mm`);
                previewEl.appendChild(page);
            }

            const result = createCodeLabel(payloads[index], index, options);
            page.appendChild(result.label);
            if (result.error) errors.push({ index, error: result.error });
        }

        return errors;
    }

    async function generateCodes() {
        if (codeGeneratorState.generating) return;

        const inputEl = document.getElementById('codeInput');
        const generateBtn = document.getElementById('codeGenerateBtn');
        const printBtn = document.getElementById('codePrintBtn');
        if (!inputEl) return;

        let options;
        try {
            options = readCodeOptions();
        } catch (error) {
            setCodeStatus(error.message, 'error');
            if (typeof showToast === 'function') showToast(error.message, 'error');
            return;
        }

        const payloads = parseCodeInput(inputEl.value, options.removeEmpty);
        if (payloads.length === 0) {
            setCodeStatus(getCodeMessage('codeEmptyInput'), 'error');
            if (typeof showToast === 'function') showToast(getCodeMessage('codeEmptyInput'), 'error');
            return;
        }

        codeGeneratorState.generating = true;
        codeGeneratorState.generated = false;
        codeGeneratorState.payloads = payloads;
        codeGeneratorState.options = options;
        codeGeneratorState.errors = [];
        if (generateBtn) generateBtn.disabled = true;
        if (printBtn) printBtn.disabled = true;
        setCodeStatus(getCodeMessage('codeGenerating', payloads.length), 'info');

        try {
            const errors = await renderCodeGrid(payloads, options);
            codeGeneratorState.errors = errors;
            codeGeneratorState.generated = errors.length === 0;
            if (errors.length > 0) {
                setCodeStatus(getCodeMessage('codeGeneratedWithErrors', payloads.length, errors.length), 'error');
                if (typeof showToast === 'function') showToast(getCodeMessage('codeGeneratedWithErrors', payloads.length, errors.length), 'error');
            } else {
                setCodeStatus(getCodeMessage('codeGenerated', payloads.length), 'success');
                if (typeof showToast === 'function') showToast(getCodeMessage('codeGenerated', payloads.length), 'success');
            }
            if (printBtn) printBtn.disabled = !codeGeneratorState.generated;
        } catch (error) {
            codeGeneratorState.payloads = [];
            codeGeneratorState.options = null;
            const preview = document.getElementById('codePreview');
            if (preview) preview.textContent = '';
            setCodeStatus(error.message || getCodeMessage('codeGenerationFailed'), 'error');
            if (typeof showToast === 'function') showToast(error.message || getCodeMessage('codeGenerationFailed'), 'error');
        } finally {
            codeGeneratorState.generating = false;
            if (generateBtn) generateBtn.disabled = false;
        }
    }

    function clearCodeInput() {
        const inputEl = document.getElementById('codeInput');
        const previewEl = document.getElementById('codePreview');
        if (inputEl) inputEl.value = '';
        if (previewEl) previewEl.textContent = '';
        codeGeneratorState = { payloads: [], options: null, generated: false, errors: [], generating: false };
        const printBtn = document.getElementById('codePrintBtn');
        if (printBtn) printBtn.disabled = true;
        updateCodeInputStats();
        setCodeStatus(getCodeMessage('codeEmptyState'));
        if (typeof showToast === 'function') showToast(getCodeMessage('codeCleared'), 'success');
    }

    function printCodes() {
        if (!codeGeneratorState.generated || codeGeneratorState.errors.length > 0) {
            setCodeStatus(getCodeMessage('codeNotReadyToPrint'), 'error');
            if (typeof showToast === 'function') showToast(getCodeMessage('codeNotReadyToPrint'), 'error');
            return;
        }
        window.print();
    }

    function initCodeGenerator() {
        const inputEl = document.getElementById('codeInput');
        const removeEmptyEl = document.getElementById('codeRemoveEmpty');
        const typeEl = document.getElementById('codeType');
        const qrErrorGroup = document.getElementById('qrErrorGroup');
        if (!inputEl) return;

        const sync = () => {
            updateCodeInputStats();
            invalidateCodeGeneration();
            if (qrErrorGroup) qrErrorGroup.style.display = typeEl?.value === 'qrcode' ? 'flex' : 'none';
        };

        inputEl.addEventListener('input', sync);
        removeEmptyEl?.addEventListener('change', sync);
        typeEl?.addEventListener('change', sync);
        document.getElementById('qrErrorCorrection')?.addEventListener('change', sync);
        ['gridColumns', 'gridRows', 'codeSize', 'labelSpacing'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', sync);
        });
        updateCodeInputStats();
        if (qrErrorGroup) qrErrorGroup.style.display = typeEl?.value === 'qrcode' ? 'flex' : 'none';
    }

    // Export public API
    global.generateCodes = generateCodes;
    global.clearCodeInput = clearCodeInput;
    global.printCodes = printCodes;
    global.initCodeGenerator = initCodeGenerator;
    global.renderCodeCanvas = renderCodeCanvas;
    global.CodeGenerator = {
        generate: generateCodes,
        clear: clearCodeInput,
        print: printCodes,
        init: initCodeGenerator,
        getState: () => codeGeneratorState
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('DOMContentLoaded', initCodeGenerator);
    }
})(typeof window !== 'undefined' ? window : globalThis);

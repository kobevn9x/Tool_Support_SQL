// Load history from localStorage with validation
let formatterHistory = [];
try {
    const stored = localStorage.getItem('sqlFormatterHistory');
    if (stored) {
        const parsed = JSON.parse(stored);
        // Validate it's an array
        if (Array.isArray(parsed)) {
            formatterHistory = parsed;
        }
    }
} catch (error) {
    console.error('Failed to load history:', error);
    localStorage.removeItem('sqlFormatterHistory');
}

let currentChunks = [];
let currentChunkIndex = 0;
let isProcessing = false;

// --- Theme Manager (Light / Dark Mode with Auto Schedule) ---
let currentTheme = localStorage.getItem('appTheme') || 'dark';
let autoThemeEnabled = localStorage.getItem('sqlFormatterAutoTheme') === 'true'; // default to false
let autoThemeTimer = null;

function initTheme() {
    // 1. Initialize Auto Theme checkbox state from localStorage
    const autoThemeCheckbox = document.getElementById('autoTheme');
    if (autoThemeCheckbox) {
        autoThemeCheckbox.checked = autoThemeEnabled;
        autoThemeCheckbox.addEventListener('change', handleAutoThemeCheckboxChange);
    }

    // 2. Set theme based on active configurations
    if (autoThemeEnabled) {
        checkAutoTheme();
        // Always apply theme to ensure body class and button icon are in sync,
        // even when auto theme doesn't change (e.g. reload with same stored theme)
        applyTheme(currentTheme);
    } else {
        applyTheme(currentTheme);
    }

    // 3. Register manual switch trigger
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // 4. Start low-frequency tick to switch theme automatically when open
    startAutoThemeTimer();
}

function checkAutoTheme() {
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 18 || currentHour < 7; // Night is 18:00 (6 PM) to 07:00 AM
    const targetTheme = isNight ? 'dark' : 'light';
    
    if (currentTheme !== targetTheme) {
        currentTheme = targetTheme;
        localStorage.setItem('appTheme', currentTheme);
        applyTheme(currentTheme);
    }
}

function startAutoThemeTimer() {
    if (autoThemeTimer) clearInterval(autoThemeTimer);
    autoThemeTimer = setInterval(() => {
        if (autoThemeEnabled) {
            checkAutoTheme();
        }
    }, 15000); // Check every 15 seconds
}

function handleAutoThemeCheckboxChange(e) {
    autoThemeEnabled = e.target.checked;
    localStorage.setItem('sqlFormatterAutoTheme', autoThemeEnabled);

    if (autoThemeEnabled) {
        checkAutoTheme();
        showToast(t('toastAutoThemeEnabled'), 'success');
    } else {
        // Persist the current theme so it survives reloads
        localStorage.setItem('appTheme', currentTheme);
        showToast(t('toastAutoThemeDisabled'), 'info');
    }
}

function toggleTheme() {
    // If auto theme is active, clicking manual theme toggle overrides/disables the schedule
    if (autoThemeEnabled) {
        autoThemeEnabled = false;
        localStorage.setItem('sqlFormatterAutoTheme', 'false');
        
        const autoThemeCheckbox = document.getElementById('autoTheme');
        if (autoThemeCheckbox) {
            autoThemeCheckbox.checked = false;
        }
        
        showToast(t('toastAutoThemeDisabled'), 'info');
    }

    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('appTheme', currentTheme);
    applyTheme(currentTheme);
}

function applyTheme(theme) {
    const body = document.body;
    const btn = document.getElementById('themeToggleBtn');
    
    if (theme === 'dark') {
        body.classList.add('dark');
    } else {
        body.classList.remove('dark');
    }

    if (btn) {
        // Update SVG icon inside the button and its tooltips/aria-labels
        if (theme === 'dark') {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
            `;
            btn.title = t('themeLight');
            btn.setAttribute('aria-label', t('themeLight'));
        } else {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
            `;
            btn.title = t('themeDark');
            btn.setAttribute('aria-label', t('themeDark'));
        }
    }
}

// ============================================
// PAGE NAVIGATION & LIQUID GLASS GLIDER
// ============================================

let currentActiveNavIndex = 0;

function switchPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => {
        p.style.display = 'none';
    });

    const target = document.getElementById('page-' + pageId);
    if (target) {
        target.style.display = 'flex';
    }

    // Orange theme is active only while on the Add Comment tab
    document.body.classList.toggle('orange', pageId === 'sql-comment');

    const navItems = Array.from(document.querySelectorAll('.app-nav .nav-item'));
    const prevIndex = currentActiveNavIndex;
    let newIndex = -1;

    navItems.forEach((item, index) => {
        const isActive = item.dataset.page === pageId;
        item.classList.toggle('active', isActive);
        if (isActive) {
            item.setAttribute('aria-current', 'page');
            newIndex = index;
        } else {
            item.removeAttribute('aria-current');
        }
    });

    if (newIndex !== -1) {
        currentActiveNavIndex = newIndex;
        updateNavGlider(prevIndex, newIndex);
    }
}

/**
 * Apple Fluid Liquid Glass Glider positioning and physical spring animation
 */
function updateNavGlider(prevIndex = -1, newIndex = -1, immediate = false) {
    const nav = document.querySelector('.app-nav');
    const glider = document.getElementById('navGlider');
    if (!nav || !glider) return;

    nav.classList.add('has-glider');

    const activeItem = nav.querySelector('.nav-item.active');
    if (!activeItem) {
        glider.style.opacity = '0';
        return;
    }

    const navRect = nav.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();

    const targetX = itemRect.left - navRect.left;
    const targetY = itemRect.top - navRect.top;
    const targetW = itemRect.width;
    const targetH = itemRect.height;

    // Direct immediate placement without animation (on load, resize, i18n change)
    if (immediate || prevIndex === -1 || prevIndex === newIndex) {
        glider.style.transition = 'none';
        glider.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
        glider.style.width = `${targetW}px`;
        glider.style.height = `${targetH}px`;
        glider.style.opacity = '1';
        void glider.offsetHeight; // force reflow
        glider.style.transition = '';
        return;
    }

    const jumpCount = Math.abs(newIndex - prevIndex);
    const isMovingRight = newIndex > prevIndex;

    // Reset previous animation classes to retrigger keyframe animation cleanly
    glider.classList.remove('gliding-right', 'gliding-left', 'gliding-jump-1', 'gliding-jump-multi');
    void glider.offsetWidth; // force reflow

    const dirClass = isMovingRight ? 'gliding-right' : 'gliding-left';
    const jumpClass = jumpCount > 1 ? 'gliding-jump-multi' : 'gliding-jump-1';
    glider.classList.add(dirClass, jumpClass);

    // Apply hardware-accelerated spring translate and dimensions
    glider.style.opacity = '1';
    glider.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    glider.style.width = `${targetW}px`;
    glider.style.height = `${targetH}px`;

    // Clean up animation classes once spring oscillation settles
    clearTimeout(glider._gliderTimer);
    glider._gliderTimer = setTimeout(() => {
        glider.classList.remove('gliding-right', 'gliding-left', 'gliding-jump-1', 'gliding-jump-multi');
    }, 500);
}

/**
 * Initialize tactile interactions and window observers for nav glider
 */
function initNavGlider() {
    const nav = document.querySelector('.app-nav');
    const glider = document.getElementById('navGlider');
    if (!nav || !glider) return;

    // Tactile press squish on pointer events
    nav.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('pointerdown', () => {
            glider.classList.add('is-pressing');
        });
        const endPress = () => glider.classList.remove('is-pressing');
        item.addEventListener('pointerup', endPress);
        item.addEventListener('pointercancel', endPress);
        item.addEventListener('pointerleave', endPress);
    });

    // Window resize handler with requestAnimationFrame
    let resizeRaf = null;
    window.addEventListener('resize', () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
            updateNavGlider(-1, -1, true);
        });
    });
}

// Display history on load + init language
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguageSelector();
    applyLanguage(currentLang);
    displayHistory();
    initTemplateMode();
    if (typeof initCodeGenerator === 'function') {
        initCodeGenerator();
    }
    initNavGlider();
    switchPage('formatter');
    // Ensure accurate glider position after initial fonts/styles settle
    requestAnimationFrame(() => {
        updateNavGlider(-1, 0, true);
    });

    const clockEl = document.getElementById('headerClock');
    const tickClock = () => {
        if (!clockEl) return;
        clockEl.textContent = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };
    tickClock();
    setInterval(tickClock, 1000);
});

function convertData(isFromHistory = false) {
    // Prevent concurrent processing
    if (isProcessing) {
        return;
    }

    const input = document.getElementById('inputText').value;

    if (!input.trim()) {
        if (!isFromHistory) showToast(t('toastPleaseEnterData'), 'error');
        return;
    }

    // Template mode requires both a non-empty template and the {values} placeholder.
    const outputFormatEl = document.getElementById('outputFormat');
    if (outputFormatEl?.value === 'template') {
        const tpl = (document.getElementById('sqlTemplate')?.value || '').trim();
        if (!tpl) {
            if (!isFromHistory) showToast(t('toastTemplateEmpty'), 'error');
            return;
        }
        if (!tpl.includes('{values}')) {
            if (!isFromHistory) showToast(t('toastTemplateNoPlaceholder'), 'error');
            return;
        }
    }

    // Show loading state
    isProcessing = true;
    const sectionOutput = document.querySelector('.section-output');
    if (sectionOutput) sectionOutput.classList.add('processing');

    const convertBtn = document.querySelector('.btn-primary');
    const originalBtnText = convertBtn?.innerHTML;
    if (convertBtn) {
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<span class="spinner"></span> Processing...';
    }

    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(async () => {
        try {
            await processConversion(input, isFromHistory);
        } catch (error) {
            console.error('Conversion error:', error);
            showToast('Error: ' + error.message, 'error');
        } finally {
            // Reset loading state
            isProcessing = false;
            const sectionOutput = document.querySelector('.section-output');
            if (sectionOutput) sectionOutput.classList.remove('processing');

            if (convertBtn) {
                convertBtn.disabled = false;
                convertBtn.innerHTML = originalBtnText || '<span data-i18n="btnConvert">🔄 Convert</span>';
            }
        }
    }, 50);
}

// --- SQL TEMPLATE MODE ---
// Toggle the template textarea visibility based on the output format select.
function initTemplateMode() {
    const select = document.getElementById('outputFormat');
    const group = document.getElementById('templateGroup');
    if (!select || !group) return;
    const sync = () => {
        group.style.display = select.value === 'template' ? 'flex' : 'none';
    };
    select.addEventListener('change', sync);
    sync();
}

// Wrap a formatted value body with the user's SQL template.
// Returns the body unchanged when template mode is off or the template is empty.
function wrapWithTemplate(body) {
    const select = document.getElementById('outputFormat');
    if (!select || select.value !== 'template') return body;

    const tplEl = document.getElementById('sqlTemplate');
    const template = (tplEl?.value || '').trim();
    if (!template) return body;
    return template.replace(/\{values\}/g, body);
}

// --- OPTIMIZED PROCESSING PIPELINE ---

// ASSERT: detectDelimitersAndSplit('v1,v2;v3\nv4|v5\tv6') → ['v1', 'v2', 'v3', 'v4', 'v5', 'v6']
function detectDelimitersAndSplit(input) {
    // Split by newlines, commas, semicolons, pipes, or tabs
    return input.split(/[\r\n,;|\t]+/);
}

// ASSERT: sanitizeForSQL('O\'Reilly\r\n') → 'O\'Reilly'
function sanitizeForSQL(value) {
    // Strip control characters (including CRLF, tabs) that might break SQL strings
    return value.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

// ASSERT: validateLine(' ', true) → null; validateLine('NULL', true) → null; validateLine('val', true) → 'val'
function validateLine(value, removeEmpty) {
    if (removeEmpty && value.length === 0) return null;
    // SQL Server "NULL" handling inside IN clause doesn't match values properly
    if (value.toUpperCase() === 'NULL') return null;
    return value;
}

function buildProcessingPipeline(input, options) {
    return new Promise((resolve) => {
        const rawItems = detectDelimitersAndSplit(input);
        const totalItems = rawItems.length;
        let index = 0;
        
        const processed = [];
        const seen = new Set();
        
        const CHUNK_SIZE = 5000;

        function processNextChunk() {
            const end = Math.min(index + CHUNK_SIZE, totalItems);
            
            // Single-pass processing loop for performance (O(n) instead of chained O(n))
            for (; index < end; index++) {
                let val = rawItems[index];

                // 1. Sanitize & Trim
                val = sanitizeForSQL(val);

                // 2. Validate & Empty/Null Handling
                val = validateLine(val, options.removeEmpty);
                if (val === null) continue;

                // 3. Case Conversion (done BEFORE deduplication for determinism)
                if (options.uppercase) {
                    val = val.toUpperCase();
                } else if (options.lowercase) {
                    val = val.toLowerCase();
                }

                // 4. Deduplication
                if (options.removeDuplicates) {
                    if (seen.has(val)) continue;
                    seen.add(val);
                }

                // 5. Quote Escaping
                if (options.addQuotes) {
                    val = `'${val.replace(/'/g, "''")}'`;
                }

                processed.push(val);
            }

            if (index < totalItems) {
                requestAnimationFrame(processNextChunk);
            } else {
                resolve(processed);
            }
        }

        processNextChunk();
    });
}

async function processConversion(input, isFromHistory) {
    // Get options
    const options = {
        removeEmpty: document.getElementById('removeEmpty')?.checked ?? true,
        removeDuplicates: document.getElementById('removeDuplicates')?.checked ?? false,
        addQuotes: document.getElementById('addQuotes')?.checked ?? true,
        uppercase: document.getElementById('uppercase')?.checked ?? false,
        lowercase: document.getElementById('lowercase')?.checked ?? false,
        separator: document.getElementById('separator')?.value ?? ',',
        outputFormat: document.getElementById('outputFormat')?.value ?? 'inclause',
        inKeywordCase: document.getElementById('inKeywordCase')?.value ?? 'upper',
        itemsPerLine: parseInt(document.getElementById('itemsPerLine')?.value || '0', 10)
    };

    // Process lines using optimized single-pass pipeline
    let lines = await buildProcessingPipeline(input, options);

    // Check if we need to chunk the data (fixed off-by-one)
    const chunkSize = 1000;
    const shouldChunk = lines.length >= chunkSize;

    // Helper function to format lines based on output format
    const formatLines = (lineArray) => {
        const itemsPerLine = options.itemsPerLine > 0 ? options.itemsPerLine : 0;

        if (options.outputFormat === 'template') {
            return buildTemplateBody(lineArray);
        }

        if (options.outputFormat === 'inclause') {
            const inKeyword = options.inKeywordCase === 'upper' ? 'IN' : 'in';
            if (itemsPerLine > 0) {
                const groups = [];
                for (let i = 0; i < lineArray.length; i += itemsPerLine) {
                    groups.push(lineArray.slice(i, i + itemsPerLine).join(', '));
                }
                return `${inKeyword} (\n  ${groups.join(',\n  ')}\n)`;
            } else {
                // IN Clause format: IN ('val1', 'val2', 'val3')
                return `${inKeyword} (${lineArray.join(',')})`;
            }
        }

        if (options.outputFormat === 'valuerows') {
            return lineArray.map((val, i) =>
                i < lineArray.length - 1 ? `(${val}),` : `(${val})`
            ).join('\n');
        } else {
            // DataByRow format: each value on separate line with separator
            if (itemsPerLine > 0) {
                const groups = [];
                for (let i = 0; i < lineArray.length; i += itemsPerLine) {
                    const joinSep = (options.separator === ' ') ? ' ' : `${options.separator} `;
                    groups.push(lineArray.slice(i, i + itemsPerLine).join(joinSep));
                }
                return groups.join(`${options.separator}\n`);
            } else {
                return lineArray.join(`${options.separator}\n`);
            }
        }
    };

    // Build the body that fills the {values} placeholder in the SQL template.
    // Items-per-line applies here too: when set, items wrap like the IN-clause form.
    const buildTemplateBody = (lineArray) => {
        if (!lineArray || lineArray.length === 0) return '';
        const itemsPerLine = options.itemsPerLine > 0 ? options.itemsPerLine : 0;
        if (itemsPerLine > 0) {
            const groups = [];
            for (let i = 0; i < lineArray.length; i += itemsPerLine) {
                groups.push(lineArray.slice(i, i + itemsPerLine).join(', '));
            }
            return `(\n  ${groups.join(',\n  ')}\n)`;
        }
        return lineArray.join(', ');
    };

    if (shouldChunk) {
        // Split into chunks
        currentChunks = [];
        const isTemplateMode = options.outputFormat === 'template';
        for (let i = 0; i < lines.length; i += chunkSize) {
            const chunk = lines.slice(i, i + chunkSize);
            const body = formatLines(chunk);
            // For template mode, wrap each chunk separately (useful for batch INSERT/UPDATE)
            // For non-template modes, wrap normally
            currentChunks.push(wrapWithTemplate(body));
        }
        
        // Show chunked mode
        document.getElementById('singleOutputMode').style.display = 'none';
        document.getElementById('chunkedOutputMode').style.display = 'block';
        document.getElementById('chunkCountStat').style.display = 'block';
        
        // Create tabs
        createChunkTabs();
        
        // Show first chunk
        showChunk(0);
        if (!isFromHistory) copyToClipboardModern(currentChunks[0]).catch(() => {});

        // Update stats
        document.getElementById('lineCount').textContent = lines.length;
        document.getElementById('charCount').textContent = currentChunks.join('\n').length;
        document.getElementById('chunkCount').textContent = currentChunks.length;
        
        if (!isFromHistory) showToast(t('toastChunked')(currentChunks.length), 'success');
    } else {
        // Single output mode
        const result = wrapWithTemplate(formatLines(lines));
        
        document.getElementById('singleOutputMode').style.display = 'block';
        document.getElementById('chunkedOutputMode').style.display = 'none';
        document.getElementById('chunkCountStat').style.display = 'none';
        
        document.getElementById('outputText').value = result;

        // Update stats
        document.getElementById('lineCount').textContent = lines.length;
        document.getElementById('charCount').textContent = result.length;

        if (!isFromHistory) {
            copyToClipboardModern(result).catch(() => {});
            showToast(t('toastConvertSuccess'), 'success');
        }
    }
    
    // Save to history (save first chunk or full result)
    if (!isFromHistory) {
        const outputToSave = shouldChunk ? currentChunks[0] : document.getElementById('outputText').value;
        saveToHistory(input, outputToSave);
    }
}

function createChunkTabs() {
    const tabsContainer = document.getElementById('chunkTabs');
    tabsContainer.innerHTML = '';
    
    currentChunks.forEach((chunk, index) => {
        const tab = document.createElement('div');
        tab.className = 'chunk-tab';
        tab.textContent = `Block ${index + 1}`;
        tab.onclick = () => showChunk(index);
        tabsContainer.appendChild(tab);
    });
}

function showChunk(index) {
    currentChunkIndex = index;
    
    const textarea = document.getElementById('chunkedOutputText');
    const chunkContent = document.querySelector('.chunk-content');
    
    // Add fade transition
    if (chunkContent) {
        chunkContent.style.opacity = '0';
        
        setTimeout(() => {
            // Update textarea
            textarea.value = currentChunks[index];
            
            // Update active tab
            const tabs = document.querySelectorAll('.chunk-tab');
            tabs.forEach((tab, i) => {
                if (i === index) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            // Fade in
            chunkContent.style.opacity = '1';
        }, 150);
    } else {
        // Fallback without animation
        textarea.value = currentChunks[index];
        const tabs = document.querySelectorAll('.chunk-tab');
        tabs.forEach((tab, i) => {
            if (i === index) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }
}

async function copyCurrentChunk() {
    const textarea = document.getElementById('chunkedOutputText');
    
    if (!textarea.value) {
        showToast(t('toastNoDataCopy'), 'error');
        return;
    }
    
    try {
        await copyToClipboardModern(textarea.value);
        showToast(t('toastCopiedBlock')(currentChunkIndex + 1), 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Copy failed: ' + error.message, 'error');
    }
}

async function copyAllChunks() {
    if (currentChunks.length === 0) {
        showToast(t('toastNoDataCopy'), 'error');
        return;
    }
    
    const allData = currentChunks.join('\n\n');
    
    try {
        await copyToClipboardModern(allData);
        showToast(t('toastCopiedAllBlocks')(currentChunks.length), 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Copy failed: ' + error.message, 'error');
    }
}

function clearInput() {
    document.getElementById('inputText').value = '';
    document.getElementById('outputText').value = '';
    
    // Reset chunked mode UI
    currentChunks = [];
    currentChunkIndex = 0;
    document.getElementById('chunkedOutputText').value = '';
    document.getElementById('chunkTabs').innerHTML = '';
    
    // Reset views to single output mode
    document.getElementById('singleOutputMode').style.display = 'block';
    document.getElementById('chunkedOutputMode').style.display = 'none';
    document.getElementById('chunkCountStat').style.display = 'none';
    
    // Reset stats
    document.getElementById('lineCount').textContent = '0';
    document.getElementById('charCount').textContent = '0';
    document.getElementById('chunkCount').textContent = '0';

    showToast(t('toastCleared'), 'success');
}

async function copyToClipboard() {
    const output = document.getElementById('outputText');
    
    if (!output.value) {
        showToast(t('toastNoDataCopy'), 'error');
        return;
    }
    
    try {
        await copyToClipboardModern(output.value);
        showToast(t('toastCopied'), 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Copy failed: ' + error.message, 'error');
    }
}

// Modern Clipboard API with fallback
async function copyToClipboardModern(text) {
    // Try modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
    } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (!successful) {
                throw new Error('Copy command failed');
            }
        } finally {
            document.body.removeChild(textarea);
        }
    }
}

function downloadResult() {
    let output = '';
    
    // Check which mode is active
    if (document.getElementById('chunkedOutputMode').style.display !== 'none') {
        // Chunked mode - download all chunks
        output = currentChunks.join('\n\n');
    } else {
        // Single mode
        output = document.getElementById('outputText').value;
    }
    
    if (!output) {
        showToast(t('toastNoDataDownload'), 'error');
        return;
    }
    
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sql-data-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(t('toastDownloaded'), 'success');
}

function saveToHistory(input, output) {
    const historyItem = {
        id: Date.now(),
        input: input.substring(0, 200), // Limit to 200 chars for display
        fullInput: input,
        output: output.substring(0, 200),
        fullOutput: output,
        timestamp: new Date().toLocaleString('vi-VN'),
        options: {
            removeEmpty: document.getElementById('removeEmpty')?.checked ?? true,
            removeDuplicates: document.getElementById('removeDuplicates')?.checked ?? false,
            addQuotes: document.getElementById('addQuotes')?.checked ?? true,
            uppercase: document.getElementById('uppercase')?.checked ?? false,
            lowercase: document.getElementById('lowercase')?.checked ?? false,
            separator: document.getElementById('separator')?.value ?? ',',
            outputFormat: document.getElementById('outputFormat')?.value ?? 'inclause',
            inKeywordCase: document.getElementById('inKeywordCase')?.value ?? 'upper',
            itemsPerLine: document.getElementById('itemsPerLine')?.value ?? '',
            sqlTemplate: document.getElementById('sqlTemplate')?.value ?? ''
        }
    };
    
    formatterHistory.unshift(historyItem);
    
    // Keep only last 20 items
    if (formatterHistory.length > 20) {
        formatterHistory = formatterHistory.slice(0, 20);
    }
    
    localStorage.setItem('sqlFormatterHistory', JSON.stringify(formatterHistory));
    displayHistory();
}

// Optimized history rendering
function displayHistory() {
    const historyList = document.getElementById('historyList');
    
    if (formatterHistory.length === 0) {
        historyList.innerHTML = `<p style="text-align: center; color: #9ca3af; padding: 40px;">${t('historyEmpty')}</p>`;
        return;
    }
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    formatterHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const header = document.createElement('div');
        header.className = 'history-header';
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'history-time';
        timeSpan.textContent = `🕐 ${item.timestamp}`;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'history-actions';
        
        const loadBtn = document.createElement('button');
        loadBtn.className = 'btn btn-secondary btn-sm';
        loadBtn.textContent = t('btnLoad');
        loadBtn.onclick = () => loadHistory(item.id);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-success btn-sm';
        copyBtn.textContent = t('btnCopy');
        copyBtn.onclick = () => copyHistoryItem(item.id);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.textContent = '❌';
        deleteBtn.onclick = () => deleteHistoryItem(item.id);
        
        actionsDiv.appendChild(loadBtn);
        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(deleteBtn);
        
        header.appendChild(timeSpan);
        header.appendChild(actionsDiv);
        
        const content = document.createElement('div');
        content.className = 'history-content';
        // Use textContent to prevent XSS
        content.textContent = item.output.length >= 200 ? item.output + '...' : item.output;
        
        div.appendChild(header);
        div.appendChild(content);
        fragment.appendChild(div);
    });
    
    historyList.innerHTML = '';
    historyList.appendChild(fragment);
}

function loadHistory(id) {
    const item = formatterHistory.find(h => h.id === id);
    if (item) {
        document.getElementById('inputText').value = item.fullInput || item.input;
        
        // Restore options
        if (document.getElementById('removeEmpty')) document.getElementById('removeEmpty').checked = item.options.removeEmpty;
        if (document.getElementById('removeDuplicates')) document.getElementById('removeDuplicates').checked = item.options.removeDuplicates;
        if (document.getElementById('addQuotes')) document.getElementById('addQuotes').checked = item.options.addQuotes;
        if (document.getElementById('uppercase')) document.getElementById('uppercase').checked = item.options.uppercase;
        if (document.getElementById('lowercase')) document.getElementById('lowercase').checked = item.options.lowercase;
        if (document.getElementById('separator')) document.getElementById('separator').value = item.options.separator;
        if (item.options.outputFormat && document.getElementById('outputFormat')) document.getElementById('outputFormat').value = item.options.outputFormat;
        if (item.options.inKeywordCase && document.getElementById('inKeywordCase')) document.getElementById('inKeywordCase').value = item.options.inKeywordCase;
        if (document.getElementById('itemsPerLine')) {
            document.getElementById('itemsPerLine').value = item.options.itemsPerLine !== undefined ? item.options.itemsPerLine : '';
        }
        if (item.options.sqlTemplate !== undefined && document.getElementById('sqlTemplate')) {
            document.getElementById('sqlTemplate').value = item.options.sqlTemplate;
        }
        // Re-sync template visibility with restored output format
        const formatEl = document.getElementById('outputFormat');
        const groupEl = document.getElementById('templateGroup');
        if (formatEl && groupEl) groupEl.style.display = formatEl.value === 'template' ? 'flex' : 'none';
        
        // Handle proper output rendering logic including chunked mode splitting
        convertData(true);
        
        showToast(t('toastHistoryLoaded'), 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

async function copyHistoryItem(id) {
    const item = formatterHistory.find(h => h.id === id);
    if (item) {
        try {
            await copyToClipboardModern(item.fullOutput);
            showToast(t('toastHistoryCopied'), 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            showToast('Copy failed: ' + error.message, 'error');
        }
    }
}

async function deleteHistoryItem(id) {
    if (await showConfirm(t('confirmDeleteItem'))) {
        formatterHistory = formatterHistory.filter(h => h.id !== id);
        localStorage.setItem('sqlFormatterHistory', JSON.stringify(formatterHistory));
        displayHistory();
        showToast(t('toastHistoryItemDeleted'), 'success');
    }
}

function clearHistory() {
    showConfirm(t('confirmClearHistory')).then(confirmed => {
        if (confirmed) {
            formatterHistory = [];
            localStorage.setItem('sqlFormatterHistory', JSON.stringify(formatterHistory));
            displayHistory();
            showToast(t('toastHistoryCleared'), 'success');
        }
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Custom confirm dialog (styled to match theme)
function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirmOverlay');
        const msgEl = document.getElementById('confirmMessage');
        const cancelBtn = document.getElementById('confirmCancel');
        const okBtn = document.getElementById('confirmOk');

        if (!overlay || !msgEl || !cancelBtn || !okBtn) {
            resolve(window.confirm(message));
            return;
        }

        msgEl.textContent = message;
        overlay.style.display = 'flex';
        okBtn.focus();

        function cleanup() {
            overlay.style.display = 'none';
            cancelBtn.removeEventListener('click', onCancel);
            okBtn.removeEventListener('click', onOk);
            overlay.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onKeyDown);
        }

        function onCancel() {
            cleanup();
            resolve(false);
        }

        function onOk() {
            cleanup();
            resolve(true);
        }

        function onOverlayClick(e) {
            if (e.target === overlay) {
                onCancel();
            }
        }

        function onKeyDown(e) {
            if (e.key === 'Escape') {
                onCancel();
            }
        }

        cancelBtn.addEventListener('click', onCancel);
        okBtn.addEventListener('click', onOk);
        overlay.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeyDown);
    });
}

// ============================================
// MODULAR EXTENSIONS (Moved to standalone modules)
// - SQL Comment Generator: sql-comment.js
// - QR & Data Matrix Generator: code-generator.js
// ============================================

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        const commentPage = document.getElementById('page-sql-comment');
        const csPage = document.getElementById('page-cs-column');
        const codePage = document.getElementById('page-code-generator');
        const bulkUpdatePage = document.getElementById('page-bulk-update');
        const sqlExportPage = document.getElementById('page-sql-export');
        if (commentPage && commentPage.style.display !== 'none') {
            e.preventDefault();
            generateTableComments();
        } else if (csPage && csPage.style.display !== 'none') {
            e.preventDefault();
            csAlignColumns();
        } else if (codePage && codePage.style.display !== 'none') {
            e.preventDefault();
            generateCodes();
        } else if (bulkUpdatePage && bulkUpdatePage.style.display !== 'none') {
            e.preventDefault();
            generateBulkUpdate();
        } else if (sqlExportPage && sqlExportPage.style.display !== 'none') {
            e.preventDefault();
            exportSelectedSqlObjects();
        } else {
            e.preventDefault();
            convertData();
        }
    }
});

// ============================================
// MOBILE SIDEBAR TOGGLE
// ============================================

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

// Close sidebar when a nav item is clicked on mobile
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
});

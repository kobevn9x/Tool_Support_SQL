// Load history from localStorage with validation
let history = [];
try {
    const stored = localStorage.getItem('sqlFormatterHistory');
    if (stored) {
        const parsed = JSON.parse(stored);
        // Validate it's an array
        if (Array.isArray(parsed)) {
            history = parsed;
        }
    }
} catch (error) {
    console.error('Failed to load history:', error);
    localStorage.removeItem('sqlFormatterHistory');
}

let currentChunks = [];
let currentChunkIndex = 0;
let isProcessing = false;

// Display history on load + init language
window.addEventListener('DOMContentLoaded', () => {
    initLanguageSelector();
    applyLanguage(currentLang);
    displayHistory();
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

    // Show loading state
    isProcessing = true;
    const convertBtn = document.querySelector('.btn-primary');
    const originalBtnText = convertBtn?.innerHTML;
    if (convertBtn) {
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<span class="spinner"></span> Processing...';
    }

    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(() => {
        try {
            processConversion(input, isFromHistory);
        } catch (error) {
            console.error('Conversion error:', error);
            showToast('Error: ' + error.message, 'error');
        } finally {
            // Reset loading state
            isProcessing = false;
            if (convertBtn) {
                convertBtn.disabled = false;
                convertBtn.innerHTML = originalBtnText || '<span data-i18n="btnConvert">🔄 Convert</span>';
            }
        }
    }, 50);
}

function processConversion(input, isFromHistory) {
    // Get options
    const removeEmpty = document.getElementById('removeEmpty')?.checked ?? true;
    const removeDuplicates = document.getElementById('removeDuplicates')?.checked ?? false;
    const addQuotes = document.getElementById('addQuotes')?.checked ?? true;
    const uppercase = document.getElementById('uppercase')?.checked ?? false;
    const lowercase = document.getElementById('lowercase')?.checked ?? false;
    const separator = document.getElementById('separator')?.value ?? ',';
    const outputFormat = document.getElementById('outputFormat')?.value ?? 'inclause';
    const inKeywordCase = document.getElementById('inKeywordCase')?.value ?? 'upper';

    // Process lines
    let lines = input.split('\n');
    
    // Trim whitespace
    lines = lines.map(line => line.trim());
    
    // Remove empty lines
    if (removeEmpty) {
        lines = lines.filter(line => line.length > 0);
    }
    
    // Remove duplicates
    if (removeDuplicates) {
        lines = [...new Set(lines)];
    }
    
    // Apply case conversion
    if (uppercase) {
        lines = lines.map(line => line.toUpperCase());
    } else if (lowercase) {
        lines = lines.map(line => line.toLowerCase());
    }
    
    // Add quotes if needed
    if (addQuotes) {
        lines = lines.map(line => `'${line.replace(/'/g, "''")}'`);
    }
    
    // Check if we need to chunk the data (fixed off-by-one)
    const chunkSize = 1000;
    const shouldChunk = lines.length >= chunkSize;

    // Helper function to format lines based on output format
    const formatLines = (lineArray) => {
        if (outputFormat === 'inclause') {
            // IN Clause format: IN ('val1', 'val2', 'val3')
            const inKeyword = inKeywordCase === 'upper' ? 'IN' : 'in';
            return `${inKeyword} (${lineArray.join(', ')})`;
        } else {
            // DataByRow format: each value on separate line with separator
            return lineArray.join(`${separator}\n`);
        }
    };

    if (shouldChunk) {
        // Split into chunks
        currentChunks = [];
        for (let i = 0; i < lines.length; i += chunkSize) {
            const chunk = lines.slice(i, i + chunkSize);
            currentChunks.push(formatLines(chunk));
        }
        
        // Show chunked mode
        document.getElementById('singleOutputMode').style.display = 'none';
        document.getElementById('chunkedOutputMode').style.display = 'block';
        document.getElementById('chunkCountStat').style.display = 'block';
        
        // Create tabs
        createChunkTabs();
        
        // Show first chunk
        showChunk(0);
        
        // Update stats
        document.getElementById('lineCount').textContent = lines.length;
        document.getElementById('charCount').textContent = currentChunks.join('\n').length;
        document.getElementById('chunkCount').textContent = currentChunks.length;
        
        if (!isFromHistory) showToast(t('toastChunked')(currentChunks.length), 'success');
    } else {
        // Single output mode
        const result = formatLines(lines);
        
        document.getElementById('singleOutputMode').style.display = 'block';
        document.getElementById('chunkedOutputMode').style.display = 'none';
        document.getElementById('chunkCountStat').style.display = 'none';
        
        document.getElementById('outputText').value = result;
        
        // Update stats
        document.getElementById('lineCount').textContent = lines.length;
        document.getElementById('charCount').textContent = result.length;
        
        if (!isFromHistory) showToast(t('toastConvertSuccess'), 'success');
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
            inKeywordCase: document.getElementById('inKeywordCase')?.value ?? 'upper'
        }
    };
    
    history.unshift(historyItem);
    
    // Keep only last 20 items
    if (history.length > 20) {
        history = history.slice(0, 20);
    }
    
    localStorage.setItem('sqlFormatterHistory', JSON.stringify(history));
    displayHistory();
}

// Optimized history rendering
function displayHistory() {
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
        historyList.innerHTML = `<p style="text-align: center; color: #9ca3af; padding: 40px;">${t('historyEmpty')}</p>`;
        return;
    }
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    history.forEach(item => {
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
        loadBtn.className = 'btn-secondary';
        loadBtn.textContent = t('btnLoad');
        loadBtn.onclick = () => loadHistory(item.id);
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-success';
        copyBtn.textContent = t('btnCopy');
        copyBtn.onclick = () => copyHistoryItem(item.id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger';
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
    const item = history.find(h => h.id === id);
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
        
        // Handle proper output rendering logic including chunked mode splitting
        convertData(true);
        
        showToast(t('toastHistoryLoaded'), 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

async function copyHistoryItem(id) {
    const item = history.find(h => h.id === id);
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

function deleteHistoryItem(id) {
    if (confirm(t('confirmDeleteItem'))) {
        history = history.filter(h => h.id !== id);
        localStorage.setItem('sqlFormatterHistory', JSON.stringify(history));
        displayHistory();
        showToast(t('toastHistoryItemDeleted'), 'success');
    }
}

function clearHistory() {
    if (confirm(t('confirmClearHistory'))) {
        history = [];
        localStorage.setItem('sqlFormatterHistory', JSON.stringify(history));
        displayHistory();
        showToast(t('toastHistoryCleared'), 'success');
    }
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        convertData();
    }
});

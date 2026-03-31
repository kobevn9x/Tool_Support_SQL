// Load history from localStorage
let history = JSON.parse(localStorage.getItem('sqlFormatterHistory'))||[];
let currentChunks = [];
let currentChunkIndex = 0;

// Display history on load + init language
window.addEventListener('DOMContentLoaded', () => {
    initLanguageSelector();
    applyLanguage(currentLang);
    displayHistory();
});

function convertData(isFromHistory = false) {
    const input = document.getElementById('inputText').value;
    
    if (!input.trim()) {
        if (!isFromHistory) showToast(t('toastPleaseEnterData'), 'error');
        return;
    }

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
    
    // Check if we need to chunk the data
    const chunkSize = 999;
    const shouldChunk = lines.length > 1000;

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
    
    // Update textarea
    document.getElementById('chunkedOutputText').value = currentChunks[index];
    
    // Update active tab
    const tabs = document.querySelectorAll('.chunk-tab');
    tabs.forEach((tab, i) => {
        if (i === index) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

function copyCurrentChunk() {
    const textarea = document.getElementById('chunkedOutputText');
    
    if (!textarea.value) {
        showToast(t('toastNoDataCopy'), 'error');
        return;
    }
    
    textarea.select();
    document.execCommand('copy');
    showToast(t('toastCopiedBlock')(currentChunkIndex + 1), 'success');
}

function copyAllChunks() {
    if (currentChunks.length === 0) {
        showToast(t('toastNoDataCopy'), 'error');
        return;
    }
    
    const allData = currentChunks.join('\n\n');
    const textarea = document.createElement('textarea');
    textarea.value = allData;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    showToast(t('toastCopiedAllBlocks')(currentChunks.length), 'success');
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

function copyToClipboard() {
    const output = document.getElementById('outputText');
    
    if (!output.value) {
        showToast(t('toastNoDataCopy'), 'error');
        return;
    }
    
    output.select();
    document.execCommand('copy');
    showToast(t('toastCopied'), 'success');
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

function displayHistory() {
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
        historyList.innerHTML = `<p style="text-align: center; color: #9ca3af; padding: 40px;">${t('historyEmpty')}</p>`;
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-header">
                <span class="history-time">🕐 ${item.timestamp}</span>
                <div class="history-actions">
                    <button class="btn-secondary" onclick="loadHistory(${item.id})">${t('btnLoad')}</button>
                    <button class="btn-success" onclick="copyHistoryItem(${item.id})">${t('btnCopy')}</button>
                    <button class="btn-danger" onclick="deleteHistoryItem(${item.id})">❌</button>
                </div>
            </div>
            <div class="history-content">${item.output}${item.output.length >= 200 ? '...' : ''}</div>
        </div>
    `).join('');
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

function copyHistoryItem(id) {
    const item = history.find(h => h.id === id);
    if (item) {
        const textarea = document.createElement('textarea');
        textarea.value = item.fullOutput;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(t('toastHistoryCopied'), 'success');
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

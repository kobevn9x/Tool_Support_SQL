// Load history from localStorage
let history = JSON.parse(localStorage.getItem('sqlFormatterHistory'))||[];
let currentChunks = [];
let currentChunkIndex = 0;

// Display history on load
window.addEventListener('DOMContentLoaded', () => {
    displayHistory();
});

function convertData() {
    const input = document.getElementById('inputText').value;
    
    if (!input.trim()) {
        showToast('Vui lòng nhập dữ liệu', 'error');
        return;
    }

    // Get options
    const removeEmpty = document.getElementById('removeEmpty').checked;
    const removeDuplicates = document.getElementById('removeDuplicates').checked;
    const addQuotes = document.getElementById('addQuotes').checked;
    const uppercase = document.getElementById('uppercase').checked;
    const lowercase = document.getElementById('lowercase').checked;
    const separator = document.getElementById('separator').value || ',';
    const outputFormat = document.getElementById('outputFormat').value;
    const inKeywordCase = document.getElementById('inKeywordCase').value;

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
        
        showToast(`Đã tách thành ${currentChunks.length} blocks (mỗi block 999 dòng)`, 'success');
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
        
        showToast('Chuyển đổi thành công!', 'success');
    }
    
    // Save to history (save first chunk or full result)
    const outputToSave = shouldChunk ? currentChunks[0] : document.getElementById('outputText').value;
    saveToHistory(input, outputToSave);
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
        showToast('Không có dữ liệu để copy', 'error');
        return;
    }
    
    textarea.select();
    document.execCommand('copy');
    showToast(`Đã copy Block ${currentChunkIndex + 1}!`, 'success');
}

function copyAllChunks() {
    if (currentChunks.length === 0) {
        showToast('Không có dữ liệu để copy', 'error');
        return;
    }
    
    const allData = currentChunks.join('\n\n');
    const textarea = document.createElement('textarea');
    textarea.value = allData;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    showToast(`Đã copy tất cả ${currentChunks.length} blocks!`, 'success');
}

function clearInput() {
    document.getElementById('inputText').value = '';
    document.getElementById('outputText').value = '';
    showToast('Đã xóa dữ liệu!', 'success');

}

function copyToClipboard() {
    const output = document.getElementById('outputText');
    
    if (!output.value) {
        showToast('Không có dữ liệu để copy', 'error');
        return;
    }
    
    output.select();
    document.execCommand('copy');
    showToast('Đã copy vào clipboard!', 'success');
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
        showToast('Không có dữ liệu để tải', 'error');
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
    
    showToast('Đã tải xuống!', 'success');
}

function saveToHistory(input, output) {
    const historyItem = {
        id: Date.now(),
        input: input.substring(0, 200), // Limit to 200 chars for display
        output: output.substring(0, 200),
        fullOutput: output,
        timestamp: new Date().toLocaleString('vi-VN'),
        options: {
            removeEmpty: document.getElementById('removeEmpty').checked,
            removeDuplicates: document.getElementById('removeDuplicates').checked,
            addQuotes: document.getElementById('addQuotes').checked,
            uppercase: document.getElementById('uppercase').checked,
            lowercase: document.getElementById('lowercase').checked,
            separator: document.getElementById('separator').value,
            outputFormat: document.getElementById('outputFormat').value,
            inKeywordCase: document.getElementById('inKeywordCase').value
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
        historyList.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px;">Chưa có lịch sử nào</p>';
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-header">
                <span class="history-time">🕐 ${item.timestamp}</span>
                <div class="history-actions">
                    <button class="btn-secondary" onclick="loadHistory(${item.id})">📥 Tải</button>
                    <button class="btn-success" onclick="copyHistoryItem(${item.id})">📋 Copy</button>
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
        document.getElementById('inputText').value = item.input;
        
        // Reset to single mode first
        document.getElementById('singleOutputMode').style.display = 'block';
        document.getElementById('chunkedOutputMode').style.display = 'none';
        document.getElementById('chunkCountStat').style.display = 'none';
        
        document.getElementById('outputText').value = item.fullOutput;
        
        // Restore options
        document.getElementById('removeEmpty').checked = item.options.removeEmpty;
        document.getElementById('removeDuplicates').checked = item.options.removeDuplicates;
        document.getElementById('addQuotes').checked = item.options.addQuotes;
        document.getElementById('uppercase').checked = item.options.uppercase;
        document.getElementById('lowercase').checked = item.options.lowercase;
        document.getElementById('separator').value = item.options.separator;
        if (item.options.outputFormat) document.getElementById('outputFormat').value = item.options.outputFormat;
        if (item.options.inKeywordCase) document.getElementById('inKeywordCase').value = item.options.inKeywordCase;
        
        // Update stats
        const lines = item.fullOutput.split('\n').filter(l => l.trim()).length;
        document.getElementById('lineCount').textContent = lines;
        document.getElementById('charCount').textContent = item.fullOutput.length;
        
        showToast('Đã tải lịch sử!', 'success');
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
        showToast('Đã copy lịch sử!', 'success');
    }
}

function deleteHistoryItem(id) {
    if (confirm('Bạn có chắc muốn xóa mục này?')) {
        history = history.filter(h => h.id !== id);
        localStorage.setItem('sqlFormatterHistory', JSON.stringify(history));
        displayHistory();
        showToast('Đã xóa mục lịch sử', 'success');
    }
}

function clearHistory() {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử?')) {
        history = [];
        localStorage.setItem('sqlFormatterHistory', JSON.stringify(history));
        displayHistory();
        showToast('Đã xóa toàn bộ lịch sử', 'success');
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

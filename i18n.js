/**
 * ============================================================
 *  i18n.js - Multi-language Manager for SQL Data Formatter
 * ============================================================
 *  How to add a new language:
 *  1. Add a new key (e.g. 'ja', 'ko', 'zh') in the `languages` object
 *  2. Copy all keys from 'en' and translate the values
 *  3. Add a new <option> in the language selector in HTML
 *     OR it will be auto-generated from the `meta.name` field
 * ============================================================
 */

const languages = {

    // ─── Vietnamese ──────────────────────────────────────────
    vi: {
        meta: { name: 'Tiếng Việt', flag: '🇻🇳' },

        // Header
        headerTitle: '⚡SQL Data Formatter - Kobe⚡',
        headerSubtitle: 'Công cụ định dạng dữ liệu SQL nhanh và hiệu quả',
        themeLight: 'Chuyển sang giao diện sáng',
        themeDark: 'Chuyển sang giao diện tối',

        // Input card
        inputTitle: '📝 Dữ liệu đầu vào',
        inputPlaceholder: 'Nhập dữ liệu của bạn vào đây (mỗi giá trị một dòng)...\n\n💡 Phím tắt: Ctrl + Enter để chuyển đổi nhanh',
        btnConvert: 'Chuyển đổi',
        btnClear: 'Xóa',

        // Output card
        outputTitle: '✨ Kết quả',
        outputPlaceholder: 'Kết quả sẽ hiển thị ở đây...',
        btnCopy: 'Copy',
        btnDownload: 'Tải xuống',
        btnCopyCurrentBlock: 'Copy Block hiện tại',
        btnCopyAllBlocks: 'Copy TẤT CẢ Blocks',

        // Stats
        statLines: 'Dòng',
        statChars: 'Ký tự',
        statBlocks: 'Blocks',

        // Options panel
        optionsTitle: '⚙️ Tùy chọn',
        optAutoTheme: 'Tự động chuyển giao diện (18h - 7h)',
        optRemoveEmpty: 'Xóa dòng trống',
        optRemoveDuplicates: 'Xóa giá trị trùng lặp',
        optAddQuotes: 'Thêm dấu ngoặc đơn',
        optUppercase: 'Chuyển HOA',
        optLowercase: 'Chuyển thường',
        optSeparator: 'Ký tự phân cách:',
        optSqlDialect: 'SQL Dialect:',
        optOutputFormat: 'Output Format:',
        optInKeywordCase: '"IN" Keyword Case:',
        optInCaseUpper: 'Uppercase',
        optInCaseLower: 'Lowercase',
        optItemsPerLine: 'Số phần tử trên 1 dòng:',
        optSqlTemplate: 'SQL Template (dùng <code>{values}</code> làm placeholder):',
        templatePlaceholder: "Ví dụ:\nSELECT * FROM users WHERE id IN ({values})\nINSERT INTO users (id, name) VALUES ({values})\nUPDATE users SET active = 1 WHERE id IN ({values})",

        // History panel
        historyTitle: '📚 Lịch sử chuyển đổi',
        btnClearAll: 'Xóa tất cả',
        historyEmpty: 'Chưa có lịch sử nào',
        btnLoad: 'Tải',

        // Toast messages
        toastPleaseEnterData: 'Vui lòng nhập dữ liệu',
        toastConvertSuccess: 'Chuyển đổi thành công!',
        toastAutoThemeEnabled: 'Đã bật tự động chuyển giao diện theo thời gian!',
        toastAutoThemeDisabled: 'Đã tắt tự động chuyển giao diện (đã chuyển sang thủ công)',
        toastChunked: (count) => `Đã tách thành ${count} blocks (mỗi block 999 dòng)`,
        toastCopiedBlock: (index) => `Đã copy Block ${index}!`,
        toastCopiedAllBlocks: (count) => `Đã copy tất cả ${count} blocks!`,
        toastNoDataCopy: 'Không có dữ liệu để copy',
        toastNoDataDownload: 'Không có dữ liệu để tải',
        toastCleared: 'Đã xóa dữ liệu!',
        toastCopied: 'Đã copy vào clipboard!',
        toastDownloaded: 'Đã tải xuống!',
        toastHistoryLoaded: 'Đã tải lịch sử!',
        toastHistoryCopied: 'Đã copy lịch sử!',
        toastHistoryItemDeleted: 'Đã xóa mục lịch sử',
        toastHistoryCleared: 'Đã xóa toàn bộ lịch sử',
        toastTemplateEmpty: 'Vui lòng nhập SQL template',
        toastTemplateNoPlaceholder: 'Template phải chứa {values}',

        // Confirm dialogs
        confirmTitle: 'Xác nhận',
        confirmCancel: 'Hủy',
        confirmOk: 'Đồng ý',
        confirmDeleteItem: 'Bạn có chắc muốn xóa mục này?',
        confirmClearHistory: 'Bạn có chắc muốn xóa toàn bộ lịch sử?',

        // C# Column Align
        navCsColumn: 'Căn cột C#',
        csInputTitle: '📝 Mã nguồn C#',
        csInputPlaceholder: 'Dán các câu lệnh gọi phương thức C# vào đây...\n\n_GridUtil.InitColumn(grid2, "PLANT_CD", "사업장", 140, 0, false, false, 2, GridColDataType_emu.VarChar, HAlign.Left, string.Empty, string.Empty);',
        csOutputTitle: '✨ Kết quả căn cột',
        csOptionsTitle: '⚙️ Tùy chọn căn cột',
        csOptAlignNumbersRight: 'Căn phải các số',
        csOptMinGroupSize: 'Số lệnh tối thiểu trong nhóm:',
        csOptMaxLineLength: 'Độ dài dòng tối đa (0 = tắt):',
        csHelpText: 'Căn cột các lệnh gọi liên tiếp tới cùng một phương thức theo từng tham số. Dùng độ rộng hiển thị East-Asian để cột tiếng Hàn/CJK thẳng hàng trong editor.',
        csBtnAlign: 'Căn cột',
        csToastEmpty: 'Vui lòng nhập mã nguồn C#',
        csToastNoGroup: 'Không tìm thấy nhóm lệnh gọi nào để căn cột',
        csToastSuccess: (groups, calls) => `Đã căn cột ${groups} nhóm (${calls} lệnh gọi)`,
        csToastCleared: 'Đã xóa!',
        csToastNoCopy: 'Không có kết quả để copy',
        csToastCopied: 'Đã copy vào clipboard!',
    },

    // ─── English ─────────────────────────────────────────────
    en: {
        meta: { name: 'English', flag: '🇺🇸' },

        // Header
        headerTitle: '⚡SQL Data Formatter - Kobe⚡',
        headerSubtitle: 'Fast and efficient SQL data formatting tool',
        themeLight: 'Switch to light mode',
        themeDark: 'Switch to dark mode',

        // Input card
        inputTitle: '📝 Input Data',
        inputPlaceholder: 'Enter your data here (one value per line)...\n\n💡 Keyboard Shortcut: Ctrl + Enter to convert quickly',
        btnConvert: 'Convert',
        btnClear: ' Clear',

        // Output card
        outputTitle: '✨ Result',
        outputPlaceholder: 'Results will be displayed here...',
        btnCopy: 'Copy',
        btnDownload: 'Download',
        btnCopyCurrentBlock: 'Copy Current Block',
        btnCopyAllBlocks: 'Copy ALL Blocks',

        // Stats
        statLines: 'Lines',
        statChars: 'Chars',
        statBlocks: 'Blocks',

        // Options panel
        optionsTitle: '⚙️ Options',
        optAutoTheme: 'Auto Theme (18:00 - 07:00)',
        optRemoveEmpty: 'Remove empty lines',
        optRemoveDuplicates: 'Remove duplicates',
        optAddQuotes: 'Add single quotes',
        optUppercase: 'UPPERCASE',
        optLowercase: 'lowercase',
        optSeparator: 'Separator:',
        optSqlDialect: 'SQL Dialect:',
        optOutputFormat: 'Output Format:',
        optInKeywordCase: '"IN" Keyword Case:',
        optInCaseUpper: 'Uppercase',
        optInCaseLower: 'Lowercase',
        optItemsPerLine: 'Items per line:',
        optSqlTemplate: 'SQL Template (use <code>{values}</code> as placeholder):',
        templatePlaceholder: 'Examples:\nSELECT * FROM users WHERE id IN ({values})\nINSERT INTO users (id, name) VALUES ({values})\nUPDATE users SET active = 1 WHERE id IN ({values})',

        // History panel
        historyTitle: '📚 Conversion History',
        btnClearAll: ' Clear All',
        historyEmpty: 'No history yet',
        btnLoad: 'Load',

        // Toast messages
        toastPleaseEnterData: 'Please enter data',
        toastConvertSuccess: 'Conversion successful!',
        toastAutoThemeEnabled: 'Auto theme schedule enabled!',
        toastAutoThemeDisabled: 'Auto theme schedule disabled (switched to manual)',
        toastChunked: (count) => `Split into ${count} blocks (999 lines each)`,
        toastCopiedBlock: (index) => `Copied Block ${index}!`,
        toastCopiedAllBlocks: (count) => `Copied all ${count} blocks!`,
        toastNoDataCopy: 'No data to copy',
        toastNoDataDownload: 'No data to download',
        toastCleared: 'Data cleared!',
        toastCopied: 'Copied to clipboard!',
        toastDownloaded: 'Downloaded!',
        toastHistoryLoaded: 'History loaded!',
        toastHistoryCopied: 'History copied!',
        toastHistoryItemDeleted: 'History item deleted',
        toastHistoryCleared: 'All history cleared',
        toastTemplateEmpty: 'Please enter a SQL template',
        toastTemplateNoPlaceholder: 'Template must contain {values}',

        // Confirm dialogs
        confirmTitle: 'Confirmation',
        confirmCancel: 'Cancel',
        confirmOk: 'Confirm',
        confirmDeleteItem: 'Are you sure you want to delete this item?',
        confirmClearHistory: 'Are you sure you want to clear all history?',

        // C# Column Align
        navCsColumn: 'C# Column Align',
        csInputTitle: '📝 C# Source Input',
        csInputPlaceholder: 'Paste C# method call statements here...\n\n_GridUtil.InitColumn(grid2, "PLANT_CD", "사업장", 140, 0, false, false, 2, GridColDataType_emu.VarChar, HAlign.Left, string.Empty, string.Empty);',
        csOutputTitle: '✨ Column-Aligned Result',
        csOptionsTitle: '⚙️ Alignment Options',
        csOptAlignNumbersRight: 'Right-align numeric literals',
        csOptMinGroupSize: 'Minimum group size:',
        csOptMaxLineLength: 'Max line length (0 = off):',
        csHelpText: 'Aligns consecutive calls to the same method by argument column, using East-Asian display width so Korean/CJK columns line up in the editor.',
        csBtnAlign: 'Align Columns',
        csToastEmpty: 'Please enter C# source code',
        csToastNoGroup: 'No alignable method-call groups found',
        csToastSuccess: (groups, calls) => `Aligned ${groups} group(s) (${calls} calls)`,
        csToastCleared: 'Cleared!',
        csToastNoCopy: 'No result to copy',
        csToastCopied: 'Copied to clipboard!',
    },
    // ─── Korean ──────────────────────────────────────────────
    ko: {
        meta: { name: '한국어', flag: '🇰🇷' },

        // Header
        headerTitle: '⚡SQL Data Formatter - Kobe⚡',
        headerSubtitle: '빠르고 효율적인 SQL 데이터 포맷 도구',
        themeLight: '라이트 모드로 전환',
        themeDark: '다크 모드로 전환',

        // Input card
        inputTitle: '📝 입력 데이터',
        inputPlaceholder: '여기에 데이터를 입력하세요 (줄당 하나의 값)...',
        btnConvert: '변환',
        btnClear: ' 지우기',

        // Output card
        outputTitle: '✨ 결과',
        outputPlaceholder: '결과가 여기에 표시됩니다...',
        btnCopy: '복사',
        btnDownload: '다운로드',
        btnCopyCurrentBlock: '현재 블록 복사',
        btnCopyAllBlocks: '모든 블록 복사',

        // Stats
        statLines: '줄',
        statChars: '문자',
        statBlocks: '블록',

        // Options panel
        optionsTitle: '⚙️ 옵션',
        optAutoTheme: '자동 테마 전환 (18:00 - 07:00)',
        optRemoveEmpty: '빈 줄 제거',
        optRemoveDuplicates: '중복 제거',
        optAddQuotes: '따옴표 추가',
        optUppercase: '대문자',
        optLowercase: '소문자',
        optSeparator: '구분자:',
        optSqlDialect: 'SQL 방언:',
        optOutputFormat: '출력 형식:',
        optInKeywordCase: '"IN" 키워드:',
        optInCaseUpper: '대문자',
        optInCaseLower: '소문자',
        optItemsPerLine: '한 줄당 항목 수:',
        optSqlTemplate: 'SQL 템플릿 (<code>{values}</code>를 placeholder로 사용):',
        templatePlaceholder: '예시:\nSELECT * FROM users WHERE id IN ({values})\nINSERT INTO users (id, name) VALUES ({values})\nUPDATE users SET active = 1 WHERE id IN ({values})',

        // History panel
        historyTitle: '📚 변환 기록',
        btnClearAll: ' 전체 삭제',
        historyEmpty: '기록이 없습니다',
        btnLoad: '불러오기',

        // Toast messages
        toastPleaseEnterData: '데이터를 입력해주세요',
        toastConvertSuccess: '변환 성공!',
        toastAutoThemeEnabled: '자동 테마 전환이 활성화되었습니다!',
        toastAutoThemeDisabled: '자동 테마 전환이 비활성화되었습니다 (수동으로 전환됨)',
        toastChunked: (count) => `${count}개의 블록으로 분할됨 (각 999줄)`,
        toastCopiedBlock: (index) => `블록 ${index} 복사됨!`,
        toastCopiedAllBlocks: (count) => `모든 ${count}개 블록 복사됨!`,
        toastNoDataCopy: '복사할 데이터가 없습니다',
        toastNoDataDownload: '다운로드할 데이터가 없습니다',
        toastCleared: '데이터가 삭제되었습니다!',
        toastCopied: '클립보드에 복사되었습니다!',
        toastDownloaded: '다운로드 완료!',
        toastHistoryLoaded: '기록이 로드되었습니다!',
        toastHistoryCopied: '기록이 복사되었습니다!',
        toastHistoryItemDeleted: '기록 항목 삭제됨',
        toastHistoryCleared: '모든 기록이 삭제되었습니다',
        toastTemplateEmpty: 'SQL 템플릿을 입력해주세요',
        toastTemplateNoPlaceholder: '템플릿에 {values}가 포함되어야 합니다',

        // Confirm dialogs
        confirmTitle: '확인',
        confirmCancel: '취소',
        confirmOk: '확인',
        confirmDeleteItem: '이 항목을 삭제하시겠습니까?',
        confirmClearHistory: '모든 기록을 삭제하시겠습니까?',

        // C# Column Align
        navCsColumn: 'C# 열 정렬',
        csInputTitle: '📝 C# 소스 입력',
        csInputPlaceholder: '여기에 C# 메서드 호출문을 붙여넣으세요...\n\n_GridUtil.InitColumn(grid2, "PLANT_CD", "사업장", 140, 0, false, false, 2, GridColDataType_emu.VarChar, HAlign.Left, string.Empty, string.Empty);',
        csOutputTitle: '✨ 열 정렬 결과',
        csOptionsTitle: '⚙️ 정렬 옵션',
        csOptAlignNumbersRight: '숫자 오른쪽 정렬',
        csOptMinGroupSize: '최소 그룹 크기:',
        csOptMaxLineLength: '최대 줄 길이 (0 = 끄기):',
        csHelpText: '동일 메서드의 연속 호출을 인자 열로 정렬합니다. 한국어/CJK는 동아시아 표시 너비(2칸)를 사용하여 편집기에서 열이 맞춰집니다.',
        csBtnAlign: '열 정렬',
        csToastEmpty: 'C# 소스 코드를 입력해주세요',
        csToastNoGroup: '정렬할 메서드 호출 그룹이 없습니다',
        csToastSuccess: (groups, calls) => `${groups}개 그룹(${calls}개 호출) 정렬됨`,
        csToastCleared: '삭제되었습니다!',
        csToastNoCopy: '복사할 결과가 없습니다',
        csToastCopied: '클립보드에 복사되었습니다!',
    },
};

// ─── i18n Engine ──────────────────────────────────────────────

let currentLang = localStorage.getItem('appLanguage') || 'vi';

/**
 * Get translated text by key. If the value is a function (for
 * parameterized messages), return the function itself.
 */
function t(key) {
    const lang = languages[currentLang] || languages['vi'];
    return lang[key] ?? languages['vi'][key] ?? key;
}

/**
 * Apply all translations to the DOM.
 * Elements use `data-i18n` for text content,
 * `data-i18n-placeholder` for placeholders,
 * `data-i18n-title` for title attributes.
 */
function applyLanguage(lang) {
    if (!languages[lang]) return;

    currentLang = lang;
    localStorage.setItem('appLanguage', lang);
    document.documentElement.lang = lang;

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const value = t(key);
        if (typeof value === 'string') {
            el.textContent = value;
        }
    });

    // Update all elements with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const value = t(key);
        if (typeof value === 'string') {
            el.placeholder = value;
        }
    });

    // Update all elements with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const value = t(key);
        if (typeof value === 'string') {
            el.title = value;
        }
    });

    // Ensure the theme toggle button texts are translated correctly
    if (typeof applyTheme === 'function' && typeof currentTheme !== 'undefined') {
        applyTheme(currentTheme);
    }

    // Update the language selector display
    const selector = document.getElementById('langSelect');
    if (selector) selector.value = lang;

    // Re-render history to update its text
    if (typeof displayHistory === 'function') {
        displayHistory();
    }
}

/**
 * Build language selector options dynamically from the
 * `languages` object so adding a new language only requires
 * editing this file.
 */
function initLanguageSelector() {
    const selector = document.getElementById('langSelect');
    if (!selector) return;

    selector.innerHTML = '';
    for (const [code, lang] of Object.entries(languages)) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = `${lang.meta.flag} ${lang.meta.name}`;
        selector.appendChild(opt);
    }
    selector.value = currentLang;

    selector.addEventListener('change', (e) => {
        applyLanguage(e.target.value);
    });
}

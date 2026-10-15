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
        themeLightShort: 'Giao diện sáng',
        themeDarkShort: 'Giao diện tối',
        btnProcessing: 'Đang xử lý...',
        btnDelete: 'Xóa',
        sqlExportDeselectVisible: 'Bỏ chọn mục đang hiển thị',

        // Input card
        inputTitle: 'Dữ liệu đầu vào',
        inputPlaceholder: 'Nhập dữ liệu của bạn vào đây (mỗi giá trị một dòng)...\n\n💡 Phím tắt: Ctrl + Enter để chuyển đổi nhanh',
        btnConvert: 'Chuyển đổi',
        btnClear: 'Xóa',

        // Output card
        outputTitle: 'Kết quả',
        outputPlaceholder: 'Kết quả sẽ hiển thị ở đây...',
        btnCopy: 'Copy',
        btnDownload: 'Tải xuống',
        btnCopyCurrentBlock: 'Copy block này',
        btnCopyAllBlocks: 'Copy tất cả block',

        // Stats
        statsTitle: 'Thống kê',
        statLines: 'Dòng',
        statChars: 'Ký tự',
        statBlocks: 'Blocks',

        // Options panel
        optionsTitle: 'Tùy chọn',
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
        historyTitle: 'Lịch sử chuyển đổi',
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
        csInputTitle: 'Mã nguồn C#',
        csInputPlaceholder: 'Dán các câu lệnh gọi phương thức C# vào đây...\n\n_GridUtil.InitColumn(grid2, "PLANT_CD", "사업장", 140, 0, false, false, 2, GridColDataType_emu.VarChar, HAlign.Left, string.Empty, string.Empty);',
        csOutputTitle: 'Kết quả căn cột',
        csOptionsTitle: 'Tùy chọn căn cột',
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

        codeNavTitle: 'QR / Data Matrix',
        codeInputTitle: 'Danh sách mã đầu vào',
        codeInputPlaceholder: 'Nhập mỗi giá trị trên một dòng...',
        codeInputHelp: 'Mỗi dòng tạo thành một mã. Dấu phẩy, tab và các ký tự khác được giữ nguyên.',
        codeInputStats: (count) => `${count} giá trị`,
        codeOutputTitle: 'Mã đã tạo',
        codeOptionsTitle: 'Tùy chọn mã và bản in',
        codeTypeLabel: 'Loại mã:',
        codeTypeQr: 'QR Code',
        codeTypeDataMatrix: 'Data Matrix (DMC)',
        codeQrErrorLabel: 'Mức sửa lỗi QR:',
        codeColumnsLabel: 'Số cột:',
        codeRowsLabel: 'Số hàng:',
        codeSizeLabel: 'Kích thước mã (mm):',
        codeSpacingLabel: 'Khoảng cách (mm):',
        codeRemoveEmpty: 'Xóa dòng trống',
        codePrintHelp: 'Bản in dùng lưới đã cấu hình. Chọn kích thước thực trong hộp thoại in để giữ kích thước vật lý.',
        codeBtnGenerate: 'Tạo mã',
        codeBtnPrint: 'In',
        codeBtnClear: 'Xóa',
        codeEmptyState: 'Nhập giá trị rồi tạo mã.',
        codeEmptyInput: 'Vui lòng nhập ít nhất một giá trị',
        codeInvalidOptions: 'Tùy chọn lưới không hợp lệ',
        codeLibraryMissing: 'Không tải được thư viện tạo mã',
        codeGenerating: (count) => `Đang tạo ${count} mã...`,
        codeGenerated: (count) => `Đã tạo ${count} mã`,
        codeGeneratedWithErrors: (count, errors) => `Đã tạo ${count - errors} mã; ${errors} mã lỗi`,
        codeGenerationFailed: 'Không thể tạo mã',
        codeEncodingError: (index) => `Không thể mã hóa giá trị ${index}`,
        codeNotReadyToPrint: 'Hãy tạo mã hợp lệ trước khi in',
        codeStaleState: 'Dữ liệu hoặc tùy chọn đã thay đổi; hãy tạo lại mã',
        codeCleared: 'Đã xóa danh sách mã',
        codeLabelAria: (index) => `Nhãn mã ${index}`,
        codeSymbolAria: (type) => type === 'qrcode' ? 'QR Code' : 'Data Matrix',
        codePageAria: (index) => `Trang in ${index}`,
        bulkUpdateNav: 'Cập nhật hàng loạt SQL',
        bulkUpdateTemplateTitle: 'Mẫu UPDATE',
        bulkUpdateTemplateLabel: 'Mẫu UPDATE',
        bulkUpdateTemplateHelp: 'Dùng {1} cho khóa WHERE và {2}, {3}, ... cho các cột SET.',
        bulkUpdateTemplatePlaceholder: 'UPDATE PP0041\nSET PACKAGING_LOT = {2}\nWHERE LOT_NO = {1}',
        bulkUpdateSavedTitle: 'Mẫu đã lưu',
        bulkUpdateSavedNameLabel: 'Tên template',
        bulkUpdateSavedNamePlaceholder: 'Nhập tên template',
        bulkUpdateSavedCreate: 'Lưu mới',
        bulkUpdateSavedUpdate: 'Cập nhật',
        bulkUpdateSavedCancel: 'Hủy chỉnh sửa',
        bulkUpdateSavedEmpty: 'Chưa có template nào được lưu.',
        bulkUpdateSavedUse: 'Sử dụng',
        bulkUpdateSavedEdit: 'Chỉnh sửa',
        bulkUpdateSavedDelete: 'Xóa',
        bulkUpdateSavedEditing: (name) => `Đang chỉnh sửa: ${name}`,
        bulkUpdateSavedNameRequired: 'Vui lòng nhập tên template.',
        bulkUpdateSavedDuplicateName: (name) => `Tên template "${name}" đã tồn tại.`,
        bulkUpdateSavedCreated: 'Đã lưu template.',
        bulkUpdateSavedLoaded: 'Đã tải template.',
        bulkUpdateSavedUpdated: 'Đã cập nhật template.',
        bulkUpdateSavedDeleted: 'Đã xóa template.',
        bulkUpdateSavedDeleteConfirm: (name) => `Bạn có chắc muốn xóa template "${name}"?`,
        bulkUpdateSavedStorageReadError: 'Không thể đọc template đã lưu. Dữ liệu gốc không bị thay đổi.',
        bulkUpdateSavedStorageWriteError: 'Không thể lưu template vào bộ nhớ trình duyệt.',
        bulkUpdateDataTitle: 'Dữ liệu đầu vào',
        bulkUpdateDataLabel: 'Các dòng từ Excel',
        bulkUpdateRowsHelp: 'Dán khóa {1} trước, rồi đến các giá trị {2}, {3}, ... theo thứ tự placeholder. Tự động nhận diện tab, dấu phẩy, chấm phẩy hoặc dấu gạch đứng.',
        bulkUpdatePreviewCaption: 'Xem trước dữ liệu cập nhật hàng loạt',
        bulkUpdatePreviewEmpty: 'Nhập mẫu và dữ liệu hợp lệ để xem mapping.',
        bulkUpdatePreviewRows: (count) => `${count} dòng`,
        bulkUpdatePreviewTitle: 'Xem trước mapping',
        bulkUpdateSavedPick: 'Chọn mẫu đã lưu…',
        bulkUpdateSavedManage: 'Quản lý',
        bulkUpdateSavedClose: 'Đóng',
        bulkUpdateSavedTemplateLabel: 'Nội dung mẫu',
        bulkUpdateSavedFormHelp: 'Mặc định lấy nội dung đang có trong ô Mẫu UPDATE.',
        bulkUpdateOutputTitle: 'SQL được tạo',
        bulkUpdateTransactionLabel: 'Kết thúc transaction',
        bulkUpdateRollback: 'ROLLBACK (mặc định an toàn)',
        bulkUpdateCommit: 'COMMIT',
        bulkUpdateTransactionWarning: 'Mặc định là ROLLBACK. Chỉ chọn COMMIT khi bạn chắc chắn muốn lưu thay đổi.',
        bulkUpdateSqlLabel: 'Script SQL',
        bulkUpdateSqlPlaceholder: 'SQL được tạo sẽ hiển thị ở đây...',
        bulkUpdateSqlHelp: 'Script có thể chỉnh sửa. Format và copy đúng nội dung đang hiển thị.',
        bulkUpdateGenerate: 'Tạo SQL',
        bulkUpdateCopy: 'Copy SQL',
        bulkUpdateFormat: 'Format SQL',
        bulkUpdateStatusEmpty: 'Nhập mẫu UPDATE và các dòng dữ liệu.',
        bulkUpdateTemplateError: 'Mẫu không hợp lệ. Hãy dùng khóa WHERE là {1} và các placeholder SET liên tiếp {2}, {3}, ...',
        bulkUpdateDataError: 'Dữ liệu không hợp lệ.',
        bulkUpdateDelimiterError: (line) => `Không thể nhận diện dấu phân cách; dòng ${line} có số ô sai.`,
        bulkUpdateUnclosedFormat: 'Không thể format: chuỗi, comment hoặc identifier bracket chưa đóng.',
        bulkUpdateStale: 'Mẫu, dữ liệu hoặc mode đã thay đổi; hãy tạo lại SQL.',
        bulkUpdateInvalidOutput: 'Chưa có SQL hợp lệ để thao tác.',
        bulkUpdateCopyFailed: 'Copy thất bại: ',
        bulkUpdateGenerated: 'Đã tạo script SQL với ROLLBACK.',
        bulkUpdateFormatted: 'Đã format SQL.',
        bulkUpdateCopied: 'Đã copy SQL vào clipboard.',
        bulkUpdateRowStatus: (count, delimiter) => `${count} dòng hợp lệ · phân cách ${delimiter}`,
        sqlExportNav: 'Xuất SQL Server',
        sqlExportConnectionTitle: 'Kết nối',
        sqlExportTest: 'Kiểm tra kết nối',
        sqlExportServer: 'Server / instance',
        sqlExportServerPlaceholder: 'SERVER\\INSTANCE',
        sqlExportDatabase: 'Database',
        sqlExportDatabasePlaceholder: 'Tên database',
        sqlExportUsername: 'Tên đăng nhập SQL',
        sqlExportUsernamePlaceholder: 'SQL login',
        sqlExportPassword: 'Mật khẩu',
        sqlExportPasswordPlaceholder: 'Mật khẩu SQL',
        sqlExportTrustCertificate: 'Tin cậy chứng chỉ server',
        sqlExportSaveConnection: 'Lưu và kết nối',
        sqlExportChecking: 'Đang kiểm tra kết nối...',
        sqlExportStartingServer: 'Đang khởi động máy chủ SQL Export...',
        sqlExportServerStartFailed: 'Không thể khởi động máy chủ SQL Export.',
        sqlExportNotConfigured: 'Nhập thông tin SQL Authentication ở trên để kết nối.',
        sqlExportConnected: (server, database) => `Đã kết nối ${server} / ${database}`,
        sqlExportDisconnected: 'Không thể kết nối SQL Server.',
        sqlExportSetupSuccess: 'Đã lưu kết nối SQL Authentication đã mã hóa.',
        sqlExportSetupFailed: 'Không thể lưu hoặc kết nối bằng SQL Authentication.',
        sqlExportObjectsTitle: 'Đối tượng database',
        sqlExportSearchLabel: 'Tìm đối tượng database',
        sqlExportSearchPlaceholder: 'Tìm theo schema hoặc tên...',
        sqlExportRefresh: 'Làm mới',
        sqlExportSelectVisible: 'Chọn mục đang hiển thị',
        sqlExportOnlyProcedures: 'Chỉ procedure',
        sqlExportOnlyTables: 'Chỉ table',
        sqlExportClearSelection: 'Bỏ chọn',
        sqlExportProcedures: 'Stored procedures',
        sqlExportTables: 'Tables',
        sqlExportListMeta: (selected, total) => `${selected}/${total}`,
        sqlExportQueueTitle: 'Sẽ xuất',
        sqlExportQueueEmpty: 'Chưa chọn.',
        sqlExportQueueSummary: (procedures, tables) => `${procedures} SP · ${tables} table`,
        sqlExportRemoveSelected: 'Bỏ chọn',
        sqlExportEmpty: 'Không có đối tượng phù hợp.',
        sqlExportSelected: (count) => `Đã chọn ${count}`,
        sqlExportDownloadTitle: 'Xuất script',
        sqlExportDownloadHelp: 'Chọn một hoặc nhiều đối tượng. Trình duyệt được hỗ trợ có thể lưu từng script trực tiếp vào thư mục bạn chọn.',
        sqlExportDownload: 'Xuất mục đã chọn',
        sqlExportLoadFailed: 'Không thể tải danh sách đối tượng.',
        sqlExportTestSuccess: 'Kết nối SQL Server thành công.',
        sqlExportTestFailed: 'Kiểm tra kết nối thất bại.',
        sqlExportGenerating: (current, total) => `Đang tạo script ${current}/${total}...`,
        sqlExportSaved: (count) => `Đã lưu ${count} file SQL.`,
        sqlExportManualTitle: 'Trình duyệt không hỗ trợ chọn thư mục. Hãy tải từng file:',
        sqlExportFailed: 'Không thể xuất các script đã chọn.',
    },

    // ─── English ─────────────────────────────────────────────
    en: {
        meta: { name: 'English', flag: '🇺🇸' },

        // Header
        headerTitle: '⚡SQL Data Formatter - Kobe⚡',
        headerSubtitle: 'Fast and efficient SQL data formatting tool',
        themeLight: 'Switch to light mode',
        themeDark: 'Switch to dark mode',
        themeLightShort: 'Light mode',
        themeDarkShort: 'Dark mode',
        btnProcessing: 'Processing...',
        btnDelete: 'Delete',
        sqlExportDeselectVisible: 'Deselect visible',

        // Input card
        inputTitle: 'Input Data',
        inputPlaceholder: 'Enter your data here (one value per line)...\n\n💡 Keyboard Shortcut: Ctrl + Enter to convert quickly',
        btnConvert: 'Convert',
        btnClear: 'Clear',

        // Output card
        outputTitle: 'Result',
        outputPlaceholder: 'Results will be displayed here...',
        btnCopy: 'Copy',
        btnDownload: 'Download',
        btnCopyCurrentBlock: 'Copy block',
        btnCopyAllBlocks: 'Copy all blocks',

        // Stats
        statsTitle: 'Statistics',
        statLines: 'Lines',
        statChars: 'Chars',
        statBlocks: 'Blocks',

        // Options panel
        optionsTitle: 'Options',
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
        historyTitle: 'Conversion History',
        btnClearAll: 'Clear all',
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
        csInputTitle: 'C# Source Input',
        csInputPlaceholder: 'Paste C# method call statements here...\n\n_GridUtil.InitColumn(grid2, "PLANT_CD", "사업장", 140, 0, false, false, 2, GridColDataType_emu.VarChar, HAlign.Left, string.Empty, string.Empty);',
        csOutputTitle: 'Column-Aligned Result',
        csOptionsTitle: 'Alignment Options',
        csOptAlignNumbersRight: 'Right-align numeric literals',
        csOptMinGroupSize: 'Minimum group size:',
        csOptMaxLineLength: 'Max line length (0 = off):',
        csHelpText: 'Aligns consecutive calls to the same method by argument column, using East-Asian display width so Korean/CJK columns line up in the editor.',
        csBtnAlign: 'Align columns',
        csToastEmpty: 'Please enter C# source code',
        csToastNoGroup: 'No alignable method-call groups found',
        csToastSuccess: (groups, calls) => `Aligned ${groups} group(s) (${calls} calls)`,
        csToastCleared: 'Cleared!',
        csToastNoCopy: 'No result to copy',
        csToastCopied: 'Copied to clipboard!',

        codeNavTitle: 'QR / Data Matrix',
        codeInputTitle: 'Code List Input',
        codeInputPlaceholder: 'Enter one value per line...',
        codeInputHelp: 'Each line becomes one code. Commas, tabs, and other characters are preserved.',
        codeInputStats: (count) => `${count} value(s)`,
        codeOutputTitle: 'Generated Codes',
        codeOptionsTitle: 'Code & Print Options',
        codeTypeLabel: 'Code type:',
        codeTypeQr: 'QR Code',
        codeTypeDataMatrix: 'Data Matrix (DMC)',
        codeQrErrorLabel: 'QR error correction:',
        codeColumnsLabel: 'Columns:',
        codeRowsLabel: 'Rows:',
        codeSizeLabel: 'Code size (mm):',
        codeSpacingLabel: 'Spacing (mm):',
        codeRemoveEmpty: 'Remove empty lines',
        codePrintHelp: 'Print uses the configured grid. Choose actual size in the print dialog for physical dimensions.',
        codeBtnGenerate: 'Generate codes',
        codeBtnPrint: 'Print',
        codeBtnClear: 'Clear',
        codeEmptyState: 'Enter values and generate codes.',
        codeEmptyInput: 'Please enter at least one value',
        codeInvalidOptions: 'Grid options are invalid',
        codeLibraryMissing: 'The code generation library is unavailable',
        codeGenerating: (count) => `Generating ${count} code(s)...`,
        codeGenerated: (count) => `Generated ${count} code(s)`,
        codeGeneratedWithErrors: (count, errors) => `Generated ${count - errors} code(s); ${errors} failed`,
        codeGenerationFailed: 'Code generation failed',
        codeEncodingError: (index) => `Could not encode value ${index}`,
        codeNotReadyToPrint: 'Generate valid codes before printing',
        codeStaleState: 'Input or options changed; generate the codes again',
        codeCleared: 'Code list cleared',
        codeLabelAria: (index) => `Code label ${index}`,
        codeSymbolAria: (type) => type === 'qrcode' ? 'QR Code' : 'Data Matrix',
        codePageAria: (index) => `Print page ${index}`,
        bulkUpdateNav: 'SQL Bulk Update',
        bulkUpdateTemplateTitle: 'Update Template',
        bulkUpdateTemplateLabel: 'UPDATE template',
        bulkUpdateTemplateHelp: 'Use {1} for the WHERE key and {2}, {3}, ... for SET columns.',
        bulkUpdateTemplatePlaceholder: 'UPDATE PP0041\nSET PACKAGING_LOT = {2}\nWHERE LOT_NO = {1}',
        bulkUpdateSavedTitle: 'Saved Templates',
        bulkUpdateSavedNameLabel: 'Template name',
        bulkUpdateSavedNamePlaceholder: 'Enter a template name',
        bulkUpdateSavedCreate: 'Save as new',
        bulkUpdateSavedUpdate: 'Update',
        bulkUpdateSavedCancel: 'Cancel edit',
        bulkUpdateSavedEmpty: 'No saved templates yet.',
        bulkUpdateSavedUse: 'Use',
        bulkUpdateSavedEdit: 'Edit',
        bulkUpdateSavedDelete: 'Delete',
        bulkUpdateSavedEditing: (name) => `Editing: ${name}`,
        bulkUpdateSavedNameRequired: 'Enter a template name.',
        bulkUpdateSavedDuplicateName: (name) => `A template named "${name}" already exists.`,
        bulkUpdateSavedCreated: 'Template saved.',
        bulkUpdateSavedLoaded: 'Template loaded.',
        bulkUpdateSavedUpdated: 'Template updated.',
        bulkUpdateSavedDeleted: 'Template deleted.',
        bulkUpdateSavedDeleteConfirm: (name) => `Delete template "${name}"?`,
        bulkUpdateSavedStorageReadError: 'Saved templates could not be read. The original data was not changed.',
        bulkUpdateSavedStorageWriteError: 'The template could not be saved to browser storage.',
        bulkUpdateDataTitle: 'Data Input',
        bulkUpdateDataLabel: 'Rows from Excel',
        bulkUpdateRowsHelp: 'Paste key {1} first, then values {2}, {3}, ... in placeholder order. Tabs, commas, semicolons, or pipes are detected automatically.',
        bulkUpdateRowsPlaceholder: 'LOT001\tPACK001\nLOT002\tPACK002',
        bulkUpdatePreviewCaption: 'Bulk update data preview',
        bulkUpdatePreviewEmpty: 'Enter valid template and rows to preview the mapping.',
        bulkUpdatePreviewRows: (count) => `${count} row(s)`,
        bulkUpdatePreviewTitle: 'Mapping preview',
        bulkUpdateSavedPick: 'Choose a saved template…',
        bulkUpdateSavedManage: 'Manage',
        bulkUpdateSavedClose: 'Close',
        bulkUpdateSavedTemplateLabel: 'Template content',
        bulkUpdateSavedFormHelp: 'Prefilled with the current UPDATE template.',
        bulkUpdateOutputTitle: 'Generated SQL',
        bulkUpdateTransactionLabel: 'Transaction ending',
        bulkUpdateRollback: 'ROLLBACK (safe default)',
        bulkUpdateCommit: 'COMMIT',
        bulkUpdateTransactionWarning: 'The default is ROLLBACK. Choose COMMIT only when you intend to save changes.',
        bulkUpdateSqlLabel: 'SQL script',
        bulkUpdateSqlPlaceholder: 'Generated SQL will appear here...',
        bulkUpdateSqlHelp: 'The generated script is editable. Format and copy the text currently shown.',
        bulkUpdateGenerate: 'Generate SQL',
        bulkUpdateCopy: 'Copy SQL',
        bulkUpdateFormat: 'Format SQL',
        bulkUpdateStatusEmpty: 'Enter an UPDATE template and data rows.',
        bulkUpdateTemplateError: 'Invalid template. Use one WHERE key as {1} and consecutive SET placeholders {2}, {3}, ...',
        bulkUpdateDataError: 'Invalid data.',
        bulkUpdateDelimiterError: (line) => `Could not detect a delimiter; line ${line} has the wrong cell count.`,
        bulkUpdateUnclosedFormat: 'Cannot format: an unclosed string, comment, or bracketed identifier was found.',
        bulkUpdateStale: 'The template, data, or mode changed; generate SQL again.',
        bulkUpdateInvalidOutput: 'There is no valid SQL to process.',
        bulkUpdateCopyFailed: 'Copy failed: ',
        bulkUpdateGenerated: 'Generated SQL with ROLLBACK.',
        bulkUpdateFormatted: 'SQL formatted.',
        bulkUpdateCopied: 'SQL copied to clipboard.',
        bulkUpdateRowStatus: (count, delimiter) => `${count} valid row(s) · delimiter ${delimiter}`,
        sqlExportNav: 'SQL Server Export',
        sqlExportConnectionTitle: 'Connection',
        sqlExportTest: 'Test connection',
        sqlExportServer: 'Server / instance',
        sqlExportServerPlaceholder: 'SERVER\\INSTANCE',
        sqlExportDatabase: 'Database',
        sqlExportDatabasePlaceholder: 'Database name',
        sqlExportUsername: 'SQL user name',
        sqlExportUsernamePlaceholder: 'SQL login',
        sqlExportPassword: 'Password',
        sqlExportPasswordPlaceholder: 'SQL password',
        sqlExportTrustCertificate: 'Trust server certificate',
        sqlExportSaveConnection: 'Save and connect',
        sqlExportChecking: 'Checking connection...',
        sqlExportStartingServer: 'Starting the SQL Export server...',
        sqlExportServerStartFailed: 'Could not start the SQL Export server.',
        sqlExportNotConfigured: 'Enter the SQL Authentication settings above to connect.',
        sqlExportConnected: (server, database) => `Connected to ${server} / ${database}`,
        sqlExportDisconnected: 'Cannot connect to SQL Server.',
        sqlExportSetupSuccess: 'Encrypted SQL Authentication connection saved.',
        sqlExportSetupFailed: 'Could not save or connect with SQL Authentication.',
        sqlExportObjectsTitle: 'Database objects',
        sqlExportSearchLabel: 'Search database objects',
        sqlExportSearchPlaceholder: 'Search schema or name...',
        sqlExportRefresh: 'Refresh',
        sqlExportSelectVisible: 'Select visible',
        sqlExportOnlyProcedures: 'Procedures only',
        sqlExportOnlyTables: 'Tables only',
        sqlExportClearSelection: 'Clear selection',
        sqlExportProcedures: 'Stored procedures',
        sqlExportTables: 'Tables',
        sqlExportListMeta: (selected, total) => `${selected}/${total}`,
        sqlExportQueueTitle: 'Ready to export',
        sqlExportQueueEmpty: 'None selected.',
        sqlExportQueueSummary: (procedures, tables) => `${procedures} SP · ${tables} table`,
        sqlExportRemoveSelected: 'Remove',
        sqlExportEmpty: 'No matching objects.',
        sqlExportSelected: (count) => `${count} selected`,
        sqlExportDownloadTitle: 'Export scripts',
        sqlExportDownloadHelp: 'Choose one or more objects. Supported browsers can save each script directly to a selected folder.',
        sqlExportDownload: 'Export selected',
        sqlExportLoadFailed: 'Could not load database objects.',
        sqlExportTestSuccess: 'SQL Server connection succeeded.',
        sqlExportTestFailed: 'Connection test failed.',
        sqlExportGenerating: (current, total) => `Generating script ${current}/${total}...`,
        sqlExportSaved: (count) => `Saved ${count} SQL file(s).`,
        sqlExportManualTitle: 'Folder selection is unavailable. Download each file:',
        sqlExportFailed: 'Could not export the selected scripts.',
    },
    // ─── Korean ──────────────────────────────────────────────
    ko: {
        meta: { name: '한국어', flag: '🇰🇷' },

        // Header
        headerTitle: '⚡SQL Data Formatter - Kobe⚡',
        headerSubtitle: '빠르고 효율적인 SQL 데이터 포맷 도구',
        themeLight: '라이트 모드로 전환',
        themeDark: '다크 모드로 전환',
        themeLightShort: '라이트 모드',
        themeDarkShort: '다크 모드',
        btnProcessing: '처리 중...',
        btnDelete: '삭제',
        sqlExportDeselectVisible: '표시된 항목 해제',

        // Input card
        inputTitle: '입력 데이터',
        inputPlaceholder: '여기에 데이터를 입력하세요 (줄당 하나의 값)...',
        btnConvert: '변환',
        btnClear: '지우기',

        // Output card
        outputTitle: '결과',
        outputPlaceholder: '결과가 여기에 표시됩니다...',
        btnCopy: '복사',
        btnDownload: '다운로드',
        btnCopyCurrentBlock: '현재 블록 복사',
        btnCopyAllBlocks: '모든 블록 복사',

        // Stats
        statsTitle: '통계',
        statLines: '줄',
        statChars: '문자',
        statBlocks: '블록',

        // Options panel
        optionsTitle: '옵션',
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
        historyTitle: '변환 기록',
        btnClearAll: '전체 삭제',
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
        csInputTitle: 'C# 소스 입력',
        csInputPlaceholder: '여기에 C# 메서드 호출문을 붙여넣으세요...\n\n_GridUtil.InitColumn(grid2, "PLANT_CD", "사업장", 140, 0, false, false, 2, GridColDataType_emu.VarChar, HAlign.Left, string.Empty, string.Empty);',
        csOutputTitle: '열 정렬 결과',
        csOptionsTitle: '정렬 옵션',
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

        codeNavTitle: 'QR / Data Matrix',
        codeInputTitle: '코드 목록 입력',
        codeInputPlaceholder: '한 줄에 하나의 값을 입력하세요...',
        codeInputHelp: '각 줄이 하나의 코드가 됩니다. 쉼표, 탭 및 다른 문자는 그대로 유지됩니다.',
        codeInputStats: (count) => `${count}개 값`,
        codeOutputTitle: '생성된 코드',
        codeOptionsTitle: '코드 및 인쇄 옵션',
        codeTypeLabel: '코드 종류:',
        codeTypeQr: 'QR Code',
        codeTypeDataMatrix: 'Data Matrix (DMC)',
        codeQrErrorLabel: 'QR 오류 복원 수준:',
        codeColumnsLabel: '열:',
        codeRowsLabel: '행:',
        codeSizeLabel: '코드 크기 (mm):',
        codeSpacingLabel: '간격 (mm):',
        codeRemoveEmpty: '빈 줄 제거',
        codePrintHelp: '인쇄는 설정된 격자를 사용합니다. 실제 크기를 유지하려면 인쇄 대화상자에서 실제 크기를 선택하세요.',
        codeBtnGenerate: '코드 생성',
        codeBtnPrint: '인쇄',
        codeBtnClear: '지우기',
        codeEmptyState: '값을 입력하고 코드를 생성하세요.',
        codeEmptyInput: '하나 이상의 값을 입력하세요',
        codeInvalidOptions: '격자 옵션이 올바르지 않습니다',
        codeLibraryMissing: '코드 생성 라이브러리를 사용할 수 없습니다',
        codeGenerating: (count) => `${count}개 코드 생성 중...`,
        codeGenerated: (count) => `${count}개 코드가 생성되었습니다`,
        codeGeneratedWithErrors: (count, errors) => `${count - errors}개 생성됨; ${errors}개 실패`,
        codeGenerationFailed: '코드 생성에 실패했습니다',
        codeEncodingError: (index) => `${index}번째 값을 인코딩할 수 없습니다`,
        codeNotReadyToPrint: '인쇄하기 전에 유효한 코드를 생성하세요',
        codeStaleState: '입력 또는 옵션이 변경되었습니다. 코드를 다시 생성하세요',
        codeCleared: '코드 목록이 삭제되었습니다',
        codeLabelAria: (index) => `코드 라벨 ${index}`,
        codeSymbolAria: (type) => type === 'qrcode' ? 'QR Code' : 'Data Matrix',
        codePageAria: (index) => `인쇄 페이지 ${index}`,
        bulkUpdateNav: 'SQL 일괄 업데이트',
        bulkUpdateTemplateTitle: 'UPDATE 템플릿',
        bulkUpdateTemplateLabel: 'UPDATE 템플릿',
        bulkUpdateTemplateHelp: '{1}은 WHERE 키에, {2}, {3}, ...은 SET 열에 사용하세요.',
        bulkUpdateTemplatePlaceholder: 'UPDATE PP0041\nSET PACKAGING_LOT = {2}\nWHERE LOT_NO = {1}',
        bulkUpdateSavedTitle: '저장된 템플릿',
        bulkUpdateSavedNameLabel: '템플릿 이름',
        bulkUpdateSavedNamePlaceholder: '템플릿 이름 입력',
        bulkUpdateSavedCreate: '새로 저장',
        bulkUpdateSavedUpdate: '업데이트',
        bulkUpdateSavedCancel: '편집 취소',
        bulkUpdateSavedEmpty: '저장된 템플릿이 없습니다.',
        bulkUpdateSavedUse: '사용',
        bulkUpdateSavedEdit: '편집',
        bulkUpdateSavedDelete: '삭제',
        bulkUpdateSavedEditing: (name) => `편집 중: ${name}`,
        bulkUpdateSavedNameRequired: '템플릿 이름을 입력하세요.',
        bulkUpdateSavedDuplicateName: (name) => `템플릿 이름 "${name}"이(가) 이미 존재합니다.`,
        bulkUpdateSavedCreated: '템플릿을 저장했습니다.',
        bulkUpdateSavedLoaded: '템플릿을 불러왔습니다.',
        bulkUpdateSavedUpdated: '템플릿을 업데이트했습니다.',
        bulkUpdateSavedDeleted: '템플릿을 삭제했습니다.',
        bulkUpdateSavedDeleteConfirm: (name) => `템플릿 "${name}"을(를) 삭제하시겠습니까?`,
        bulkUpdateSavedStorageReadError: '저장된 템플릿을 읽을 수 없습니다. 원본 데이터는 변경되지 않았습니다.',
        bulkUpdateSavedStorageWriteError: '템플릿을 브라우저 저장소에 저장할 수 없습니다.',
        bulkUpdateDataTitle: '데이터 입력',
        bulkUpdateDataLabel: 'Excel 행',
        bulkUpdateRowsHelp: '키 {1}을 먼저 입력한 뒤 placeholder 순서대로 값 {2}, {3}, ...을 입력하세요. 탭, 쉼표, 세미콜론, 파이프를 자동 감지합니다.',
        bulkUpdateRowsPlaceholder: 'LOT001\tPACK001\nLOT002\tPACK002',
        bulkUpdatePreviewCaption: '일괄 업데이트 데이터 미리보기',
        bulkUpdatePreviewEmpty: '유효한 템플릿과 행을 입력하면 매핑을 미리 볼 수 있습니다.',
        bulkUpdatePreviewRows: (count) => `${count}개 행`,
        bulkUpdatePreviewTitle: '매핑 미리보기',
        bulkUpdateSavedPick: '저장된 템플릿 선택…',
        bulkUpdateSavedManage: '관리',
        bulkUpdateSavedClose: '닫기',
        bulkUpdateSavedTemplateLabel: '템플릿 내용',
        bulkUpdateSavedFormHelp: '현재 UPDATE 템플릿 내용으로 미리 채워집니다.',
        bulkUpdateOutputTitle: '생성된 SQL',
        bulkUpdateTransactionLabel: '트랜잭션 종료',
        bulkUpdateRollback: 'ROLLBACK (안전한 기본값)',
        bulkUpdateCommit: 'COMMIT',
        bulkUpdateTransactionWarning: '기본값은 ROLLBACK입니다. 변경사항을 저장할 때만 COMMIT을 선택하세요.',
        bulkUpdateSqlLabel: 'SQL 스크립트',
        bulkUpdateSqlPlaceholder: '생성된 SQL이 여기에 표시됩니다...',
        bulkUpdateSqlHelp: '생성된 스크립트는 편집할 수 있습니다. 현재 표시된 텍스트를 포맷하거나 복사합니다.',
        bulkUpdateGenerate: 'SQL 생성',
        bulkUpdateCopy: 'SQL 복사',
        bulkUpdateFormat: 'SQL 포맷',
        bulkUpdateTemplateError: '템플릿이 올바르지 않습니다. WHERE 키는 {1}, SET placeholder는 {2}, {3}, ...을 연속해서 사용하세요.',
        bulkUpdateStatusEmpty: 'UPDATE 템플릿과 데이터 행을 입력하세요.',
        bulkUpdateDataError: '데이터가 올바르지 않습니다.',
        bulkUpdateDelimiterError: (line) => `구분자를 감지할 수 없습니다. ${line}번째 행의 셀 수가 다릅니다.`,
        bulkUpdateUnclosedFormat: '포맷할 수 없습니다. 닫히지 않은 문자열, 주석 또는 대괄호 식별자가 있습니다.',
        bulkUpdateStale: '템플릿, 데이터 또는 모드가 변경되었습니다. SQL을 다시 생성하세요.',
        bulkUpdateInvalidOutput: '처리할 유효한 SQL이 없습니다.',
        bulkUpdateCopyFailed: '복사 실패: ',
        bulkUpdateGenerated: 'ROLLBACK SQL이 생성되었습니다.',
        bulkUpdateFormatted: 'SQL을 포맷했습니다.',
        bulkUpdateCopied: 'SQL을 클립보드에 복사했습니다.',
        bulkUpdateRowStatus: (count, delimiter) => `${count}개 행 · 구분자 ${delimiter}`,
        sqlExportNav: 'SQL Server 내보내기',
        sqlExportConnectionTitle: '연결',
        sqlExportTest: '연결 테스트',
        sqlExportServer: '서버 / 인스턴스',
        sqlExportServerPlaceholder: 'SERVER\\INSTANCE',
        sqlExportDatabase: '데이터베이스',
        sqlExportDatabasePlaceholder: '데이터베이스 이름',
        sqlExportUsername: 'SQL 사용자 이름',
        sqlExportUsernamePlaceholder: 'SQL 로그인',
        sqlExportPassword: '비밀번호',
        sqlExportPasswordPlaceholder: 'SQL 비밀번호',
        sqlExportTrustCertificate: '서버 인증서 신뢰',
        sqlExportSaveConnection: '저장 및 연결',
        sqlExportChecking: '연결 확인 중...',
        sqlExportStartingServer: 'SQL Export 서버를 시작하는 중...',
        sqlExportServerStartFailed: 'SQL Export 서버를 시작할 수 없습니다.',
        sqlExportNotConfigured: '위에 SQL Authentication 정보를 입력하여 연결하세요.',
        sqlExportConnected: (server, database) => `${server} / ${database}에 연결됨`,
        sqlExportDisconnected: 'SQL Server에 연결할 수 없습니다.',
        sqlExportSetupSuccess: '암호화된 SQL Authentication 연결을 저장했습니다.',
        sqlExportSetupFailed: 'SQL Authentication 연결을 저장하거나 연결할 수 없습니다.',
        sqlExportObjectsTitle: '데이터베이스 개체',
        sqlExportSearchLabel: '데이터베이스 개체 검색',
        sqlExportSearchPlaceholder: '스키마 또는 이름 검색...',
        sqlExportRefresh: '새로 고침',
        sqlExportSelectVisible: '표시된 항목 선택',
        sqlExportOnlyProcedures: '프로시저만',
        sqlExportOnlyTables: '테이블만',
        sqlExportClearSelection: '선택 해제',
        sqlExportProcedures: '저장 프로시저',
        sqlExportTables: '테이블',
        sqlExportListMeta: (selected, total) => `${selected}/${total}`,
        sqlExportQueueTitle: '내보내기 대기',
        sqlExportQueueEmpty: '선택 없음.',
        sqlExportQueueSummary: (procedures, tables) => `SP ${procedures} · 테이블 ${tables}`,
        sqlExportRemoveSelected: '선택 해제',
        sqlExportEmpty: '일치하는 개체가 없습니다.',
        sqlExportSelected: (count) => `${count}개 선택됨`,
        sqlExportDownloadTitle: '스크립트 내보내기',
        sqlExportDownloadHelp: '하나 이상의 개체를 선택하세요. 지원되는 브라우저에서는 각 스크립트를 선택한 폴더에 직접 저장할 수 있습니다.',
        sqlExportDownload: '선택 항목 내보내기',
        sqlExportLoadFailed: '데이터베이스 개체를 불러올 수 없습니다.',
        sqlExportTestSuccess: 'SQL Server 연결에 성공했습니다.',
        sqlExportTestFailed: '연결 테스트에 실패했습니다.',
        sqlExportGenerating: (current, total) => `스크립트 생성 중 ${current}/${total}...`,
        sqlExportSaved: (count) => `${count}개 SQL 파일을 저장했습니다.`,
        sqlExportManualTitle: '폴더 선택을 지원하지 않습니다. 각 파일을 다운로드하세요:',
        sqlExportFailed: '선택한 스크립트를 내보낼 수 없습니다.',
    },
};

// ─── i18n Engine ──────────────────────────────────────────────

let currentLang = localStorage.getItem('appLanguage') || 'en';

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

    if (typeof refreshBulkUpdateLanguage === 'function') {
        refreshBulkUpdateLanguage();
    }

    if (typeof refreshSqlExportLanguage === 'function') {
        refreshSqlExportLanguage();
    }

    if (typeof updateNavGlider === 'function') {
        requestAnimationFrame(() => updateNavGlider(-1, -1, true));
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

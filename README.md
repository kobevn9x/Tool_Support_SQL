# SQL Data Formatter - Kobe

A fast, efficient, and user-friendly web application designed to format raw input data into SQL-ready formats, minimizing manual work when building queries.

## ✨ Key Features

### 1. 🔄 Core Data Formatting
- **IN Clause Generator**: Automatically converts a vertical list of values into a SQL `IN` clause (e.g., `IN ('val1', 'val2')`).
- **DataByRow**: Keeps values on separate rows with customizable formatting.

### 2. 🎛️ Data Cleaning & Options
- **Remove empty lines**: Trims out any blank lines from the input.
- **Remove duplicates**: Automatically filters out duplicate values to keep output clean.
- **Wrap in quotes**: Surrounds each value with single quotes (`'value'`) and safely escapes existing quotes automatically (`''`).
- **Case Conversion**: Convert all text to **UPPERCASE** or **lowercase**.
- **Keyword Case Control**: Choose between `IN` and `in`.

### 3. 📦 Smart Chunking (For Large Datasets)
- **Auto-Splitting**: If your input exceeds 1000 lines, the tool automatically chunks the results into blocks of 999 items. This is extremely helpful to avoid SQL database limitations (like Oracle's 1000 item limit in an IN clause).
- **Tabbed Interface**: Easily navigate between different chunks.
- **Bulk Copy**: Copy a specific block or all blocks at once.

### 4. 📚 History Management
- Automatically saves your recent conversions to Local Storage (up to 20 items).
- Easily **Load**, **Copy**, or **Delete** previous states. Data and all selected options are completely restored when an item is loaded.

### 5. 💾 Export & Actions
- **One-click Copy**: Quick copy functionality for quick access.
- **Download as txt file**: Save the processed results directly to your local machine as a text file.

### 6. 🌐 User Experience Improvements
- **Live Statistics**: See exact counts for lines and total characters in real-time.
- **Keyboard Shortcuts**: Press `Ctrl + Enter` to instantly trigger the formatting process.
- **Multi-language Support**: Interface localization support to assist different users.

## 🚀 How to Use

This is a static web application — no build step and no runtime dependencies required. Just open `sql-formatter.html` in any modern browser (Chrome, Edge, Firefox, etc.) and start using it.

1. Paste your raw list of data into the **Input** text area.
2. Select your desired processing options (quotes, duplicates, case formatting, etc).
3. Click **Chuyển đổi** (Convert) or press `Ctrl + Enter`.
4. Copy the result directly to your clipboard or download it as a text file.

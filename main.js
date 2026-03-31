const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 850,
        minWidth: 900,
        minHeight: 600,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        // Cửa sổ đẹp hơn
        titleBarStyle: 'default',
        show: false, // Ẩn cho đến khi sẵn sàng
        backgroundColor: '#0f172a' // Màu nền tối matching style.css
    });

    // Load file HTML chính
    win.loadFile('sql-formatter.html');

    // Ẩn menu bar
    win.setMenuBarVisibility(false);

    // Hiện cửa sổ khi đã load xong (tránh flash trắng)
    win.once('ready-to-show', () => {
        win.show();
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

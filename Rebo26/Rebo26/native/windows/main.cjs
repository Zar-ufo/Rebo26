const { app, BrowserWindow, shell } = require('electron');

const appUrl = process.env.REBO_APP_URL || 'https://rebo-26.vercel.app/?native=1';
const appOrigin = new URL(appUrl).origin;

function openExternal(url) {
  shell.openExternal(url).catch((error) => {
    console.error('Could not open external link:', error);
  });
}

function createWindow() {
  const window = new BrowserWindow({
    title: 'Rebo',
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    autoHideMenuBar: true,
    backgroundColor: '#090b13',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (new URL(url).origin === appOrigin) return { action: 'allow' };
    openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== appOrigin) {
      event.preventDefault();
      openExternal(url);
    }
  });

  window.webContents.setUserAgent(`${window.webContents.getUserAgent()} ReboApp`);
  window.loadURL(appUrl);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { autoUpdater } from "electron-updater";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function sendToWindow(channel: string, ...args: unknown[]) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#090912",
    title: "AbysLord",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    void mainWindow.loadURL("http://localhost:5173");
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function setupUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    sendToWindow("update-available", info.version);
  });

  autoUpdater.on("update-not-available", () => {
    sendToWindow("update-not-available");
  });

  autoUpdater.on("update-downloaded", () => {
    sendToWindow("update-downloaded");
  });

  autoUpdater.on("error", (error) => {
    sendToWindow("update-error", error.message);
  });

  ipcMain.handle("check-for-updates", async () => {
    if (isDev) return { ok: false, message: "Disponível somente na versão instalada." };

    try {
      await autoUpdater.checkForUpdates();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: String(error) };
    }
  });

  ipcMain.handle("download-update", async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: String(error) };
    }
  });

  ipcMain.on("install-update", () => {
    autoUpdater.quitAndInstall();
  });
}

app.whenReady().then(() => {
  createWindow();

  if (!isDev) {
    setupUpdater();
    setTimeout(() => {
      void autoUpdater.checkForUpdates().catch(() => {});
    }, 5000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

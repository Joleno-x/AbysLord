
import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { execFile } from "node:child_process";
import { autoUpdater } from "electron-updater";

const isDev = !app.isPackaged;
const PROTOCOL = "abyslord";

let mainWindow: BrowserWindow | null = null;
let pendingAuthCallback: string | null = null;

let gameRunning = false;
let gameMonitor: ReturnType<typeof setInterval> | null = null;
let checkingGame = false;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);

  function sendToWindow(channel: string, ...args: unknown[]) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args);
    }
  }

  // Detecta o processo do AION 2 no Windows
  function checkAionProcess() {
    if (process.platform !== "win32" || checkingGame) return;

    checkingGame = true;

    execFile(
      "tasklist",
      ["/FI", "IMAGENAME eq AION2.EXE", "/FO", "CSV", "/NH"],
      { windowsHide: true },
      (error, stdout) => {
        checkingGame = false;

        const detected =
          !error && stdout.toUpperCase().includes('"AION2.EXE"');

        if (detected !== gameRunning) {
          gameRunning = detected;

          sendToWindow("game-status", {
            running: gameRunning
          });
        }
      }
    );
  }

  function startGameMonitor() {
    if (gameMonitor) return;

    checkAionProcess();

    gameMonitor = setInterval(() => {
      checkAionProcess();
    }, 3000);
  }

  function stopGameMonitor() {
    if (gameMonitor) {
      clearInterval(gameMonitor);
      gameMonitor = null;
    }
  }

  function handleAuthCallback(url: string) {
    try {
      const parsedUrl = new URL(url);

      if (
        parsedUrl.protocol !== `${PROTOCOL}:` ||
        parsedUrl.hostname !== "auth" ||
        parsedUrl.pathname !== "/callback"
      ) {
        return;
      }

      pendingAuthCallback = url;

      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.webContents.isLoading()) {
          mainWindow.webContents.once("did-finish-load", () => {
            if (pendingAuthCallback) {
              sendToWindow("auth-callback", pendingAuthCallback);
              pendingAuthCallback = null;
            }
          });
        } else {
          sendToWindow("auth-callback", url);
          pendingAuthCallback = null;
        }

        mainWindow.show();
        mainWindow.focus();
      }
    } catch {
      // Ignora links inválidos
    }
  }

  function checkStartupArguments(argv: string[]) {
    const authUrl = argv.find((arg) =>
      arg.startsWith(`${PROTOCOL}://`)
    );

    if (authUrl) {
      handleAuthCallback(authUrl);
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

    mainWindow.webContents.on("did-finish-load", () => {
      if (pendingAuthCallback) {
        sendToWindow("auth-callback", pendingAuthCallback);
        pendingAuthCallback = null;
      }

      sendToWindow("game-status", {
        running: gameRunning
      });
    });

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
      if (isDev) {
        return {
          ok: false,
          message: "Disponível somente na versão instalada."
        };
      }

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

  ipcMain.handle("open-external", async (_event, url: string) => {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.protocol !== "https:") {
        return { ok: false, message: "Endereço não permitido." };
      }

      await shell.openExternal(url);
      return { ok: true };
    } catch {
      return { ok: false, message: "Não foi possível abrir o endereço." };
    }
  });

  app.on("second-instance", (_event, argv) => {
    checkStartupArguments(argv);

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleAuthCallback(url);
  });

  app.whenReady().then(() => {
    checkStartupArguments(process.argv);

    createWindow();
    startGameMonitor();

    if (!isDev) {
      setupUpdater();

      setTimeout(() => {
        void autoUpdater.checkForUpdates().catch(() => {});
      }, 5000);
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("before-quit", () => {
    stopGameMonitor();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}


import { contextBridge, ipcRenderer } from "electron";

// Atualizações automáticas
contextBridge.exposeInMainWorld("abyslordUpdater", {
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),

  downloadUpdate: () => ipcRenderer.invoke("download-update"),

  installUpdate: () => ipcRenderer.send("install-update"),

  onUpdateAvailable: (callback: (version: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, version: string) =>
      callback(version);

    ipcRenderer.on("update-available", listener);

    return () => ipcRenderer.removeListener("update-available", listener);
  },

  onUpdateDownloaded: (callback: () => void) => {
    const listener = () => callback();

    ipcRenderer.on("update-downloaded", listener);

    return () => ipcRenderer.removeListener("update-downloaded", listener);
  },

  onUpdateNotAvailable: (callback: () => void) => {
    const listener = () => callback();

    ipcRenderer.on("update-not-available", listener);

    return () => ipcRenderer.removeListener("update-not-available", listener);
  },

  onUpdateError: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) =>
      callback(message);

    ipcRenderer.on("update-error", listener);

    return () => ipcRenderer.removeListener("update-error", listener);
  }
});

// Autenticação Discord
contextBridge.exposeInMainWorld("abyslordAuth", {
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),

  onAuthCallback: (callback: (url: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, url: string) =>
      callback(url);

    ipcRenderer.on("auth-callback", listener);

    return () => ipcRenderer.removeListener("auth-callback", listener);
  }
});

// Detecção do AION 2
contextBridge.exposeInMainWorld("abyslordGame", {
  onGameStatus: (
    callback: (status: { running: boolean }) => void
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      status: { running: boolean }
    ) => callback(status);

    ipcRenderer.on("game-status", listener);

    return () => ipcRenderer.removeListener("game-status", listener);
  }
});

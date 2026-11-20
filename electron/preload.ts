
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("abyslordUpdater", {
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  installUpdate: () => ipcRenderer.send("install-update"),

  onUpdateAvailable: (callback: (version: string) => void) => {
    ipcRenderer.on("update-available", (_event, version) => callback(version));
  },

  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on("update-downloaded", () => callback());
  },

  onUpdateNotAvailable: (callback: () => void) => {
    ipcRenderer.on("update-not-available", callback);
  },

  onUpdateError: (callback: (message: string) => void) => {
    ipcRenderer.on("update-error", (_event, message) => callback(message));
  }
});

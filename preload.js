const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  createParcelFolder: (data) =>
    ipcRenderer.invoke("create-parcel-folder", data),
  openFolder: (folderPath) => ipcRenderer.invoke("open-folder", folderPath),
  addFileToParcel: (data) => ipcRenderer.invoke("add-file-to-parcel", data),
  getParcelFiles: (folderPath) =>
    ipcRenderer.invoke("get-parcel-files", folderPath),
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),
  deleteParcelFolder: (folderPath) =>
    ipcRenderer.invoke("delete-parcel-folder", folderPath),
});

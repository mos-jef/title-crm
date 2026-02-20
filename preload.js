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
  readPdfBase64: (filePath) => ipcRenderer.invoke("read-pdf-base64", filePath),
  savePackagePdf: (data) => ipcRenderer.invoke("save-package-pdf", data),
  readFileBase64: (filePath) =>
    ipcRenderer.invoke("read-file-base64", filePath),
  scanFolderForPdfs: (folderPath) =>
    ipcRenderer.invoke("scan-folder-for-pdfs", folderPath),
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  claudeExtractTaxCard: (data) =>
    ipcRenderer.invoke("claude-extract-tax-card", data),
  copyFileToFolder: (data) => ipcRenderer.invoke("copy-file-to-folder", data),
  pickPdfFile: () => ipcRenderer.invoke("pick-pdf-file"),
});

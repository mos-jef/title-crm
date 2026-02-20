const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    title: "Title CRM",
  });

  const startUrl =
    process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, "build/index.html")}`;

  mainWindow.loadURL(startUrl);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Create folder using APN as folder name
ipcMain.handle("create-parcel-folder", async (event, { id, apn }) => {
  const folderName = apn ? apn.toString().replace(/[^a-zA-Z0-9\-_]/g, "_") : id;
  const basePath = path.join(
    app.getPath("documents"),
    "TitleCRM",
    "Parcels",
    folderName,
  );
  const subfolders = [
    "Maps",
    "Vesting Deed",
    "Easements",
    "Chain",
    "Taxes",
    "Miscellaneous",
  ];

  try {
    fs.mkdirSync(basePath, { recursive: true });
    subfolders.forEach((folder) => {
      fs.mkdirSync(path.join(basePath, folder), { recursive: true });
    });
    return { success: true, path: basePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Open folder in File Explorer
ipcMain.handle("open-folder", async (event, folderPath) => {
  shell.openPath(folderPath);
});

// Add file to parcel — supports both dialog picker and drag-and-drop
ipcMain.handle(
  "add-file-to-parcel",
  async (event, { folderPath, category, sourcePath }) => {
    if (!folderPath) {
      return { success: false, error: "No folder path provided" };
    }

    let filePaths = [];

    if (sourcePath) {
      filePaths = [sourcePath];
    } else {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openFile", "multiSelections"],
        title: `Add file to ${category}`,
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      filePaths = result.filePaths;
    }

    const destFolder = path.join(folderPath, category);

    // Make sure subfolder exists (handles Taxes for old parcels)
    try {
      fs.mkdirSync(destFolder, { recursive: true });
    } catch (err) {
      return {
        success: false,
        error: "Could not create destination folder: " + err.message,
      };
    }

    const copied = [];
    for (const fp of filePaths) {
      if (!fp || typeof fp !== "string") continue;
      const fileName = path.basename(fp);
      const destPath = path.join(destFolder, fileName);
      try {
        fs.copyFileSync(fp, destPath);
        copied.push({ name: fileName, path: destPath });
      } catch (err) {
        console.error("Copy error:", err.message);
      }
    }

    return { success: true, files: copied };
  },
);

// Get all files for a parcel by folderPath
ipcMain.handle("get-parcel-files", async (event, folderPath) => {
  const subfolders = [
    "Maps",
    "Vesting Deed",
    "Easements",
    "Chain",
    "Taxes",
    "Miscellaneous",
  ];
  const result = {};

  subfolders.forEach((folder) => {
    const p = path.join(folderPath, folder);
    try {
      fs.mkdirSync(p, { recursive: true }); // create if missing
      result[folder] = fs
        .readdirSync(p)
        .filter((f) => !f.startsWith("."))
        .map((file) => ({ name: file, path: path.join(p, file) }));
    } catch {
      result[folder] = [];
    }
  });

  return result;
});

// Delete parcel folder
ipcMain.handle('delete-parcel-folder', async (event, folderPath) => {
  try {
    if (folderPath && fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Open file with default system app
ipcMain.handle("open-file", async (event, filePath) => {
  shell.openPath(filePath);
});

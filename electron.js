require("dotenv").config();
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
ipcMain.handle("delete-parcel-folder", async (event, folderPath) => {
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

// Read PDF as base64 for Claude API
ipcMain.handle("read-pdf-base64", async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return { success: true, base64: data.toString("base64") };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Save package PDF to parcel folder
ipcMain.handle(
  "save-package-pdf",
  async (event, { folderPath, apn, pdfBytes }) => {
    try {
      const fileName = `${apn}_Package.pdf`;
      const destPath = path.join(folderPath, fileName);
      const buffer = Buffer.from(pdfBytes);
      fs.writeFileSync(destPath, buffer);
      return { success: true, path: destPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
);

// Read file as base64 (for PDF merge)
ipcMain.handle("read-file-base64", async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return { success: true, base64: data.toString("base64"), ext };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Call Claude API for tax card extraction
ipcMain.handle("claude-extract-tax-card", async (event, { base64 }) => {
  try {
    const apiKey =
      process.env.REACT_APP_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY || "";
    if (!apiKey) return { success: false, error: "No API key found in .env" };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: `Extract the following fields from this county tax card or assessor document.
Return ONLY a valid JSON object with exactly these keys. Use empty string if not found.

{
  "apn": "parcel number digits only, no dashes or spaces",
  "apnRaw": "parcel number exactly as printed on the document",
  "assessedOwner": "owner name as listed",
  "legalOwner": "same as assessedOwner if only one owner",
  "county": "county name only, no state",
  "state": "two-letter state abbreviation e.g. OH",
  "acres": "total acreage as plain number e.g. 6.924",
  "briefLegal": "short legal description or section/township/range line",
  "legalDescription": "full legal description if available",
  "mapParcelNo": "map number or alternate ID if present",
  "address": "property location address if listed"
}

Return ONLY the JSON object. No explanation, no markdown.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: `API error ${response.status}: ${errText}`,
      };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const extracted = JSON.parse(clean);
    return { success: true, extracted };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Native file picker for single PDF
ipcMain.handle('pick-pdf-file', async (event) => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'PDF Files', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false };
  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);
  return { success: true, filePath, fileName };
});

// Copy a file into a parcel's category subfolder
ipcMain.handle('copy-file-to-folder', async (event, { sourcePath, destFolder, fileName }) => {
  try {
    if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
    const destPath = path.join(destFolder, fileName);
    fs.copyFileSync(sourcePath, destPath);
    return { success: true, destPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Open native folder picker dialog
ipcMain.handle("pick-folder", async (event) => {
  const { dialog } = require("electron");
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false };
  }
  return { success: true, folderPath: result.filePaths[0] };
});

// Scan a folder and return all PDF file paths
ipcMain.handle("scan-folder-for-pdfs", async (event, folderPath) => {
  try {
    const entries = fs.readdirSync(folderPath);
    const pdfs = entries
      .filter((f) => path.extname(f).toLowerCase() === ".pdf")
      .map((f) => ({ name: f, path: path.join(folderPath, f) }));
    return { success: true, files: pdfs };
  } catch (err) {
    return { success: false, error: err.message, files: [] };
  }
});

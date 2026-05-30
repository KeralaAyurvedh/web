import fs from "fs";
import path from "path";

const settingsPath = path.join(__dirname, "../../../system_settings.json");

export interface SystemSettings {
  updateAvailable: boolean;
  updateMessage: string;
}

const defaultSettings: SystemSettings = {
  updateAvailable: false,
  updateMessage: "A new version of Kerala Ayurvedh is available. Please download and install the fresh update to continue."
};

export function getSystemSettings(): SystemSettings {
  try {
    if (!fs.existsSync(settingsPath)) {
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
    const data = fs.readFileSync(settingsPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return defaultSettings;
  }
}

export function saveSystemSettings(settings: SystemSettings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("Failed to save system settings", error);
  }
}

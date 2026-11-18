// Runs in CI after `npx cap add android` / `npx cap add ios`: icons, location permission text in every
// language, the iOS privacy manifest, and Android permissions. Usage: node tools/native-assets.mjs [android|ios]
import { readFile, writeFile, mkdir, copyFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const root = new URL("..", import.meta.url).pathname;
const which = process.argv[2] || "both";
const ICONS = join(root, "icons/native");
const LANGS = ["en", "es", "zh-Hans", "zh-Hant", "vi", "fil", "ar", "ht", "ko", "ru", "pt", "fa-AF", "ps", "so", "uk"];
// iOS .lproj folder names
const LPROJ = { en: "en", es: "es", "zh-Hans": "zh-Hans", "zh-Hant": "zh-Hant", vi: "vi", fil: "fil", ar: "ar", ht: "ht", ko: "ko", ru: "ru", pt: "pt", "fa-AF": "fa-AF", ps: "ps", so: "so", uk: "uk" };

async function str(lang, key) {
  for (const l of [lang, "en"]) {
    try { const j = JSON.parse(await readFile(join(root, "i18n", l + ".json"), "utf8")); if (j[key]) return j[key]; } catch {}
  }
  return "";
}
const esc = s => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const xml = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "\\'").replace(/"/g, '\\"');

async function android() {
  const res = join(root, "android/app/src/main/res");
  if (!existsSync(res)) throw new Error("run `npx cap add android` first");
  for (const d of ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]) {
    const dir = join(res, "mipmap-" + d);
    await mkdir(dir, { recursive: true });
    await copyFile(join(ICONS, `android-${d}-launcher.png`), join(dir, "ic_launcher.png"));
    await copyFile(join(ICONS, `android-${d}-launcher.png`), join(dir, "ic_launcher_round.png"));
    await copyFile(join(ICONS, `android-${d}-foreground.png`), join(dir, "ic_launcher_foreground.png"));
  }
  await writeFile(join(res, "values/ic_launcher_background.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1F3B2D</color>\n</resources>\n`);
  // Launch screen: board color with the mark, instead of the Capacitor template image
  const styles = join(res, "values/styles.xml");
  let st = await readFile(styles, "utf8");
  st = st.replace(/<item name="android:background">@drawable\/splash<\/item>/, `<item name="android:background">@color/ic_launcher_background</item>
        <item name="windowSplashScreenBackground">@color/ic_launcher_background</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>`);
  await writeFile(styles, st);
  // App name in each language (the name stays "Plenty Map")
  const manifest = join(root, "android/app/src/main/AndroidManifest.xml");
  let m = await readFile(manifest, "utf8");
  const perms = ["android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION"];
  for (const p of perms) if (!m.includes(p)) m = m.replace(/<\/manifest>/, `    <uses-permission android:name="${p}" />\n</manifest>`);
  m = m.replace(/\s*android:allowBackup="[^"]*"/, "").replace(/\s*android:dataExtractionRules="[^"]*"/, "")
       .replace(/<application/, '<application android:allowBackup="false" android:dataExtractionRules="@xml/data_extraction_rules"');
  await writeFile(manifest, m);
  await mkdir(join(res, "xml"), { recursive: true });
  // nothing on the phone is backed up to the cloud: it stays on the phone
  await writeFile(join(res, "xml/data_extraction_rules.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n    <cloud-backup><exclude domain="root" /><exclude domain="sharedpref" /><exclude domain="database" /><exclude domain="file" /></cloud-backup>\n    <device-transfer><exclude domain="root" /></device-transfer>\n</data-extraction-rules>\n`);
  console.log("android assets done");
}

async function ios() {
  const app = join(root, "ios/App/App");
  if (!existsSync(app)) throw new Error("run `npx cap add ios` first");
  // icon
  const set = join(app, "Assets.xcassets/AppIcon.appiconset");
  await mkdir(set, { recursive: true });
  for (const f of await readdir(set)) if (f.endsWith(".png")) await writeFile(join(set, f), await readFile(join(ICONS, "ios-1024.png")));
  await copyFile(join(ICONS, "ios-1024.png"), join(set, "AppIcon-512@2x.png"));
  await writeFile(join(set, "Contents.json"), JSON.stringify({ images: [{ filename: "AppIcon-512@2x.png", idiom: "universal", platform: "ios", size: "1024x1024" }], info: { author: "xcode", version: 1 } }, null, 2));
  // launch screen
  const splash = join(app, "Assets.xcassets/Splash.imageset");
  if (existsSync(splash)) for (const f of await readdir(splash)) if (f.endsWith(".png")) await copyFile(join(ICONS, "splash-2732.png"), join(splash, f));
  // Info.plist: location text, languages, no tracking
  const plist = join(app, "Info.plist");
  let p = await readFile(plist, "utf8");
  const loc = await str("en", "ios_location");
  const add = (k, v) => { if (!p.includes(`<key>${k}</key>`)) p = p.replace(/<dict>/, `<dict>\n\t<key>${k}</key>\n\t${v}`); };
  add("NSLocationWhenInUseUsageDescription", `<string>${loc.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</string>`);
  add("CFBundleLocalizations", `<array>${LANGS.map(l => `<string>${LPROJ[l]}</string>`).join("")}</array>`);
  add("CFBundleAllowMixedLocalizations", "<true/>");
  add("ITSAppUsesNonExemptEncryption", "<false/>");
  await writeFile(plist, p);
  // Translated permission text, one InfoPlist.strings per language
  const files = [];
  for (const l of LANGS) {
    const dir = join(app, LPROJ[l] + ".lproj");
    await mkdir(dir, { recursive: true });
    const name = await str(l, "app_name") || "Plenty Map";
    await writeFile(join(dir, "InfoPlist.strings"), `"NSLocationWhenInUseUsageDescription" = "${esc(await str(l, "ios_location"))}";\n"CFBundleDisplayName" = "${esc(name)}";\n`);
    files.push(LPROJ[l] + ".lproj/InfoPlist.strings");
  }
  // Privacy manifest: no tracking, no data collected, one required-reason API (UserDefaults, used by the web view)
  await writeFile(join(app, "PrivacyInfo.xcprivacy"), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSPrivacyTracking</key><false/>
	<key>NSPrivacyTrackingDomains</key><array/>
	<key>NSPrivacyCollectedDataTypes</key><array/>
	<key>NSPrivacyAccessedAPITypes</key>
	<array>
		<dict>
			<key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryUserDefaults</string>
			<key>NSPrivacyAccessedAPITypeReasons</key><array><string>CA92.1</string></array>
		</dict>
	</array>
</dict>
</plist>
`);
  // Register the new files with the Xcode project so they are bundled
  const require = createRequire(import.meta.url);
  const xcode = require("xcode");
  const projPath = join(root, "ios/App/App.xcodeproj/project.pbxproj");
  const proj = xcode.project(projPath); proj.parseSync();
  const appGroup = proj.findPBXGroupKey({ name: "App" }) || proj.findPBXGroupKey({ path: "App" });
  if (!proj.hasFile("PrivacyInfo.xcprivacy")) proj.addResourceFile("PrivacyInfo.xcprivacy", {}, appGroup);
  const vg = proj.findPBXVariantGroupKey?.({ name: "InfoPlist.strings" }) || proj.addLocalizationVariantGroup("InfoPlist.strings").fileRef;
  for (const l of LANGS) {
    proj.addKnownRegion(/[^A-Za-z0-9_]/.test(LPROJ[l]) ? `"${LPROJ[l]}"` : LPROJ[l]);
    const f = LPROJ[l] + ".lproj/InfoPlist.strings";
    if (!proj.hasFile(f)) proj.addResourceFile(f, { variantGroup: true }, vg);
  }
  await writeFile(projPath, proj.writeSync());
  console.log("ios assets done");
}

if (which === "android" || which === "both") await android();
if (which === "ios" || which === "both") await ios();

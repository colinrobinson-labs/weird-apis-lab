/* Where the big map files live. On the website they sit next to the app. The phone apps carry
   everything except the 85 MB map tiles, which they read from our own site (never a third party). */
export const SITE = "https://plentymap.com/";
const isNative = !!window.Capacitor?.isNativePlatform?.();
export const CONFIG = {
  dataBase: isNative ? SITE : "",
  contact: "hello@plentymap.com",
};

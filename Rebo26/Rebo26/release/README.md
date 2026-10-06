# Rebo app releases

Build artifacts are written directly to this folder:

- `Rebo-Setup.exe` — Windows Electron installer; build with `npm run package:windows` from the repository root.
- `Rebo-Android.apk` — Expo / React Native Android installer; build with `npm run build:apk` from the `mobile` folder after installing Java 21 and the Android SDK.

Both apps open the hosted Rebo workspace and require an internet connection. The APK is debug-signed for sideloading. CI publishes these same files to the configured GitHub release.

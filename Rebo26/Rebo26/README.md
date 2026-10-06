<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3e3a511c-b837-433f-b4d6-fe45b063947e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Install Rebo as an app

The website homepage is the Rebo install page. Open `/app` to use the research workspace directly in a browser, or install it from the browser menu to get a standalone app window and launcher icon.

- **Windows:** Download and run `release/Rebo-Setup.exe`, or use Microsoft Edge/Chrome to install the browser app.
- **Android:** Install `release/Rebo-Android.apk` (allow your file manager/browser to install apps if asked), or add the browser app from Chrome.
- Serve the deployed site over **HTTPS** for browser installation and service-worker caching. AI features still need an internet connection.

The native wrappers open the hosted app at `https://rebo-26.vercel.app/?native=1`; that query parameter keeps them pointed at the research workspace even while the homepage is the download page. They require internet access.

### Build native apps

- **Windows (Electron):** run `npm ci`, `npm ci --prefix native/windows`, then `npm run package:windows`. The installer is written to `release/Rebo-Setup.exe`.
- **Android (Expo / React Native):** install Java 21 and the Android SDK (platform 36, NDK 27.1.12297006, CMake 3.22.1), then run `cd mobile`, `npm ci`, and `npm run build:apk`. On Windows, the build script uses the per-user JDK and SDK installed under `%LOCALAPPDATA%` when `JAVA_HOME`/`ANDROID_HOME` are unset. The APK is written to `release/Rebo-Android.apk`.

The Expo project is in [mobile](mobile); it wraps the hosted app in a native WebView, supports Android back navigation, and opens external sites in the system browser. Both builds run through [.github/workflows/app-downloads.yml](.github/workflows/app-downloads.yml), which publishes the installers to the app-downloads GitHub release when pushed changes reach `main`. The Windows installer is unsigned; the APK uses Android's debug signing for direct installation and is not a Play Store release. Native builds are not required to keep the hosted website or its AI backend online; their app wrappers require the hosted Rebo service and an internet connection.

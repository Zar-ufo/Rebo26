import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidRoot = path.join(projectRoot, 'android');
const gradleWrapper = path.join(androidRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
process.env.NODE_ENV ??= 'production';

if (process.platform === 'win32') {
  const localAppData = process.env.LOCALAPPDATA;
  const installedJdk = localAppData && path.join(localAppData, 'ReboBuildTools', 'jdk-21');
  const installedSdk = localAppData && path.join(localAppData, 'Android', 'Sdk');

  if (!process.env.JAVA_HOME && installedJdk && existsSync(path.join(installedJdk, 'bin', 'java.exe'))) {
    process.env.JAVA_HOME = installedJdk;
  }
  if (!process.env.ANDROID_HOME && installedSdk && existsSync(path.join(installedSdk, 'platform-tools'))) {
    process.env.ANDROID_HOME = installedSdk;
  }
  if (process.env.ANDROID_HOME) process.env.ANDROID_SDK_ROOT ??= process.env.ANDROID_HOME;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], projectRoot);

const gradlePropertiesPath = path.join(androidRoot, 'gradle.properties');
const gradleProperties = readFileSync(gradlePropertiesPath, 'utf8');
writeFileSync(
  gradlePropertiesPath,
  gradleProperties.replace(/^reactNativeArchitectures=.*$/m, 'reactNativeArchitectures=arm64-v8a,armeabi-v7a'),
);

if (process.platform !== 'win32') chmodSync(gradleWrapper, 0o755);
run(gradleWrapper, ['assembleDebug', '--console=plain', '--no-daemon', '--warning-mode=summary'], androidRoot);

const builtApk = path.join(androidRoot, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!existsSync(builtApk)) throw new Error(`Android build did not produce the expected APK: ${builtApk}`);

const releaseDirectory = path.resolve(projectRoot, '..', 'release');
mkdirSync(releaseDirectory, { recursive: true });
const releaseApk = path.join(releaseDirectory, 'Rebo-Android.apk');
copyFileSync(builtApk, releaseApk);
console.log(`Android APK saved to ${releaseApk}`);

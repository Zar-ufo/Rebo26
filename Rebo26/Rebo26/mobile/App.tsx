import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

const REBO_URL = 'https://rebo-26.vercel.app/?native=1';
const REBO_HOST = 'rebo-26.vercel.app';

export default function App() {
  const webView = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleBack = useCallback(() => {
    if (!canGoBack) return false;
    webView.current?.goBack();
    return true;
  }, [canGoBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [handleBack]);

  const handleNavigation = useCallback((navigation: WebViewNavigation) => {
    setCanGoBack(navigation.canGoBack);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <WebView
          ref={webView}
          source={{ uri: REBO_URL }}
          style={styles.webView}
          applicationNameForUserAgent="ReboApp"
          originWhitelist={['https://*']}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#947bff" />
              <Text style={styles.loadingText}>Opening your Rebo workspace…</Text>
            </View>
          )}
          onNavigationStateChange={handleNavigation}
          onLoadStart={() => setHasError(false)}
          onError={() => setHasError(true)}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 500) setHasError(true);
          }}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url.startsWith('about:blank')) return true;

            let target: URL;
            try {
              target = new URL(request.url);
            } catch {
              return false;
            }

            if (target.protocol === 'https:' && target.hostname === REBO_HOST) return true;

            if (['https:', 'http:', 'mailto:', 'tel:'].includes(target.protocol)) {
              Linking.openURL(request.url).catch(() => undefined);
            }
            return false;
          }}
        />
        {hasError && (
          <View style={styles.errorOverlay}>
            <Text style={styles.brand}>rebo<Text style={styles.brandDot}>.</Text></Text>
            <Text style={styles.errorTitle}>Can’t reach Rebo right now</Text>
            <Text style={styles.errorBody}>Check your internet connection, then try loading your workspace again.</Text>
            <Pressable accessibilityRole="button" onPress={() => webView.current?.reload()} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090b13',
  },
  webView: { flex: 1, backgroundColor: '#090b13' },
  loading: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#090b13',
  },
  loadingText: { color: '#b7b3c8', fontSize: 14 },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#090b13',
  },
  brand: { color: '#f7f7fb', fontSize: 30, fontWeight: '800', letterSpacing: -1.5 },
  brandDot: { color: '#9a83ff' },
  errorTitle: { marginTop: 28, color: '#f7f7fb', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  errorBody: { maxWidth: 330, marginTop: 10, color: '#a5a9b8', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  retryButton: { marginTop: 25, borderRadius: 10, backgroundColor: '#7657ed', paddingHorizontal: 24, paddingVertical: 13 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

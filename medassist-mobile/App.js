import React from 'react';
import { StyleSheet, View, StatusBar, Platform, LogBox } from 'react-native';
import { WebView } from 'react-native-webview';

LogBox.ignoreAllLogs();

export default function App() {
  return (
    <View style={styles.container}>
      <WebView 
        source={{ uri: 'https://dining-roman-scrooge.ngrok-free.dev' }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        originWhitelist={['*']}
        userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        onPermissionRequest={(request) => {
          request.grant(request.resources);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AdsPaymentScreen() {
  const params = useLocalSearchParams();
  const status = getParam(params.status);

  const title =
    status === 'success'
      ? 'Completing payment'
      : status === 'cancelled'
        ? 'Payment cancelled'
        : 'Waiting for payment result';

  const message =
    status === 'success'
      ? 'You can close this tab if it does not close automatically.'
      : status === 'cancelled'
        ? 'The checkout session was cancelled. You can return to the app and try again.'
        : 'Return to the app to continue.';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === 'success' ? <ActivityIndicator size="large" color="#000" /> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    textAlign: 'center',
  },
});

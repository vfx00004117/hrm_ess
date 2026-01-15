import { Stack } from "expo-router";
import "./globals.css";
import { AuthProvider } from "./(auth)/AuthContext";
import { RootGate } from "./(auth)/RootGate";

export default function RootLayout() {
  return (
      <AuthProvider>
        <RootGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </RootGate>
      </AuthProvider>
  );
}

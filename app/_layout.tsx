import { Stack } from "expo-router";
import "./globals.css";
import { AuthProvider } from "./(auth)/AuthContext";
import { RootGate } from "./(auth)/RootGate";
import {StatusBar} from "expo-status-bar";

export default function RootLayout() {
    return (
        <AuthProvider>
            <RootGate>
                <StatusBar style={'dark'}/>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                </Stack>
            </RootGate>
        </AuthProvider>
  );
}

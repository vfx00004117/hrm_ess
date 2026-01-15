import React, { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "./AuthContext";
import { View, ActivityIndicator } from "react-native";

export function RootGate({ children }: { children: React.ReactNode }) {
    const { isReady, token } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (!isReady) return;

        const inAuthGroup = segments[0] === "(auth)";

        if (!token && !inAuthGroup) {
            router.replace("/(auth)/login");
            return;
        }

        if (token && inAuthGroup) {
            router.replace("/(tabs)");
        }
    }, [isReady, token, segments, router]);

    if (!isReady) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator />
            </View>
        );
    }

    return <>{children}</>;
}

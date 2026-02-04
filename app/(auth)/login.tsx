import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "./AuthContext";

export default function LoginScreen() {
    const router = useRouter();
    const { signIn } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function onLogin() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) throw new Error("Invalid credentials");
            const data = await res.json();
            await signIn(data.accessToken);

            router.replace("/(tabs)");
        } catch (e: any) {
            Alert.alert("Login failed", e?.message ?? "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <View className="flex-1 justify-center px-6 gap-4 bg-white">
            <Text className="text-2xl font-bold">Sign in</Text>

            <TextInput
                className="border rounded-xl px-4 py-3"
                placeholder="Email"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                className="border rounded-xl px-4 py-3"
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <Pressable
                className="bg-black rounded-xl py-3 items-center"
                onPress={onLogin}
                disabled={loading}
            >
                <Text className="text-white font-semibold">{loading ? "..." : "Login"}</Text>
            </Pressable>
        </View>
    );
}

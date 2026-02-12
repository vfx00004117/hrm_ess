import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/components/auth/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { login } from "@/lib/api/auth";

export default function LoginScreen() {
    const router = useRouter();
    const { signIn } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { errorText, handleError, clearError } = useErrorHandler();

    async function onLogin() {
        setLoading(true);
        clearError();
        try {
            const data = await login(API_BASE_URL, { email, password });
            await signIn(data.accessToken);

            router.replace("/(tabs)");
        } catch (e: any) {
            handleError(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View className="flex-1 bg-white">
            <View className="flex-1 justify-center px-6 gap-4 web:max-w-md web:mx-auto w-full">
                <Text className="text-2xl font-bold">Sign in</Text>

                <TextInput
                    className="border rounded-xl px-4 py-3"
                    placeholder="Email"
                    placeholderTextColor="gray"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    className="border rounded-xl px-4 py-3"
                    placeholder="Password"
                    placeholderTextColor="gray"
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

                {errorText ? (
                    <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                        <Text className="text-red-700 text-center">{errorText}</Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

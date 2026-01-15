import {Text, View, Pressable, Alert, ActivityIndicator} from 'react-native';
import React from 'react';
import {SafeAreaView} from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/app/(auth)/AuthContext";

type ProfileDto = {
    email: string;
    full_name: string;
    birth_date: string | null;
    employee_number: string;
    position: string;
    work_start_date: string | null;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.200:8000";

function ProfileRow({label, value}: { label: string; value: string }) {
    return (
        <View className="gap-1">
            <Text className="text-xs text-slate-500">{label}</Text>
            <Text className="text-base font-medium text-slate-900">{value}</Text>
        </View>
    );
}

export default function ProfileScreen() {
    const { token, signOut } = useAuth();
    const handleSignOut = () => {
        Alert.alert(
            "Вийти з акаунту",
            "Ви дійсно хочете вийти?",
            [
                { text: "Скасувати", style: "cancel" },
                {
                    text: "Вийти",
                    style: "destructive",
                    onPress: async () => {
                        await signOut();
                        router.replace("/(auth)/login");
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 px-4 pt-4">
            <Text className="text-2xl font-semibold text-slate-900">Профіль</Text>

            <View className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                <View className="gap-4">
                    <ProfileRow label="ПІБ" value={''} />
                    <View className="h-px bg-slate-100" />

                    <ProfileRow label="Табельний номер" value={''} />
                    <View className="h-px bg-slate-100" />

                    <ProfileRow label="Посада" value={''} />
                    <View className="h-px bg-slate-100" />
                </View>
            </View>

            <View className="mt-6">
                <Pressable
                    onPress={handleSignOut}
                    className="rounded-2xl bg-red-500 py-4 items-center active:bg-red-600">
                    <Text className="text-base font-semibold text-white">Вийти</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
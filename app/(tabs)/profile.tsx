import {Text, View, Pressable, Alert, ActivityIndicator} from 'react-native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {SafeAreaView} from "react-native-safe-area-context";
import {router, useFocusEffect} from "expo-router";
import { useAuth } from "@/app/(auth)/AuthContext";

type ProfileOut = {
    email: string;
    full_name: string | null;
    birth_date: string | null;
    employee_number: string | null;
    position: string | null;
    work_start_date: string | null;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.200:8000";

function formatDateUA(value: string | null | undefined) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("uk-UA");
}

function ProfileRow({label, value}: { label: string; value: string }) {
    return (
        <View className="gap-1">
            <Text className="text-s text-slate-500">{label}</Text>
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

    const [profile, setProfile] = useState<ProfileOut | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const loadProfile = useCallback(async () => {
        if (!token) {
            setProfile(null);
            setErrorText("Немає токена авторизації. Увійди знову.");
            return;
        }

        setLoading(true);
        setErrorText(null);

        try {
            const res = await fetch(`${API_BASE_URL}/me/profile`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });

            if (res.status === 401) {
                setErrorText("Сесія завершилась. Увійди знову.");
                setProfile(null);
                return;
            }

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`Помилка ${res.status}. ${text}`);
            }

            const data = (await res.json()) as ProfileOut;
            setProfile(data);
        } catch (e: any) {
            setProfile(null);
            setErrorText(e?.message ?? "Не вдалося завантажити профіль.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    // Підвантаження при відкритті екрану
    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    // І ще раз при поверненні на вкладку (зручно, якщо профіль міняли на іншому екрані)
    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [loadProfile])
    );

    const viewModel = useMemo(() => {
        return {
            email: profile?.email ?? "",
            fullName: profile?.full_name ?? "",
            birthDate: formatDateUA(profile?.birth_date),
            empNo: profile?.employee_number ?? "",
            position: profile?.position ?? "",
            workStart: formatDateUA(profile?.work_start_date),
        };
    }, [profile]);

    return (
        <SafeAreaView className="flex-1 bg-slate-50 px-4 pt-4">
            <Text className="text-2xl font-semibold text-slate-900">Профіль</Text>

            {loading ? (
                <View className="py-10 items-center">
                    <ActivityIndicator />
                    <Text className="text-white/60 mt-3">Завантаження…</Text>
                </View>
            ) : errorText ? (
                <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                    <Text className="text-black">{errorText}</Text>

                    <View className="mt-4">
                        <Pressable onPress={loadProfile} className="rounded-2xl bg-white py-4 items-center active:bg-blue-100">
                            <Text className="text-base font-semibold text-black">Спробувати ще</Text>
                        </Pressable>
                    </View>
                </View>
            ) : (
                <View className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                    <View className="gap-4">
                        <ProfileRow label="ПІБ" value={viewModel.fullName}/>
                        <View className="h-px bg-slate-100"/>

                        <ProfileRow label="Email" value={viewModel.email}/>
                        <View className="h-px bg-slate-100"/>

                        <ProfileRow label="Табельний номер" value={viewModel.empNo}/>
                        <View className="h-px bg-slate-100"/>

                        <ProfileRow label="Посада" value={viewModel.position}/>
                        <View className="h-px bg-slate-100"/>

                        <ProfileRow label="Дата народження" value={viewModel.birthDate}/>
                        <View className="h-px bg-slate-100"/>

                        <ProfileRow label="Початок роботи" value={viewModel.workStart}/>
                    </View>
                </View>
            )}
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
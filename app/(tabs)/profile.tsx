import {Text, View, Pressable, Alert, ActivityIndicator, ScrollView} from 'react-native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {SafeAreaView} from "react-native-safe-area-context";
import {router, useFocusEffect} from "expo-router";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/app/(auth)/AuthContext";

type ProfileOut = {
    email: string;
    full_name: string | null;
    birth_date: string | null;
    employee_number: string | null;
    position: string | null;
    work_start_date: string | null;
    department_name: string | null;
};

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
            const res = await fetch(`${API_BASE_URL}/employee/profile/me`, {
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

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

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
            depName: profile?.department_name ?? "",
        };
    }, [profile]);

    return (
        <SafeAreaView className="flex-1 bg-slate-50 px-4" edges={['top']}>
            <Text className="text-3xl font-bold mb-3">Профіль</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-5">
                <View className="rounded-2xl bg-white p-4 shadow-sm">
                    <View className="gap-4">
                        <ProfileRow label="ПІБ" value={viewModel.fullName}/>
                        <View className="h-px bg-slate-100"/>

                        <ProfileRow label="Email" value={viewModel.email}/>
                        <View className="h-px bg-slate-100"/>

                        <ProfileRow label="Табельний номер" value={viewModel.empNo}/>
                        <View className="h-px bg-slate-100"/>

                        <ProfileRow label="Підрозділ" value={viewModel.depName}/>
                        <View className="h-px bg-slate-100"/>

                        <ProfileRow label="Посада" value={viewModel.position}/>
                        <View className="h-px bg-slate-100"/>

                        <ProfileRow label="Дата народження" value={viewModel.birthDate}/>
                        <View className="h-px bg-slate-100"/>

                        <ProfileRow label="Початок роботи" value={viewModel.workStart}/>
                    </View>
                </View>
                {loading ? (
                    <View className="py-8 items-center absolute inset-0 justify-center bg-white/60 rounded-2xl">
                        <ActivityIndicator />
                        <Text className="text-black/70 mt-3">Завантаження…</Text>
                    </View>
                ) : errorText ? (
                    <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mt-4">
                        <Text className="text-red-700">{errorText}</Text>
                        <Pressable onPress={() => loadProfile()} className="mt-3 bg-black/10 px-4 py-3 rounded-xl">
                            <Text className="text-[#111827]">Спробувати ще</Text>
                        </Pressable>
                    </View>
                ) : null}
                <View className="mt-4">
                    <Pressable
                        onPress={handleSignOut}
                        className="rounded-2xl bg-red-500 py-4 items-center active:bg-red-600 border border-red-500/20">
                        <Text className="text-base font-semibold text-white">Вийти</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    Alert,
    Pressable,
    TextInput,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/app/(auth)/AuthContext";
import { EmployeePicker } from "@/components/schedule/EmployeePicker";
import type { DeptEmployee } from "@/lib/schedule/types";
import { getDeptEmployees, fetchJson, handleResponseError } from "@/lib/api/schedule";

type ProfileData = {
    email: string;
    full_name: string | null;
    birth_date: string | null;
    employee_number: string | null;
    position: string | null;
    work_start_date: string | null;
    department_name: string | null;
};

type Props = {
    onBack: () => void;
};

export default function StaffManager({ onBack }: Props) {
    const { token } = useAuth();
    const [employees, setEmployees] = useState<DeptEmployee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [saving, setSaving] = useState(false);

    // Поля форми
    const [fullName, setFullName] = useState("");
    const [empNo, setEmpNo] = useState("");
    const [position, setPosition] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [workStart, setWorkStart] = useState("");

    const loadEmployees = useCallback(async () => {
        if (!token) return;
        setLoadingEmployees(true);
        try {
            const data = await getDeptEmployees(API_BASE_URL, token);
            setEmployees(data);
        } catch (e: any) {
            Alert.alert("Помилка", "Не вдалося завантажити список співробітників");
        } finally {
            setLoadingEmployees(false);
        }
    }, [token]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const loadEmployeeProfile = useCallback(async (id: number) => {
        if (!token) return;
        setLoadingProfile(true);
        try {
            const data = await fetchJson<ProfileData>(
                `${API_BASE_URL}/employee/profile/${id}`,
                token
            );
            setProfile(data);
            setFullName(data.full_name || "");
            setEmpNo(data.employee_number || "");
            setPosition(data.position || "");
            setBirthDate(data.birth_date || "");
            setWorkStart(data.work_start_date || "");
        } catch (e: any) {
            Alert.alert("Помилка", e.message || "Не вдалося завантажити профіль");
        } finally {
            setLoadingProfile(false);
        }
    }, [token]);

    useEffect(() => {
        if (selectedEmployeeId) {
            loadEmployeeProfile(selectedEmployeeId);
        } else {
            setProfile(null);
        }
    }, [selectedEmployeeId, loadEmployeeProfile]);

    const handleSave = async () => {
        if (!token || !selectedEmployeeId) return;
        setSaving(true);
        try {
            const payload = {
                full_name: fullName,
                employee_number: empNo,
                position: position,
                birth_date: birthDate || null,
                work_start_date: workStart || null,
            };

            const res = await fetch(`${API_BASE_URL}/employee/profile/add/${selectedEmployeeId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                await handleResponseError(res);
            }

            Alert.alert("Успіх", "Профіль співробітника оновлено");
            // Оновлюємо список співробітників, якщо ПІБ змінилося
            loadEmployees();
        } catch (e: any) {
            Alert.alert("Помилка", e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#f5f5f5] px-5 pt-3" edges={['top']}>
            <View className="flex-row items-center mb-[20px]">
                <TouchableOpacity onPress={onBack} className="mr-[15px]">
                    <MaterialIcons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-[20px] font-bold">Співробітники</Text>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="pb-5">
                {loadingEmployees ? (
                    <ActivityIndicator color="#000" className="my-4" />
                ) : (
                    <EmployeePicker
                        employees={employees}
                        selectedEmployeeId={selectedEmployeeId}
                        onSelect={setSelectedEmployeeId}
                    />
                )}

                {loadingProfile ? (
                    <ActivityIndicator color="#000" className="my-10" />
                ) : profile ? (
                    <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                        <Text className="text-lg font-bold mb-4">Редагування профілю</Text>
                        
                        <View className="mb-4">
                            <Text className="text-slate-500 mb-1">Email (не редагується)</Text>
                            <TextInput
                                value={profile.email}
                                editable={false}
                                className="bg-slate-100 p-3 rounded-xl text-slate-500"
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-slate-500 mb-1">ПІБ</Text>
                            <TextInput
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Введіть ПІБ"
                                className="border border-slate-200 p-3 rounded-xl"
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-slate-500 mb-1">Табельний номер</Text>
                            <TextInput
                                value={empNo}
                                onChangeText={setEmpNo}
                                placeholder="Наприклад: 12345"
                                className="border border-slate-200 p-3 rounded-xl"
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-slate-500 mb-1">Посада</Text>
                            <TextInput
                                value={position}
                                onChangeText={setPosition}
                                placeholder="Введіть посаду"
                                className="border border-slate-200 p-3 rounded-xl"
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-slate-500 mb-1">Дата народження (РРРР-ММ-ДД)</Text>
                            <TextInput
                                value={birthDate}
                                onChangeText={setBirthDate}
                                placeholder="YYYY-MM-DD"
                                className="border border-slate-200 p-3 rounded-xl"
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-slate-500 mb-1">Початок роботи (РРРР-ММ-ДД)</Text>
                            <TextInput
                                value={workStart}
                                onChangeText={setWorkStart}
                                placeholder="YYYY-MM-DD"
                                className="border border-slate-200 p-3 rounded-xl"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            className={`bg-emerald-600/90 border border-emerald-700/60 py-4 rounded-2xl items-center mt-2 ${saving ? 'opacity-70' : ''}`}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-base">Зберегти зміни</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : selectedEmployeeId ? (
                    <View className="items-center my-10">
                        <Text className="text-slate-400">Завантаження даних профілю...</Text>
                    </View>
                ) : (
                    <View className="items-center my-10">
                        <Text className="text-slate-400">Оберіть співробітника для редагування</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../(auth)/AuthContext";

import { setupCalendarLocaleUA } from "@/lib/calendar/localeUA";
import { API_BASE_URL } from "@/lib/config";
import type { DeptEmployee } from "@/lib/schedule/types";
import { todayISO, ymFromDate } from "@/lib/schedule/utils";

import { useScheduleMonth } from "@/hooks/schedule/useScheduleMonth";
import { EmployeePicker } from "@/components/schedule/EmployeePicker";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import { ScheduleEditModal } from "@/components/schedule/ScheduleEditModal";
import { deleteDaySchedule, upsertDaySchedule } from "@/lib/api/schedule";
import type { EntryType } from "@/lib/schedule/types";

export default function ScheduleScreen() {
    const { token, role, userId } = useAuth();
    const isManager = role === "manager";

    // Локаль календаря — один раз
    useEffect(() => {
        setupCalendarLocaleUA();
    }, []);

    const [view, setView] = useState<"me" | "dept">("me");

    const [selectedDate, setSelectedDate] = useState(() => todayISO());
    const [monthYM, setMonthYM] = useState(() => ymFromDate(todayISO()));

    const [deptEmployees, setDeptEmployees] = useState<DeptEmployee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);

    const { entries, entryByDate, loading, errorText, reload } = useScheduleMonth({
        apiBase: API_BASE_URL,
        token,
        isManager,
        view,
        monthYM,
        deptEmployees,
        setDeptEmployees,
        selectedEmployeeId,
        setSelectedEmployeeId,
    });

    const selectedEntry = entryByDate.get(selectedDate) ?? null;

    const handleSaveEntry = async (payload: {
        type: EntryType;
        start_time?: string | null;
        end_time?: string | null;
        title?: string | null;
    }) => {
        try {
            const targetId = view === "dept" ? selectedEmployeeId : null;
            await upsertDaySchedule(
                API_BASE_URL,
                token || "",
                { ...payload, date: selectedDate },
                targetId
            );
            setIsEditModalVisible(false);
            reload();
        } catch (e: any) {
            Alert.alert("Помилка", e.message || "Помилка при збереженні");
        }
    };

    const handleDeleteEntry = async () => {
        if (!selectedEntry) return;
        try {
            const isDept = view === "dept";
            const targetId = isDept ? selectedEmployeeId : null;

            if (isDept && !targetId) {
                Alert.alert("Помилка", "Спочатку оберіть співробітника");
                return;
            }

            await deleteDaySchedule(
                API_BASE_URL,
                token || "",
                selectedDate,
                targetId
            );
            setIsEditModalVisible(false);
            reload();
        } catch (e: any) {
            Alert.alert("Помилка", e.message || "Помилка при видаленні");
        }
    };

    const detailsText = useMemo(() => {
        if (!selectedEntry) return "Немає запису на цей день";

        const title = selectedEntry.title?.trim();
        const base = title ? title : selectedEntry.type;

        if (selectedEntry.type === "shift" || selectedEntry.type === "trip") {
            const s = selectedEntry.start_time ?? "?";
            const e = selectedEntry.end_time ?? "?";
            return `${base}: ${s} – ${e}`;
        }

        return base;
    }, [selectedEntry]);

    return (
        <SafeAreaView className="flex-1 bg-slate-50 px-4" edges={['top']}>
            <View className="flex-row items-center">
                <Text className="text-3xl font-bold mb-3">Графік</Text>
            </View>

            {isManager ? (
                <View className="flex-row gap-2 mb-4">
                    <Pressable
                        onPress={() => {
                            setView("me");
                            setSelectedEmployeeId(null);
                        }}
                        className={`px-4 py-2 rounded-xl ${view === "me" ? "bg-black/10" : "bg-black/5"}`}
                    >
                        <Text className="text-[#111827]">Мій графік</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            setView("dept");
                            // якщо список порожній — hook сам підтягне при першому load
                        }}
                        className={`px-4 py-2 rounded-xl ${view === "dept" ? "bg-black/10" : "bg-black/5"}`}
                    >
                        <Text className="text-[#111827]">Графік підрозділу</Text>
                    </Pressable>
                </View>
            ) : null}

            {isManager && view === "dept" ? (
                <EmployeePicker
                    employees={deptEmployees}
                    selectedEmployeeId={selectedEmployeeId}
                    onSelect={(id) => setSelectedEmployeeId(id)}
                />
            ) : null}

            <View className="bg-white border border-black/10 rounded-2xl p-3">
                <ScheduleCalendar
                    monthYM={monthYM}
                    entries={entries}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    onChangeMonthYM={setMonthYM}
                />

                {loading ? (
                    <View className="absolute inset-0 items-center justify-center bg-white/60 rounded-2xl">
                        <ActivityIndicator />
                        <Text className="text-black/70 mt-3">Завантаження…</Text>
                    </View>
                ) : errorText ? (
                    <View className="mt-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                        <Text className="text-red-700">{errorText}</Text>
                        <Pressable onPress={reload} className="mt-3 bg-black/10 px-4 py-3 rounded-xl">
                            <Text className="text-[#111827]">Спробувати ще</Text>
                        </Pressable>
                    </View>
                ) : null}
            </View>

            <View className="mt-4 bg-white border border-black/10 rounded-2xl p-4">
                <Text className="text-[#111827] text-lg font-semibold">{selectedDate}</Text>
                <Text className="text-black/70 mt-2">{detailsText}</Text>

                {isManager ? (
                    <Pressable
                        onPress={() => {
                            if (view === "dept" && !selectedEmployeeId) {
                                Alert.alert("Помилка", "Спочатку оберіть співробітника");
                                return;
                            }
                            setIsEditModalVisible(true);
                        }}
                        className="mt-4 bg-black/10 px-4 py-3 rounded-xl"
                    >
                        <Text className="text-[#111827]">Додати / змінити</Text>
                    </Pressable>
                ) : null}
            </View>

            <ScheduleEditModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                onSave={handleSaveEntry}
                onDelete={handleDeleteEntry}
                entry={selectedEntry}
                date={selectedDate}
            />
        </SafeAreaView>
    );
}

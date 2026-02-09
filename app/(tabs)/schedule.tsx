import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../(auth)/AuthContext";

import { setupCalendarLocaleUA } from "@/lib/calendar/localeUA";
import { API_BASE_URL } from "@/lib/config";
import type { DeptEmployee } from "@/lib/schedule/types";
import { todayISO, ymFromDate } from "@/lib/schedule/utils";

import { useScheduleMonth } from "@/hooks/schedule/useScheduleMonth";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { EmployeePicker } from "@/components/schedule/EmployeePicker";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import { ScheduleEditModal } from "@/components/schedule/ScheduleEditModal";
import { deleteDaySchedule, upsertDaySchedule } from "@/lib/api/schedule";
import { ValidationError } from "@/lib/errors";
import type { EntryType } from "@/lib/schedule/types";

setupCalendarLocaleUA();

export default function ScheduleScreen() {
    const { token, role, userId } = useAuth();
    const isManager = role === "manager";

    const [view, setView] = useState<"me" | "dept">("me");

    const [selectedDate, setSelectedDate] = useState(() => todayISO());
    const [monthYM, setMonthYM] = useState(() => ymFromDate(todayISO()));

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);

    const {
        entries,
        entryByDate,
        loading,
        errorText,
        reload,
        deptEmployees,
        selectedEmployeeId,
        setSelectedEmployeeId,
    } = useScheduleMonth({
        apiBase: API_BASE_URL,
        token,
        isManager,
        view,
        monthYM,
    });

    const { errorText: actionError, handleError: handleActionError, clearError: clearActionError } = useErrorHandler();

    const selectedEntry = entryByDate.get(selectedDate) ?? null;

    const handleSaveEntry = async (payload: {
        type: EntryType;
        start_time?: string | null;
        end_time?: string | null;
        title?: string | null;
    }) => {
        clearActionError();
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
            handleActionError(e, "Помилка при збереженні");
        }
    };

    const handleDeleteEntry = async () => {
        if (!selectedEntry) return;
        clearActionError();
        try {
            const isDept = view === "dept";
            const targetId = isDept ? selectedEmployeeId : null;

            if (isDept && !targetId) {
                throw new ValidationError("Спочатку оберіть співробітника");
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
            handleActionError(e, "Помилка при видаленні");
        }
    };

    const detailsText = useMemo(() => {
        if (!selectedEntry) return "Немає запису на цей день";

        const { title, type, start_time, end_time } = selectedEntry;
        
        let base = title?.trim();
        
        if (!base) {
            const translations: Record<string, string> = {
                shift: "Зміна",
                off: "Вихідний",
                vacation: "Відпустка",
                sick: "Лікарняний",
                trip: "Відрядження",
                other: "Інше",
            };
            base = translations[type] || type;
        }

        if (type === "shift" || type === "trip") {
            return `${base}: ${start_time ?? "?"} – ${end_time ?? "?"}`;
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
                            clearActionError();
                            if (view === "dept" && !selectedEmployeeId) {
                                handleActionError(new ValidationError("Спочатку оберіть співробітника"));
                                return;
                            }
                            setIsEditModalVisible(true);
                        }}
                        className="mt-4 bg-black/10 px-4 py-3 rounded-xl"
                    >
                        <Text className="text-[#111827]">Додати / змінити</Text>
                    </Pressable>
                ) : null}

                {actionError ? (
                    <View className="mt-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                        <Text className="text-red-700">{actionError}</Text>
                        <Pressable onPress={() => clearActionError()} className="mt-2 self-start">
                            <Text className="text-red-700 font-semibold text-xs">Закрити</Text>
                        </Pressable>
                    </View>
                ) : null}
            </View>

            <ScheduleEditModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                onSave={handleSaveEntry}
                onDelete={handleDeleteEntry}
                entry={selectedEntry}
                date={selectedDate}
                errorText={actionError}
                clearError={clearActionError}
            />
        </SafeAreaView>
    );
}

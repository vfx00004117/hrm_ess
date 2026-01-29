import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import {Calendar, DateData, LocaleConfig} from "react-native-calendars";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../(auth)/AuthContext";
import {SafeAreaView} from "react-native-safe-area-context";

LocaleConfig.locales['ua'] = {
    monthNames: [
        'Січень',
        'Лютий',
        'Березень',
        'Квітень',
        'Травень',
        'Червень',
        'Липень',
        'Серпень',
        'Вересень',
        'Жовтень',
        'Листопад',
        'Грудень'
    ],
    monthNamesShort: ['Cіч.', 'Лют.', 'Бер.', 'Кві.', 'Тра.', 'Чер.', 'Лип.', 'Сер.', 'Вер.', 'Жов.', 'Лис.', 'Гру.'],
    dayNames: ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота', 'Неділя'],
    dayNamesShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
    today: "Сьогодні"
};

LocaleConfig.defaultLocale = 'ua';

type EntryType = "shift" | "off" | "vacation" | "sick" | "trip" | "other";

type MyEntry = {
    date: string;
    type: EntryType;
    start_time?: string | null;
    end_time?: string | null;
    title?: string | null;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.200:8000";

function ymFromDate(dateStr: string) {
    return dateStr.slice(0, 7);
}
function firstOfMonth(ym: string) {
    return `${ym}-01`;
}

function bgForMyEntry(e: MyEntry) {
    switch (e.type) {
        case "shift":
            return "#BFD7FF";
        case "vacation":
            return "#CFF0D8";
        case "sick":
            return "#F2AFAF";
        case "trip":
            return "#FFD29A";
        case "off":
            return "#9FE0B5";
        default:
            return "#FEF3C7";
    }
}

export default function ScheduleScreen() {
    const { token } = useAuth();

    const [mode, setMode] = useState<"me" | "dept">("me");
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    });
    const [monthYM, setMonthYM] = useState(() => ymFromDate(selectedDate));

    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const [myEntries, setMyEntries] = useState<MyEntry[]>([]);

    const loadMonth = useCallback(
        async (ym: string) => {
            if (!token) return;

            setLoading(true);
            setErrorText(null);

            try {
                const res = await fetch(`${API_BASE_URL}/schedule/me?month=${ym}`, {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                });

                if (res.status === 401) {
                    setMyEntries([]);
                    setErrorText("Сесія завершилась. Увійди знову.");
                    return;
                }

                if (!res.ok) throw new Error(`Не вдалося завантажити графік (${res.status})`);

                const data = await res.json();
                setMyEntries(data.entries ?? []);
            } catch (e: any) {
                setErrorText(e?.message ?? "Помилка завантаження");
            } finally {
                setLoading(false);
            }
        },
        [token]
    );

    useFocusEffect(
        useCallback(() => {
            loadMonth(monthYM);
        }, [loadMonth, monthYM])
    );

    const selectedMyEntry = useMemo(() => {
        return myEntries.find((e) => e.date === selectedDate) ?? null;
    }, [myEntries, selectedDate]);

    const markedDates = useMemo(() => {
        const marks: Record<string, any> = {};

        for (const e of myEntries) {
            const bg = bgForMyEntry(e);
            marks[e.date] = {
                customStyles: {
                    container: {
                        backgroundColor: bg,
                        borderRadius: 10,
                    },
                    text: {
                        color: "#111827",
                        fontWeight: "600",
                    },
                },
            };
        }

        const prev = marks[selectedDate] ?? {};
        marks[selectedDate] = {
            ...prev,
            customStyles: {
                container: {
                    ...(prev.customStyles?.container ?? {}),
                    borderWidth: 2,
                    borderColor: "#111827",
                    borderRadius: 10,
                },
                text: {
                    ...(prev.customStyles?.text ?? {}),
                    color: "#111827",
                    fontWeight: "700",
                },
            },
        };

        return marks;
    }, [myEntries, selectedDate]);

    return (
        <SafeAreaView className="flex-1 bg-[#F5F7FB]" edges={['top']}>
            <ScrollView className="flex-1 bg-[#F5F7FB]" contentContainerStyle={{ padding: 16 }}>
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-[#111827] text-2xl font-semibold">Графік</Text>
                </View>

                {loading ? (
                    <View className="py-8 items-center">
                        <ActivityIndicator />
                        <Text className="text-black/60 mt-3">Завантаження…</Text>
                    </View>
                ) : errorText ? (
                    <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
                        <Text className="text-red-700">{errorText}</Text>
                        <Pressable onPress={() => loadMonth(monthYM)} className="mt-3 bg-black/10 px-4 py-3 rounded-xl">
                            <Text className="text-[#111827]">Спробувати ще</Text>
                        </Pressable>
                    </View>
                ) : null}

                <View className="bg-white border border-black/10 rounded-2xl p-3">
                    <Calendar
                        current={firstOfMonth(monthYM)}
                        markingType="custom"
                        markedDates={markedDates}
                        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
                        onMonthChange={(m) => {
                            const ym = `${m.year}-${String(m.month).padStart(2, "0")}`;
                            setMonthYM(ym);
                            loadMonth(ym);
                        }}
                        theme={{
                            calendarBackground: "#FFFFFF",
                            monthTextColor: "#111827",
                            dayTextColor: "#111827",
                            textDisabledColor: "rgba(17,24,39,0.35)",
                            arrowColor: "#111827",
                            todayTextColor: "#111827",
                            textSectionTitleColor: "rgba(17,24,39,0.55)",
                        }}
                    />
                </View>

                <View className="mt-4 bg-white border border-black/10 rounded-2xl p-4">
                    <Text className="text-[#111827] text-lg font-semibold">{selectedDate}</Text>

                    <Text className="text-black/70 mt-2">
                        {selectedMyEntry
                            ? selectedMyEntry.type === "shift" || selectedMyEntry.type === "trip"
                                ? `${selectedMyEntry.title}: ${selectedMyEntry.start_time ?? "?"} – ${selectedMyEntry.end_time ?? "?"}`
                                : `${selectedMyEntry.title}`
                            : "Немає запису на цей день"}
                    </Text>

                    <Pressable
                        onPress={() => {
                            // TODO: bottom sheet / modal для встановлення типу дня + часів
                        }}
                        className="mt-4 bg-black/10 px-4 py-3 rounded-xl"
                    >
                        <Text className="text-[#111827]">Додати / змінити</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

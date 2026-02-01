import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Animated } from "react-native";
import { Calendar, DateData, LocaleConfig } from "react-native-calendars";
import { useAuth } from "../(auth)/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import ScrollView = Animated.ScrollView;

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

type ScheduleEntry = {
    date: string;
    type: EntryType;
    start_time?: string | null;
    end_time?: string | null;
    title?: string | null;
};

type DeptEmployee = {
    user_id: number;
    email: string;
    full_name?: string | null;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.200:8000";

function ymFromDate(dateStr: string) {
    return dateStr.slice(0, 7);
}
function firstOfMonth(ym: string) {
    return `${ym}-01`;
}

function bgForMyEntry(e: ScheduleEntry) {
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
    const { token, role } = useAuth();
    const isManager = role === "manager";

    const [view, setView] = useState<"me" | "dept">("me");

    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    });

    const [monthYM, setMonthYM] = useState(() => ymFromDate(selectedDate));

    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const [entries, setEntries] = useState<ScheduleEntry[]>([]);

    const [deptEmployees, setDeptEmployees] = useState<DeptEmployee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

    const abortRef = useRef<AbortController | null>(null);

    const fetchJson = useCallback(
        async (url: string) => {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            });
            if (res.status === 401) throw new Error("Сесія завершилась. Увійди знову.");
            if (!res.ok) throw new Error(`Помилка ${res.status}`);
            return res.json();
        },
        [token]
    );

    const loadEmployeesIfNeeded = useCallback(async () => {
        if (!isManager || !token) return;

        if (deptEmployees.length > 0) return;

        const data = (await fetchJson(`${API_BASE_URL}/department/employees`)) as DeptEmployee[];
        setDeptEmployees(data);

        if (data.length > 0 && selectedEmployeeId == null) {
            setSelectedEmployeeId(data[0].user_id);
        }
    }, [isManager, token, deptEmployees.length, selectedEmployeeId, fetchJson]);

    const loadMonth = useCallback(
        async (ym: string) => {
            if (!token) return;
            setLoading(true);
            setErrorText(null);

            try {
                if (isManager && view === "dept") {
                    await loadEmployeesIfNeeded();
                    if (!selectedEmployeeId) {
                        setEntries([]);
                        return;
                    }
                    const data = await fetchJson(
                        `${API_BASE_URL}/schedule/${selectedEmployeeId}?month=${ym}`
                    );
                    setEntries(data.entries ?? []);
                    return;
                }
                const data = await fetchJson(`${API_BASE_URL}/schedule/me?month=${ym}`);
                setEntries(data.entries ?? []);
            } catch (e: any) {
                setEntries([]);
                setErrorText(e?.message ?? "Помилка завантаження");
            } finally {
                setLoading(false);
            }
        },
        [token, isManager, view, selectedEmployeeId, fetchJson, loadEmployeesIfNeeded]
    );

    useEffect(() => {
        if (!token) return;

        if (isManager && view === "dept" && !selectedEmployeeId) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        (async () => {
            setLoading(true);
            setErrorText(null);

            try {
                const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

                if (isManager && view === "dept") {
                    const res = await fetch(
                        `${API_BASE_URL}/schedule/${selectedEmployeeId}?month=${monthYM}`,
                        { headers, signal: controller.signal }
                    );
                    if (!res.ok) throw new Error(`Помилка ${res.status}`);
                    const data = await res.json();
                    setEntries(data.entries ?? []);
                } else {
                    const res = await fetch(`${API_BASE_URL}/schedule/me?month=${monthYM}`, {
                        headers,
                        signal: controller.signal,
                    });
                    if (!res.ok) throw new Error(`Помилка ${res.status}`);
                    const data = await res.json();
                    setEntries(data.entries ?? []);
                }
            } catch (e: any) {
                if (e?.name === "AbortError") return;
                setEntries([]);
                setErrorText(e?.message ?? "Помилка завантаження");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();

        return () => controller.abort();
    }, [token, isManager, view, selectedEmployeeId, monthYM]);

    const selectedEntry = useMemo(() => {
        return entries.find((e) => e.date === selectedDate) ?? null;
    }, [entries, selectedDate]);

    const markedDates = useMemo(() => {
        const marks: Record<string, any> = {};
        for (const e of entries) {
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
    }, [entries, selectedDate]);

    return (
        <SafeAreaView className="flex-1 bg-[#F5F7FB] ml-4 mr-4">
            <View className="flex-row items-center pb-4">
                <Text className="text-[#111827] text-2xl font-semibold">Графік</Text>
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
                            // список людей підтягнемо і виберемо першого
                            loadEmployeesIfNeeded();
                        }}
                        className={`px-4 py-2 rounded-xl ${view === "dept" ? "bg-black/10" : "bg-black/5"}`}
                    >
                        <Text className="text-[#111827]">Графік підрозділу</Text>
                    </Pressable>
                </View>
            ) : null}

            {isManager && view === "dept" ? (
                <View className="bg-white border border-black/10 rounded-2xl p-3 mb-4">
                    <Text className="text-[#111827] font-semibold mb-2">Співробітник</Text>

                    {deptEmployees.length === 0 ? (
                        <Text className="text-black/60">
                            Немає співробітників у підрозділі або підрозділ не призначений.
                        </Text>
                    ) : (
                        <>
                            <Pressable
                                onPress={() => setEmployeeDropdownOpen((v) => !v)}
                                className="border border-black/20 rounded-xl px-3 py-3 flex-row items-center justify-between"
                            >
                                <Text className="text-[#111827]">
                                    {(() => {
                                        const emp = deptEmployees.find((e) => e.user_id === selectedEmployeeId);
                                        return emp?.full_name?.trim()
                                            ? emp.full_name
                                            : emp?.email ?? "Обрати співробітника";
                                    })()}
                                </Text>

                                <Text className="text-black/50">
                                    {employeeDropdownOpen ? "▲" : "▼"}
                                </Text>
                            </Pressable>
                            {employeeDropdownOpen ? (
                                <View className="mt-2 border border-black/10 rounded-xl max-h-60 overflow-hidden">
                                    <ScrollView>
                                        {deptEmployees.map((e) => {
                                            const label = e.full_name?.trim() ? e.full_name : e.email;
                                            const selected = e.user_id === selectedEmployeeId;

                                            return (
                                                <Pressable
                                                    key={e.user_id}
                                                    onPress={() => {
                                                        setSelectedEmployeeId(e.user_id);
                                                        setEmployeeDropdownOpen(false);
                                                    }}
                                                    className={`px-3 py-3 ${
                                                        selected ? "bg-black/10" : "bg-white"
                                                    }`}
                                                >
                                                    <Text className="text-[#111827]">{label}</Text>
                                                </Pressable>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            ) : null}
                        </>
                    )}
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
                {loading ? (
                    <View className="py-8 items-center absolute inset-0 justify-center bg-white/60 rounded-2xl">
                        <ActivityIndicator />
                        <Text className="text-black/70 mt-3">Завантаження…</Text>
                    </View>
                ) : errorText ? (
                    <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
                        <Text className="text-red-700">{errorText}</Text>
                        <Pressable onPress={() => loadMonth(monthYM)} className="mt-3 bg-black/10 px-4 py-3 rounded-xl">
                            <Text className="text-[#111827]">Спробувати ще</Text>
                        </Pressable>
                    </View>
                ) : null}
            </View>

            <View className="mt-4 bg-white border border-black/10 rounded-2xl p-4">
                <Text className="text-[#111827] text-lg font-semibold">{selectedDate}</Text>

                <Text className="text-black/70 mt-2">
                    {selectedEntry
                        ? selectedEntry.type === "shift" || selectedEntry.type === "trip"
                            ? `${selectedEntry.title}: ${selectedEntry.start_time ?? "?"} – ${selectedEntry.end_time ?? "?"}`
                            : `${selectedEntry.title}`
                        : "Немає запису на цей день"}
                </Text>

                {isManager ? (
                    <Pressable
                        onPress={() => {
                            // TODO: bottom sheet / modal для встановлення типу дня + часів
                        }}
                        className="mt-4 bg-black/10 px-4 py-3 rounded-xl"
                    >
                        <Text className="text-[#111827]">Додати / змінити</Text>
                    </Pressable>
                ) : null}
            </View>

        </SafeAreaView>
    );
}

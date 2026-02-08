import React, { useState, useEffect, useMemo } from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '@/app/(auth)/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import { createServiceRequest } from '@/lib/api/services';
import { getMySchedule } from '@/lib/api/schedule';
import { bgForEntry, pad2, todayISO, ymFromDate } from '@/lib/schedule/utils';
import { ScheduleEntry } from '@/lib/schedule/types';
import {SafeAreaView} from "react-native-safe-area-context";

interface ScheduleRequestProps {
    onBack: () => void;
}

const ScheduleRequest: React.FC<ScheduleRequestProps> = ({ onBack }) => {
    const { token } = useAuth();
    const [requestType, setRequestType] = useState<'off' | 'vacation' | 'sick'>('off');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
    const [currentMonth, setCurrentMonth] = useState(ymFromDate(todayISO()));

    useEffect(() => {
        if (token) {
            fetchSchedule(currentMonth);
        }
    }, [currentMonth, token]);

    const fetchSchedule = async (month: string) => {
        try {
            const entries = await getMySchedule(API_BASE_URL, token!, month);
            setScheduleEntries(entries);
        } catch (e) {
            console.error("Error fetching schedule:", e);
        }
    };

    const markedDates = useMemo(() => {
        const marks: any = {};

        // 1. Поточний графік
        scheduleEntries.forEach(entry => {
            marks[entry.date] = {
                customStyles: {
                    container: { backgroundColor: bgForEntry(entry), borderRadius: 10 },
                    text: { color: "#111827", fontWeight: "600" },
                },
            };
        });

        // 2. Вибраний період
        if (startDate) {
            const periodDates = !endDate ? [startDate] : getPeriodArray(startDate, endDate);
            
            periodDates.forEach(date => {
                const isEdge = date === startDate || date === endDate;
                const prev = marks[date] ?? {};
                
                marks[date] = {
                    ...prev,
                    customStyles: {
                        container: {
                            ...(prev.customStyles?.container ?? {}),
                            backgroundColor: isEdge ? '#2196F3' : '#E3F2FD',
                            borderWidth: isEdge ? 0 : 1,
                            borderColor: '#2196F3',
                            borderRadius: 10,
                        },
                        text: {
                            ...(prev.customStyles?.text ?? {}),
                            color: isEdge ? '#FFFFFF' : '#111827',
                            fontWeight: '700',
                        },
                    },
                };
            });
        }

        return marks;
    }, [scheduleEntries, startDate, endDate]);

    const handleSubmit = async () => {
        if (!startDate || !endDate) {
            Alert.alert("Помилка", "Будь ласка, оберіть період");
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            Alert.alert("Помилка", "Дата початку не може бути пізніше дати закінчення");
            return;
        }

        setLoading(true);
        try {
            await createServiceRequest(API_BASE_URL, token!, {
                type: requestType,
                start_date: startDate,
                end_date: endDate,
            });
            Alert.alert("Успіх", "Заявку успішно створено");
            onBack();
        } catch (e: any) {
            Alert.alert("Помилка", e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#f5f5f5] px-5 pt-3" edges={['top']}>
            <View className="flex-row items-center mb-[20px]">
                <TouchableOpacity onPress={onBack} className="mr-[15px]">
                    <MaterialIcons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-[20px] font-bold">Заявка на зміну графіку</Text>
            </View>
            <View className="pb-10">
                <View className="bg-white rounded-[15px] p-[15px] mb-5">
                    <Text className="text-[16px] font-semibold mb-[10px]">Тип заявки:</Text>
                    <View className="flex-row justify-between">
                        {(['off', 'vacation', 'sick'] as const).map((type) => (
                            <TouchableOpacity
                                key={type}
                                className={`flex-1 py-[10px] items-center rounded-[10px] border border-[#ddd] mx-[5px] ${
                                    requestType === type ? 'bg-[#2196F3] border-[#2196F3]' : ''
                                }`}
                                onPress={() => setRequestType(type)}
                            >
                                <Text className={`text-[12px] ${
                                    requestType === type ? 'text-white font-bold' : 'text-[#666]'
                                }`}>
                                    {type === 'off' ? 'Вихідний' : type === 'vacation' ? 'Відпустка' : 'Лікарняний'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View className="bg-white border border-black/10 rounded-2xl p-3 mb-5">
                    <Text className="text-[16px] font-semibold mb-[10px] px-2">Оберіть період:</Text>
                    <Calendar
                        onDayPress={(day) => {
                            if (!startDate || (startDate && endDate)) {
                                setStartDate(day.dateString);
                                setEndDate('');
                            } else {
                                if (day.dateString < startDate) {
                                    setStartDate(day.dateString);
                                    setEndDate('');
                                } else {
                                    setEndDate(day.dateString);
                                }
                            }
                        }}
                        onMonthChange={(month) => {
                            setCurrentMonth(`${month.year}-${pad2(month.month)}`);
                        }}
                        markedDates={markedDates}
                        markingType={'custom'}
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
                    {(startDate || endDate) && (
                        <View className="mt-[15px] pt-[15px] border-t border-[#eee] px-2">
                            <Text className="text-black/70">Початок: <Text className="font-semibold text-[#111827]">{startDate || '-'}</Text></Text>
                            <Text className="text-black/70">Кінець: <Text className="font-semibold text-[#111827]">{endDate || '-'}</Text></Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    className={`bg-emerald-600/90 border border-emerald-700/60 py-4 rounded-2xl items-center mt-2 ${
                        loading ? 'bg-emerald-300' : ''
                    }`}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-[16px] font-bold">Зберегти заявку</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const getPeriodArray = (start: string, end: string) => {
    const dates: string[] = [];
    let current = new Date(start);
    const stop = new Date(end);
    while (current <= stop) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

export default ScheduleRequest;

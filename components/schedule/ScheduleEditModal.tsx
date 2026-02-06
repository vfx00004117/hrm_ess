import React, { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { EntryType, ScheduleEntry } from "@/lib/schedule/types";
import {MaterialIcons} from "@expo/vector-icons";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSave: (payload: {
        type: EntryType;
        start_time?: string | null;
        end_time?: string | null;
        title?: string | null;
    }) => void;
    onDelete: () => void;
    entry: ScheduleEntry | null;
    date: string;
};

const TYPES: { label: string; value: EntryType }[] = [
    { label: "Зміна", value: "shift" },
    { label: "Вихідний", value: "off" },
    { label: "Відпустка", value: "vacation" },
    { label: "Лікарняний", value: "sick" },
    { label: "Відрядження", value: "trip" },
    { label: "Інше", value: "other" },
];

export function ScheduleEditModal({
    visible,
    onClose,
    onSave,
    onDelete,
    entry,
    date,
}: Props) {
    const [type, setType] = useState<EntryType>("shift");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [title, setTitle] = useState("");

    useEffect(() => {
        if (visible) {
            if (entry) {
                setType(entry.type);
                setStartTime(entry.start_time?.substring(0, 5) || "");
                setEndTime(entry.end_time?.substring(0, 5) || "");
                setTitle(entry.title || "");
            } else {
                setType("shift");
                setStartTime("09:00");
                setEndTime("18:00");
                setTitle("");
            }
        }
    }, [visible, entry]);

    const handleSave = () => {
        if (type === "shift") {
            if (!startTime.trim() || !endTime.trim()) {
                Alert.alert("Помилка", "Для зміни необхідно вказати час початку та кінця");
                return;
            }
        }

        const needsTime = type === "shift" || type === "trip";
        onSave({
            type,
            start_time: needsTime ? startTime.trim() : null,
            end_time: needsTime ? endTime.trim() : null,
            title: title.trim() || null,
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}>
            <View className="flex-1 shadow">
                <Pressable
                    className="absolute inset-0"
                    onPress={onClose}/>
                <SafeAreaView style={{ flex: 1 }} edges={["bottom"]} pointerEvents="box-none">
                    <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
                        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} pointerEvents="box-none">
                            <View className="bg-white rounded-t-3xl px-6 pt-3" onStartShouldSetResponder={() => true}>
                                <View className="flex-row justify-between items-center mb-5">
                                    <View>
                                        <Text className="text-xl font-bold text-[#111827]">
                                            {entry ? "Редагувати подію" : "Додати подію"}
                                        </Text>
                                    </View>
                                    <Pressable onPress={onClose} className="p-2">
                                        <Text className="text-2xl text-black/40">✕</Text>
                                    </Pressable>
                                </View>
                                <View className="max-h-[70vh] mb-6">
                                    <Text className="text-sm font-semibold text-black/60 mb-2">Тип події</Text>
                                    <View className="flex-row flex-wrap gap-2 mb-6">
                                        {TYPES.map((t) => (
                                            <Pressable
                                                key={t.value}
                                                onPress={() => setType(t.value)}
                                                className={`px-4 py-2 rounded-xl border ${
                                                    type === t.value
                                                        ? "bg-black/10 border-black/20"
                                                        : "bg-white border-black/5"}`}>
                                                <Text className={type === t.value ? "text-black font-medium" : "text-black/60"}>
                                                    {t.label}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>

                                    {(type === "shift" || type === "trip" || type === "other") && (
                                        <>
                                            <Text className="text-sm font-semibold text-black/60 mb-2">Назва (необов'язково)</Text>
                                            <TextInput
                                                value={title}
                                                onChangeText={setTitle}
                                                placeholder="Наприклад: Ранкова зміна"
                                                className="bg-black/5 rounded-xl px-4 py-3 mb-4 text-black"/>
                                        </>
                                    )}

                                    {(type === "shift" || type === "trip") && (
                                        <View className="flex-row gap-4 mb-6">
                                            <View className="flex-1">
                                                <Text className="text-sm font-semibold text-black/60 mb-2">Початок</Text>
                                                <TextInput
                                                    value={startTime}
                                                    onChangeText={setStartTime}
                                                    placeholder="09:00"
                                                    className="bg-black/5 rounded-xl px-4 py-3 text-black"/>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-sm font-semibold text-black/60 mb-2">Кінець</Text>
                                                <TextInput
                                                    value={endTime}
                                                    onChangeText={setEndTime}
                                                    placeholder="18:00"
                                                    className="bg-black/5 rounded-xl px-4 py-3 text-black"/>
                                            </View>
                                        </View>
                                    )}

                                    <View className="mt-4 gap-3">
                                        <Pressable onPress={handleSave} className="bg-[#111827] py-4 rounded-2xl items-center">
                                            <Text className="text-white font-bold text-lg">Зберегти</Text>
                                        </Pressable>

                                        {entry && (
                                            <Pressable onPress={onDelete} className="bg-red-500/20 py-4 rounded-2xl items-center border border-red-500/20">
                                                <Text className="text-red-600 font-bold text-lg">Видалити</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

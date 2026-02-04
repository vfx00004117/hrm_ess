import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { DeptEmployee } from "@/lib/schedule/types";

type Props = {
    employees: DeptEmployee[];
    selectedEmployeeId: number | null;
    onSelect: (id: number) => void;
};

export function EmployeePicker({ employees, selectedEmployeeId, onSelect }: Props) {
    const [open, setOpen] = useState(false);

    const selectedLabel = useMemo(() => {
        const emp = employees.find((e) => e.user_id === selectedEmployeeId);
        if (!emp) return "Обрати співробітника";
        return emp.full_name?.trim() ? emp.full_name : emp.email;
    }, [employees, selectedEmployeeId]);

    if (employees.length === 0) {
        return (
            <View className="bg-white border border-black/10 rounded-2xl p-3 mb-4">
                <Text className="text-[#111827] font-semibold mb-2">Співробітник</Text>
                <Text className="text-black/60">Немає співробітників у підрозділі або підрозділ не призначений.</Text>
            </View>
        );
    }

    return (
        <View className="bg-white border border-black/10 rounded-2xl p-3 mb-4">
            <Text className="text-[#111827] font-semibold mb-2">Співробітник</Text>

            <Pressable
                onPress={() => setOpen((v) => !v)}
                className="border border-black/20 rounded-xl px-3 py-3 flex-row items-center justify-between"
            >
                <Text className="text-[#111827]">{selectedLabel}</Text>
                <Text className="text-black/50">{open ? "▲" : "▼"}</Text>
            </Pressable>

            {open ? (
                <View className="mt-2 border border-black/10 rounded-xl max-h-60 overflow-hidden">
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {employees.map((e) => {
                            const label = e.full_name?.trim() ? e.full_name : e.email;
                            const selected = e.user_id === selectedEmployeeId;

                            return (
                                <Pressable
                                    key={e.user_id}
                                    onPress={() => {
                                        onSelect(e.user_id);
                                        setOpen(false);
                                    }}
                                    className={`px-3 py-3 ${selected ? "bg-black/10" : "bg-white"}`}
                                >
                                    <Text className="text-[#111827]">{label}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            ) : null}
        </View>
    );
}

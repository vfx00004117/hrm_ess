import React, { useMemo } from "react";
import { Calendar, DateData } from "react-native-calendars";
import type { ScheduleEntry } from "@/lib/schedule/types";
import { bgForEntry, pad2, firstOfMonth, getAdjacentDate } from "@/lib/schedule/utils";

type Props = {
    monthYM: string;
    entries: ScheduleEntry[];
    selectedDate: string;
    onSelectDate: (date: string) => void;
    onChangeMonthYM: (ym: string) => void;
};

export function ScheduleCalendar({
                                     monthYM,
                                     entries,
                                     selectedDate,
                                     onSelectDate,
                                     onChangeMonthYM,
                                 }: Props) {
    const markedDates = useMemo(() => {
        const marks: Record<string, any> = {};
        const entryMap = new Map(entries.map((e) => [e.date, e]));

        for (const e of entries) {
            const prevDate = getAdjacentDate(e.date, -1);
            const nextDate = getAdjacentDate(e.date, 1);

            const isPrevSame = entryMap.get(prevDate)?.type === e.type;
            const isNextSame = entryMap.get(nextDate)?.type === e.type;

            marks[e.date] = {
                customStyles: {
                    container: {
                        backgroundColor: bgForEntry(e),
                        borderRadius: 15,
                        borderTopLeftRadius: isPrevSame ? 0 : 15,
                        borderBottomLeftRadius: isPrevSame ? 0 : 15,
                        borderTopRightRadius: isNextSame ? 0 : 15,
                        borderBottomRightRadius: isNextSame ? 0 : 15,
                        width: "100%",
                    },
                    text: { color: "#111827", fontWeight: "600" },
                },
            };
        }

        const prev = marks[selectedDate] ?? {};
        marks[selectedDate] = {
            ...prev,
            customStyles: {
                container: {
                    ...(prev.customStyles?.container ?? { borderRadius: 15 }),
                    borderWidth: 2,
                    borderColor: "#111827",
                },
                text: { ...(prev.customStyles?.text ?? {}), color: "#111827", fontWeight: "700" },
            },
        };

        return marks;
    }, [entries, selectedDate]);

    return (
        <Calendar
            current={firstOfMonth(monthYM)}
            markingType="custom"
            markedDates={markedDates}
            onDayPress={(day: DateData) => onSelectDate(day.dateString)}
            onMonthChange={(m) => onChangeMonthYM(`${m.year}-${pad2(m.month)}`)}
            firstDay={1}
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
    );
}

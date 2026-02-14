import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDeptEmployees, getEmployeeSchedule, getMySchedule } from "@/lib/api/schedule";
import type { DeptEmployee, ScheduleEntry } from "@/lib/schedule/types";
import { useErrorHandler } from "@/hooks/useErrorHandler";

type Params = {
    apiBase: string;
    token: string | null;
    isManager: boolean;
    view: "me" | "dept";
    monthYM: string;
};

/**
 * Спеціалізований хук для роботи з графіком роботи за місяць.
 * Підтримує два режими: перегляд власного графіка та перегляд графіка підлеглих (для менеджерів).
 */
export function useScheduleMonth(p: Params) {
    const {
        apiBase,
        token,
        isManager,
        view,
        monthYM,
    } = p;

    const [entries, setEntries] = useState<ScheduleEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const { errorText, handleError, clearError } = useErrorHandler();

    const [deptEmployees, setDeptEmployees] = useState<DeptEmployee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

    const abortRef = useRef<AbortController | null>(null);

    // Функція завантаження даних. Використовує AbortController для скасування попередніх запитів.
    const load = useCallback(async () => {
        if (!token) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        clearError();

        try {
            if (isManager && view === "dept") {
                // Режим менеджера: завантаження списку співробітників підрозділу та графіка обраного працівника
                let currentEmployees = deptEmployees;
                if (currentEmployees.length === 0) {
                    currentEmployees = await getDeptEmployees(apiBase, token, controller.signal);
                    setDeptEmployees(currentEmployees);
                    if (currentEmployees[0]) {
                        setSelectedEmployeeId(currentEmployees[0].user_id);
                    }
                }

                const targetId = selectedEmployeeId || currentEmployees[0]?.user_id;
                if (!targetId) {
                    setEntries([]);
                    return;
                }

                const data = await getEmployeeSchedule(
                    apiBase,
                    token,
                    targetId,
                    monthYM,
                    controller.signal
                );
                setEntries(data);
                return;
            }

            const data = await getMySchedule(apiBase, token, monthYM, controller.signal);
            setEntries(data);
        } catch (e: any) {
            handleError(e);
        } finally {
            if (abortRef.current === controller) {
                setLoading(false);
            }
        }
    }, [
        apiBase,
        token,
        isManager,
        view,
        monthYM,
        deptEmployees.length,
        selectedEmployeeId,
        handleError,
        clearError,
    ]);

    useEffect(() => {
        load();
        return () => abortRef.current?.abort();
    }, [load]);

    // Створення карти (Map) для швидкого пошуку записів за датою (YYYY-MM-DD)
    const entryByDate = useMemo(() => {
        const m = new Map<string, ScheduleEntry>();
        entries.forEach((e) => m.set(e.date, e));
        return m;
    }, [entries]);

    return {
        entries,
        entryByDate,
        loading,
        errorText,
        reload: load,
        deptEmployees,
        selectedEmployeeId,
        setSelectedEmployeeId,
    };
}

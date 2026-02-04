import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDeptEmployees, getEmployeeSchedule, getMySchedule } from "@/lib/api/schedule";
import type { DeptEmployee, ScheduleEntry } from "@/lib/schedule/types";

type Params = {
    apiBase: string;
    token: string | null;
    isManager: boolean;
    view: "me" | "dept";
    monthYM: string;

    deptEmployees: DeptEmployee[];
    setDeptEmployees: (v: DeptEmployee[]) => void;

    selectedEmployeeId: number | null;
    setSelectedEmployeeId: (v: number | null) => void;
};

export function useScheduleMonth(p: Params) {
    const {
        apiBase,
        token,
        isManager,
        view,
        monthYM,
        deptEmployees,
        setDeptEmployees,
        selectedEmployeeId,
        setSelectedEmployeeId,
    } = p;

    const [entries, setEntries] = useState<ScheduleEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const abortRef = useRef<AbortController | null>(null);

    const load = useCallback(async () => {
        if (!token) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setErrorText(null);

        try {
            if (isManager && view === "dept") {
                if (deptEmployees.length === 0) {
                    const emps = await getDeptEmployees(apiBase, token, controller.signal);
                    setDeptEmployees(emps);
                    if (emps[0]) setSelectedEmployeeId(emps[0].user_id);
                    return;
                }

                if (!selectedEmployeeId) return;

                setEntries(
                    await getEmployeeSchedule(
                        apiBase,
                        token,
                        selectedEmployeeId,
                        monthYM,
                        controller.signal
                    )
                );
                return;
            }

            setEntries(await getMySchedule(apiBase, token, monthYM, controller.signal));
        } catch (e: any) {
            if (e?.name !== "AbortError") setErrorText(e.message);
        } finally {
            setLoading(false);
        }
    }, [
        apiBase,
        token,
        isManager,
        view,
        monthYM,
        deptEmployees.length,
        selectedEmployeeId,
    ]);

    useEffect(() => {
        load();
        return () => abortRef.current?.abort();
    }, [load]);

    const entryByDate = useMemo(() => {
        const m = new Map<string, ScheduleEntry>();
        entries.forEach((e) => m.set(e.date, e));
        return m;
    }, [entries]);

    return { entries, entryByDate, loading, errorText, reload: load };
}

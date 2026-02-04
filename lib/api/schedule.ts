import type { DeptEmployee, ScheduleEntry } from "../schedule/types";

export async function fetchJson<T>(
    url: string,
    token: string,
    signal?: AbortSignal
): Promise<T> {
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
        signal,
    });

    if (res.status === 401) throw new Error("Сесія завершилась");
    if (!res.ok) throw new Error(`Помилка ${res.status}`);

    return res.json();
}

export async function getMySchedule(
    base: string,
    token: string,
    ym: string,
    signal?: AbortSignal
) {
    const data = await fetchJson<{ entries: ScheduleEntry[] }>(
        `${base}/schedule/me?month=${ym}`,
        token,
        signal
    );
    return data.entries ?? [];
}

export async function getEmployeeSchedule(
    base: string,
    token: string,
    employeeId: number,
    ym: string,
    signal?: AbortSignal
) {
    const data = await fetchJson<{ entries: ScheduleEntry[] }>(
        `${base}/schedule/${employeeId}?month=${ym}`,
        token,
        signal
    );
    return data.entries ?? [];
}

export async function getDeptEmployees(
    base: string,
    token: string,
    signal?: AbortSignal
) {
    return fetchJson<DeptEmployee[]>(
        `${base}/department/employees`,
        token,
        signal
    );
}

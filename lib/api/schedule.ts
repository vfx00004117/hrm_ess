import { fetchJson, handleResponseError } from "./client";
import type { DeptEmployee, ScheduleEntry } from "../schedule/types";

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

export async function upsertDaySchedule(
    base: string,
    token: string,
    payload: {
        date: string;
        type: string;
        start_time?: string | null;
        end_time?: string | null;
        title?: string | null;
    },
    targetUserId?: number | null
) {
    const url = targetUserId
        ? `${base}/schedule/day/${targetUserId}`
        : `${base}/schedule/day/me`;

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        await handleResponseError(res);
    }

    return res.json();
}

export async function deleteDaySchedule(
    base: string,
    token: string,
    date: string,
    targetUserId?: number | null
) {
    const url = targetUserId
        ? `${base}/schedule/delete/${targetUserId}?date=${date}`
        : `${base}/schedule/delete/me?date=${date}`;

    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    });

    if (!res.ok) {
        await handleResponseError(res);
    }

    return res.json();
}

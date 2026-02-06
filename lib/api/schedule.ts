import type { DeptEmployee, ScheduleEntry } from "../schedule/types";

async function handleResponseError(res: Response) {
    if (res.status === 401) throw new Error("Сесія завершилась");

    let message = `Помилка ${res.status}`;
    try {
        const data = await res.json();
        if (data.detail) {
            if (typeof data.detail === "string") {
                message = data.detail;
            } else if (Array.isArray(data.detail)) {
                message = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
            } else {
                message = JSON.stringify(data.detail);
            }
        }
    } catch {
        // ignore parsing error, use default message
    }
    throw new Error(message);
}

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

    if (!res.ok) {
        await handleResponseError(res);
    }

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
        ? `${base}/schedule/day/${targetUserId}?date=${date}`
        : `${base}/schedule/day/me?date=${date}`;

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

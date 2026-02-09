import { fetchJson, handleResponseError } from "./client";

export type ProfileOut = {
    email: string;
    full_name: string | null;
    birth_date: string | null;
    employee_number: string | null;
    position: string | null;
    work_start_date: string | null;
    department_name: string | null;
};

export async function getMyProfile(
    base: string,
    token: string,
    signal?: AbortSignal
): Promise<ProfileOut> {
    return fetchJson<ProfileOut>(`${base}/employee/profile/me`, token, signal);
}

export async function getEmployeeProfile(
    base: string,
    token: string,
    id: number,
    signal?: AbortSignal
): Promise<ProfileOut> {
    return fetchJson<ProfileOut>(`${base}/employee/profile/${id}`, token, signal);
}

export async function updateEmployeeProfile(
    base: string,
    token: string,
    id: number,
    payload: Partial<Omit<ProfileOut, 'email' | 'department_name'>>
) {
    const res = await fetch(`${base}/employee/profile/add/${id}`, {
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

import { fetchJson } from "./client";

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

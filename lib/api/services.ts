import { fetchJson, handleResponseError } from "./client";

export interface ServiceRequest {
    id: number;
    user_id: number;
    user_email?: string;
    user_full_name?: string;
    type: "off" | "vacation" | "sick";
    start_date: string;
    end_date: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
}

export async function createServiceRequest(
    base: string,
    token: string,
    payload: {
        type: string;
        start_date: string;
        end_date: string;
    }
) {
    const res = await fetch(`${base}/service-requests`, {
        method: "POST",
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

export async function getMyServiceRequests(
    base: string,
    token: string
): Promise<ServiceRequest[]> {
    return fetchJson<ServiceRequest[]>(`${base}/service-requests/me`, token);
}

export async function getAllServiceRequests(
    base: string,
    token: string
): Promise<ServiceRequest[]> {
    return fetchJson<ServiceRequest[]>(`${base}/service-requests`, token);
}

export async function updateServiceRequestStatus(
    base: string,
    token: string,
    requestId: number,
    status: "approved" | "rejected"
) {
    const res = await fetch(`${base}/service-requests/${requestId}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({ status }),
    });

    if (!res.ok) {
        await handleResponseError(res);
    }

    return res.json();
}

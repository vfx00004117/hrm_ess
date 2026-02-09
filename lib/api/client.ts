import { AuthError, NetworkError } from "../errors";

export async function handleResponseError(res: Response) {
    if (res.status === 401) throw new AuthError();

    let message = `Помилка ${res.status}`;
    let detail: any = null;
    try {
        const data = await res.json();
        detail = data.detail;
        if (detail) {
            if (typeof detail === "string") {
                message = detail;
            } else if (Array.isArray(detail)) {
                message = detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
            } else {
                message = JSON.stringify(detail);
            }
        }
    } catch {
        // ignore parsing error, use default message
    }
    throw new NetworkError(message, res.status, detail);
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

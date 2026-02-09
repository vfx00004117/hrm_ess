export async function handleResponseError(res: Response) {
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

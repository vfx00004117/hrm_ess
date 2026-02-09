import { handleResponseError } from "./client";
import { AuthError } from "../errors";

export interface LoginResponse {
    accessToken: string;
    tokenType: string;
}

export async function login(
    base: string,
    payload: { email: string; password: string }
): Promise<LoginResponse> {
    const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        if (res.status === 401) {
            throw new AuthError("Невірний email або пароль");
        }
        await handleResponseError(res);
    }

    return res.json();
}

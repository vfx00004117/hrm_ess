import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "access_token";

export async function getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearAccessToken() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export function decodeJwtPayload(token: string): any | null {
    try {
        const payloadPart = token.split(".")[1];
        const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
            atob(normalized)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function isTokenExpired(token: string) {
    const payload = decodeJwtPayload(token);
    const exp = payload?.exp;
    if (!exp) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    return nowSec >= exp;
}
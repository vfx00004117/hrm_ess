import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "access_token";

export async function getAccessToken() {
    if (Platform.OS === "web") {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string) {
    if (Platform.OS === "web") {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        return;
    }
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearAccessToken() {
    if (Platform.OS === "web") {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        return;
    }
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
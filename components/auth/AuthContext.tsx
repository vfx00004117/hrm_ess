import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearAccessToken, decodeJwtPayload, getAccessToken, isTokenExpired, setAccessToken } from "../../lib/api/auth";

type Role = "employee" | "manager";

type AuthState = {
    isReady: boolean;
    token: string | null;
    role: Role | null;
    userId: number | null;
    signIn: (token: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * Провайдер контексту авторизації.
 * Відповідає за збереження токена, визначення ролі користувача (співробітник/менеджер)
 * та надання методів для входу та виходу.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [userId, setUserId] = useState<number | null>(null);

    // Ініціалізація стану при запуску додатка: перевірка наявності та валідності збереженого токена
    useEffect(() => {
        (async () => {
            const stored = await getAccessToken();
            if (stored && !isTokenExpired(stored)) {
                setToken(stored);
                const payload = decodeJwtPayload(stored);
                setRole((payload?.role ?? payload?.roles?.[0] ?? null) as Role | null);
                setUserId(payload?.uid ? Number(payload.uid) : null);
            } else {
                setToken(null);
                setRole(null);
                setUserId(null);
            }
            setIsReady(true);
        })();
    }, []);

    const value = useMemo<AuthState>(() => ({
        isReady,
        token,
        role,
        userId,
        signIn: async (newToken: string) => {
            // Зберігаємо новий токен та оновлюємо стан профілю
            await setAccessToken(newToken);
            setToken(newToken);
            const payload = decodeJwtPayload(newToken);
            setRole((payload?.role ?? payload?.roles?.[0] ?? null) as Role | null);
            setUserId(payload?.uid ? Number(payload.uid) : null);
        },
        signOut: async () => {
            // Очищаємо дані при виході
            await clearAccessToken();
            setToken(null);
            setRole(null);
            setUserId(null);
        },
    }), [isReady, token, role, userId]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Хук для зручного доступу до контексту авторизації.
 * @throws Помилка, якщо хук використовується поза AuthProvider.
 */
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

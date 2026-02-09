import { useState, useCallback } from 'react';
import { AppError } from '@/lib/errors';

export function useErrorHandler() {
    const [error, setError] = useState<AppError | null>(null);

    const handleError = useCallback((e: any, fallbackMessage?: string) => {
        if (e?.name === 'AbortError') return null;
        
        let appError: AppError;
        if (e instanceof AppError) {
            appError = e;
        } else {
            appError = new AppError(e?.message || fallbackMessage || 'Сталася невідома помилка', 'UNKNOWN', e);
        }
        
        setError(appError);
        return appError;
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return {
        error,
        errorText: error?.message ?? null,
        handleError,
        clearError,
        setError
    };
}

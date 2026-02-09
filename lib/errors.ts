export class AppError extends Error {
    constructor(public message: string, public code?: string, public originalError?: any) {
        super(message);
        this.name = 'AppError';
    }
}

export class NetworkError extends AppError {
    constructor(message: string = 'Проблема з мережею', public status?: number, data?: any) {
        super(message, 'NETWORK_ERROR', data);
        this.name = 'NetworkError';
    }
}

export class AuthError extends AppError {
    constructor(message: string = 'Сесія завершилась') {
        super(message, 'AUTH_ERROR');
        this.name = 'AuthError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, data?: any) {
        super(message, 'VALIDATION_ERROR', data);
        this.name = 'ValidationError';
    }
}

export function isAppError(error: any): error is AppError {
    return error instanceof AppError;
}

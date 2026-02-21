
/**
 * Centralized error handling for network requests.
 * Translates technical errors into user-friendly messages.
 */

export const getFriendlyErrorMessage = (rawError: any): string => {
    if (!rawError) return "Error desconocido.";
    
    const msg = rawError.message || String(rawError);
    
    // Network/Fetch Errors
    if (
        msg.includes('Failed to fetch') || 
        msg.includes('NetworkError') || 
        msg.includes('fetch') ||
        msg.includes('Load failed') ||
        msg.includes('TypeError: Failed to fetch')
    ) {
        return "Conexión interrumpida con el servidor. Verifique su conexión a internet.";
    }
    
    // Auth Errors
    if (msg.includes('JWT') || msg.includes('token') || msg.includes('session expired') || msg.includes('invalid_grant')) {
        return "Su sesión ha caducado. Por favor, inicie sesión de nuevo.";
    }
    
    // Database/Supabase Errors
    if (msg.includes('PGRST') || msg.includes('PostgREST')) {
        return "Error de base de datos. El servicio podría estar en mantenimiento.";
    }

    if (msg.includes('42P01') || msg.includes('relation') || msg.includes('does not exist')) {
        return "Error de esquema: Tabla no encontrada. Modo de demostración activo.";
    }
    
    return msg || "Error inesperado.";
};

/**
 * Checks if an error is a network-related failure that should trigger mock data fallback.
 */
export const isNetworkError = (error: any): boolean => {
    const msg = error?.message || String(error);
    return (
        msg.includes('fetch') || 
        msg.includes('NetworkError') || 
        msg.includes('Failed to fetch') ||
        msg.includes('Load failed')
    );
};

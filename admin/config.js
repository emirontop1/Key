export const API_BASE = process.env.REACT_APP_API_URL || window.location.origin;

export const supabase = {
    // Frontend'den doğrudan Supabase kullanmayacağız
    // Backend aracılığıyla gidecek
};

export const CONFIG = {
    API_BASE,
    RATE_LIMIT_DELAY: 500, // ms
};

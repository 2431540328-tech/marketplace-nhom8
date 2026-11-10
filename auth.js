// auth.js
(function (global) {
    const TOKEN_KEY = 'mkt_token';
    const USER_KEY  = 'mkt_user';

    function saveAuth(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function getUser() {
        try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
        catch { return null; }
    }

    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = 'login.html'; // Đá về trang login
    }

    function apiFetch(url, options = {}) {
        const headers = { ...(options.headers || {}) };
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (options.body && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        return fetch(url, { ...options, headers });
    }

    // Hàm bảo vệ trang: Kiểm tra xem có được phép vào trang này không
    function requireAuth(allowedRoles = []) {
        const user = getUser();
        if (!user || !getToken()) {
            window.location.href = 'login.html'; // Chưa đăng nhập -> về login
            return null;
        }
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            alert('Bạn không có quyền truy cập trang này!');
            // Đá về đúng trang của role đó
            if (user.role === 'Admin') window.location.href = 'admin.html';
            else if (user.role === 'Seller') window.location.href = 'seller.html';
            else window.location.href = 'buyer.html';
            return null;
        }
        return user;
    }

    global.Auth = { saveAuth, getToken, getUser, logout, apiFetch, requireAuth };
})(window);
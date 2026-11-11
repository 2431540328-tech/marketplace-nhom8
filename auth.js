// auth.js - Quản lý JWT Token, Phân quyền (RBAC) & Điều hướng thông minh
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
        window.location.href = 'index.html'; // Đăng xuất về trang chủ khách vãng lai
    }

    function getDashboardByRole(role) {
        if (role === 'Admin') return 'admin.html';
        if (role === 'Seller') return 'seller.html';
        return 'buyer.html';
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

    // Bảo vệ các trang cần đăng nhập (buyer.html, seller.html, admin.html)
    function requireAuth(allowedRoles = []) {
        const user = getUser();
        if (!user || !getToken()) {
            window.location.href = 'login.html';
            return null;
        }
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            alert('Bạn không có quyền truy cập phân hệ này!');
            window.location.href = getDashboardByRole(user.role);
            return null;
        }
        return user;
    }

    global.Auth = { saveAuth, getToken, getUser, logout, getDashboardByRole, apiFetch, requireAuth };
})(window);
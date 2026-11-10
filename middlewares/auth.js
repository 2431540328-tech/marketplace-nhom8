// middlewares/auth.js
const { verifyToken } = require('../utils/jwt');

// 1. Kiểm tra xem user đã đăng nhập chưa (có token hợp lệ không)
function authenticate(req, res, next) {
    // Lấy header Authorization từ request gửi lên
    const authHeader = req.headers.authorization || '';
    
    // Header chuẩn thường có dạng: "Bearer eyJhbGciOi..."
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Lỗi: Bạn chưa đăng nhập (Thiếu token)' });
    }

    try {
        // Giải mã token
        const decoded = verifyToken(token);
        req.user = decoded; // Lưu thông tin user vào request để các API sau dùng
        next(); // Cho phép đi tiếp vào API
    } catch (err) {
        return res.status(401).json({ error: 'Lỗi: Token không hợp lệ hoặc đã hết hạn' });
    }
}

// 2. Kiểm tra quyền (Role)
// Ví dụ: requireRole('Admin') -> Chỉ Admin mới được đi tiếp
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Lỗi: Chưa xác thực' });
        }
        
        // Nếu role của user không nằm trong danh sách được phép
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Lỗi: Bạn không có quyền truy cập. Yêu cầu quyền: ${allowedRoles.join(', ')}`
            });
        }
        next(); // Đủ quyền -> Cho đi tiếp
    };
}

module.exports = { authenticate, requireRole };
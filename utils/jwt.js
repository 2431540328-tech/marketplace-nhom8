// utils/jwt.js
const jwt = require('jsonwebtoken');

// Lấy chìa khóa bí mật từ file .env (ở bước 1.2)
const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!SECRET) {
    throw new Error('[LỖI] Thiếu JWT_SECRET trong file .env');
}

// Hàm tạo token mới (dùng khi đăng nhập thành công)
function signToken(payload) {
    // payload thường chứa: userId, username, role
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

// Hàm kiểm tra token (dùng khi user gọi API)
function verifyToken(token) {
    return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
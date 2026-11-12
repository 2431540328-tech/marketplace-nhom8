// server.js - Phiên bản Nâng Cấp Toàn Diện Sàn TMĐT Đa Người Bán (Nhóm 08)
require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const { signToken } = require('./utils/jwt');
const { authenticate, requireRole } = require('./middlewares/auth');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/marketplace_db';
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('[INFO] Đã kết nối thành công CSDL: marketplace_db');
        seedInitialData();
    })
    .catch(err => console.error('[ERROR] Lỗi kết nối CSDL:', err));

// ==========================================
// 1. SCHEMAS MỞ RỘNG
// ==========================================
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    password_hash: { type: String, required: true },
    email: String,
    full_name: String,
    phone: String,
    address: { type: String, default: 'Quận Tân Bình, TP. Hồ Chí Minh' }, // [ĐÃ THÊM]
    role: { type: String, enum: ['Buyer', 'Seller', 'Admin'], default: 'Buyer' },
    status: { type: String, enum: ['Active', 'Banned', 'Pending_KYC'], default: 'Active' },
    createdAt: { type: Date, default: Date.now }
}), 'users');

const Shop = mongoose.model('Shop', new mongoose.Schema({
    shop_name: String,
    owner_name: String,
    description: String,
    rating: { type: Number, default: 4.8 },
    status: { type: String, default: 'Chờ duyệt' }, // Active, Chờ duyệt, Đã khóa
    commissionRate: { type: Number, default: 5 },
    visits: { type: Number, default: 1280 },
    shippingFee: { type: Number, default: 25000 },
    shippingPartners: { type: [String], default: ['Giao Hàng Nhanh (GHN)', 'Giao Hàng Tiết Kiệm (GHTK)', 'Viettel Post'] },
    packagingNote: { type: String, default: 'Bọc chống sốc 2 lớp, niêm phong tem vỡ' }
}), 'shops');

const Category = mongoose.model('Category', new mongoose.Schema({
    category_name: String,
    slug: String,
    description: String,
    icon: String,
    commissionFee: { type: Number, default: 5 } // Phí hoa hồng riêng theo ngành hàng (%)
}), 'categories');

const Product = mongoose.model('Product', new mongoose.Schema({
    productName: String,
    price: Number,
    description: { type: String, default: 'Sản phẩm chính hãng chất lượng cao, bảo hành đổi trả trong 7 ngày.' },
    category: String,
    shopName: String,
    quantity: { type: Number, default: 20 },
    rating: { type: Number, default: 4.5 },
    images: { type: [String], default: [] },
    isBestSeller: { type: Boolean, default: false },
    allowBargain: { type: Boolean, default: true },
    approvalStatus: { type: String, enum: ['Đã duyệt', 'Chờ duyệt', 'Từ chối'], default: 'Đã duyệt' },
    flashSaleDiscount: { type: Number, default: 0 }, // % giảm Flash Sale
    campaignName: { type: String, default: '' }
}), 'products');

const Cart = mongoose.model('Cart', new mongoose.Schema({
    user_id: { type: String, required: true, unique: true }, 
    items: [{
        product_id: String,
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 },
        image: String,
        shopName: String,
        isBargained: { type: Boolean, default: false }
    }]
}), 'carts');

const Order = mongoose.model('Order', new mongoose.Schema({
    buyerName: String,
    shopName: String,
    productName: String,
    totalAmount: Number,
    platformFee: { type: Number, default: 0 },
    sellerNet: { type: Number, default: 0 },
    buyingMode: { type: String, default: 'Mua lẻ' },
    paymentMethod: String,
    shippingCarrier: { type: String, default: 'Giao Hàng Nhanh (GHN)' },
    trackingCode: { type: String, default: '' },
    returnReason: { type: String, default: '' },
    status: { type: String, default: 'Chờ duyệt' }, // Chờ duyệt, Đang chuẩn bị hàng, Đang giao hàng, Đã hoàn thành, Yêu cầu đổi trả/hoàn tiền, Đã hoàn tiền, Hủy đơn
    createdAt: { type: Date, default: Date.now }
}), 'orders');

const Review = mongoose.model('Review', new mongoose.Schema({
    buyerName: String,
    productName: String,
    shopName: String,
    rating: Number,
    comment: String,
    createdAt: { type: Date, default: Date.now }
}), 'reviews');

const Bargain = mongoose.model('Bargain', new mongoose.Schema({
    buyerName: String,
    productId: String,
    productName: String,
    shopName: String,
    originalPrice: Number,
    offeredPrice: Number,
    status: { type: String, default: 'Chờ Shop duyệt' },
    createdAt: { type: Date, default: Date.now }
}), 'bargains');

// Schema Rút Tiền (Withdrawal)
const Withdrawal = mongoose.model('Withdrawal', new mongoose.Schema({
    shopName: String,
    sellerUsername: String,
    amount: Number,
    bankInfo: String,
    status: { type: String, enum: ['Chờ duyệt', 'Đã chuyển khoản', 'Từ chối'], default: 'Chờ duyệt' },
    createdAt: { type: Date, default: Date.now }
}), 'withdrawals');

// Schema Khuyến Mãi & Chiến dịch (Promotion)
const Promotion = mongoose.model('Promotion', new mongoose.Schema({
    title: String,
    code: String,
    discountPercent: Number,
    type: { type: String, enum: ['Platform_Campaign', 'Platform_Voucher', 'Shop_Voucher'], default: 'Platform_Campaign' },
    shopName: { type: String, default: 'Toàn sàn' },
    status: { type: String, default: 'Đang diễn ra' },
    createdAt: { type: Date, default: Date.now }
}), 'promotions');

// Schema Tin Nhắn CSKH (ChatMessage)
const ChatMessage = mongoose.model('ChatMessage', new mongoose.Schema({
    shopName: String,
    buyerName: String,
    senderRole: { type: String, enum: ['Buyer', 'Seller'], default: 'Buyer' },
    productName: String,
    message: String,
    createdAt: { type: Date, default: Date.now }
}), 'chat_messages');

// Schema Cấu Hình Hệ Thống (SystemConfig)
const SystemConfig = mongoose.model('SystemConfig', new mongoose.Schema({
    platformName: { type: String, default: 'PinkyMart - Sàn TMĐT Đa Người Bán' },
    logoText: { type: String, default: '🌸 PINKYMART' },
    homepageBannerTitle: { type: String, default: 'SIÊU SALE HỒNG PHẤN 11/11 - GIẢM ĐẾN 50%' },
    homepageTheme: { type: String, default: 'Pastel Pink (#f4acb7 - #cdb4db)' },
    defaultCommission: { type: Number, default: 5 },
    paymentGateways: {
        cod: { type: Boolean, default: true },
        momo: { type: Boolean, default: true },
        vnpay: { type: Boolean, default: true },
        visa: { type: Boolean, default: true }
    }
}), 'system_configs');

function getDefaultProductImage(productName = '', category = '') {
    const name = productName.toLowerCase();
    if (name.includes('tai nghe')) return 'https://cdn-icons-png.flaticon.com/512/5906/5906125.png';
    if (name.includes('sạc')) return 'https://cdn-icons-png.flaticon.com/512/3103/3103446.png';
    if (name.includes('hoodie') || name.includes('áo')) return 'https://cdn-icons-png.flaticon.com/512/2503/2503380.png';
    if (name.includes('iphone') || name.includes('điện thoại')) return 'https://cdn-icons-png.flaticon.com/512/644/644458.png';
    if (name.includes('túi')) return 'https://cdn-icons-png.flaticon.com/512/2821/2821807.png';
    if (category === 'Công nghệ' || category === 'Điện thoại') return 'https://cdn-icons-png.flaticon.com/512/3659/3659899.png';
    if (category === 'Thời trang') return 'https://cdn-icons-png.flaticon.com/512/3050/3050253.png';
    return 'https://cdn-icons-png.flaticon.com/512/679/679821.png';
}

function getDefaultCategoryIcon(catName = '') {
    const name = catName.toLowerCase();
    if (name.includes('điện') || name.includes('công nghệ')) return 'https://cdn-icons-png.flaticon.com/512/3659/3659899.png';
    if (name.includes('thời trang')) return 'https://cdn-icons-png.flaticon.com/512/3050/3050253.png';
    if (name.includes('phụ kiện') || name.includes('gia dụng')) return 'https://cdn-icons-png.flaticon.com/512/2821/2821807.png';
    return 'https://cdn-icons-png.flaticon.com/512/3502/3502601.png';
}

// ==========================================
// 2. SEED DATA
// ==========================================
async function seedInitialData() {
    try {
        if (await User.countDocuments() === 0) {
            const seedUsers = [
                { username: 'nguyenvana', password: '123456', email: 'vana@gmail.com', full_name: 'Nguyễn Văn A', phone: '0901234567', role: 'Buyer', status: 'Active' },
                { username: 'tranthib', password: '123456', email: 'thib@gmail.com', full_name: 'Trần Thị B', phone: '0902345678', role: 'Buyer', status: 'Active' },
                { username: 'shop_techzone', password: '123456', email: 'techzone@gmail.com', full_name: 'Lê Thị B (Chủ Shop Nhóm 8)', phone: '0988888888', role: 'Seller', status: 'Active' },
                { username: 'seller_new', password: '123456', email: 'newshop@gmail.com', full_name: 'Phạm Văn C (Seller Mới)', phone: '0977777777', role: 'Seller', status: 'Pending_KYC' },
                { username: 'admin_system', password: 'admin123', email: 'admin@marketplace.com', full_name: 'Quản Trị Viên Sàn', phone: '0999999999', role: 'Admin', status: 'Active' }
            ];
            for (const u of seedUsers) {
                const hash = await bcrypt.hash(u.password, 10);
                await User.create({ ...u, password_hash: hash });
            }
        }

        if (await Shop.countDocuments() === 0) {
            await Shop.insertMany([
                { shop_name: 'Shop Nhóm 8', owner_name: 'shop_techzone', description: 'Thời trang & Phụ kiện Local Brand chính hãng', rating: 4.9, status: 'Active', commissionRate: 5, visits: 2450, shippingFee: 25000 },
                { shop_name: 'Gia Han phone', owner_name: 'shop_techzone', description: 'Chuyên iPhone & Thiết bị công nghệ cao cấp', rating: 5.0, status: 'Active', commissionRate: 4, visits: 1890, shippingFee: 30000 },
                { shop_name: 'Gian hàng chung', owner_name: 'shop_techzone', description: 'Phụ kiện điện tử thông minh giá tốt', rating: 4.6, status: 'Active', commissionRate: 5, visits: 980, shippingFee: 20000 },
                { shop_name: 'Kem Cosmetics Store', owner_name: 'seller_new', description: 'Mỹ phẩm skincare chính hãng Hàn Quốc', rating: 4.8, status: 'Chờ duyệt', commissionRate: 6, visits: 120, shippingFee: 22000 }
            ]);
        }

        if (await Category.countDocuments() === 0) {
            await Category.insertMany([
                { category_name: 'Công nghệ', slug: 'cong-nghe', description: 'Điện thoại, tai nghe, phụ kiện máy tính', icon: 'https://cdn-icons-png.flaticon.com/512/3659/3659899.png', commissionFee: 4 },
                { category_name: 'Thời trang', slug: 'thoi-trang', description: 'Quần áo, giày dép, hoodie local brand', icon: 'https://cdn-icons-png.flaticon.com/512/3050/3050253.png', commissionFee: 6 },
                { category_name: 'Phụ kiện', slug: 'phu-kien', description: 'Túi canvas, balo, phụ kiện cá nhân', icon: 'https://cdn-icons-png.flaticon.com/512/2821/2821807.png', commissionFee: 5 },
                { category_name: 'Gia dụng', slug: 'gia-dung', description: 'Thiết bị điện gia dụng thông minh', icon: 'https://cdn-icons-png.flaticon.com/512/3502/3502601.png', commissionFee: 5 }
            ]);
        }

        if (await Product.countDocuments() === 0) {
            await Product.insertMany([
                { productName: 'Tai nghe Bluetooth Wireless Bass Pro', price: 450000, description: 'Tai nghe chống ồn chủ động ANC, pin 30 giờ.', category: 'Công nghệ', shopName: 'Gian hàng chung', quantity: 15, rating: 4.5, approvalStatus: 'Đã duyệt', flashSaleDiscount: 10, campaignName: 'Siêu Sale 11/11' },
                { productName: 'Sạc dự phòng FastCharge 20.000mAh', price: 320000, description: 'Sạc nhanh 22.5W tích hợp cáp bọc dù bền bỉ.', category: 'Công nghệ', shopName: 'Gian hàng chung', quantity: 20, rating: 4.2, approvalStatus: 'Đã duyệt' },
                { productName: 'Áo Hoodie Local Brand Pastel', price: 250000, description: 'Chất nỉ bông cotton 100% form rộng unisex.', category: 'Thời trang', shopName: 'Shop Nhóm 8', quantity: 30, rating: 5.0, approvalStatus: 'Đã duyệt', flashSaleDiscount: 15, campaignName: 'Flash Sale Khung Giờ Vàng' },
                { productName: 'Iphone 18 Pro Max 1TB', price: 50000000, description: 'Bảo hành chính hãng Apple VN/A 12 tháng.', category: 'Công nghệ', shopName: 'Gia Han phone', quantity: 5, rating: 5.0, approvalStatus: 'Đã duyệt' },
                { productName: 'Túi Canvas Pastel Cute', price: 120000, description: 'Vải bố dày dặn có khóa kéo và ngăn phụ.', category: 'Phụ kiện', shopName: 'Shop Nhóm 8', quantity: 25, rating: 4.3, approvalStatus: 'Đã duyệt' },
                { productName: 'Kính Mát Thời Trang Hàng Nhái (Chờ Kiểm Duyệt)', price: 89000, description: 'Sản phẩm mới đăng cần Admin kiểm duyệt.', category: 'Phụ kiện', shopName: 'Shop Nhóm 8', quantity: 50, rating: 4.0, approvalStatus: 'Chờ duyệt' }
            ]);
        }

        if (await Order.countDocuments() === 0) {
            await Order.insertMany([
                { buyerName: 'nguyenvana', shopName: 'Shop Nhóm 8', productName: 'Áo Hoodie Local Brand Pastel (x2)', totalAmount: 500000, platformFee: 25000, sellerNet: 475000, buyingMode: 'Mua lẻ', paymentMethod: 'Thẻ Quốc tế Visa / Mastercard', shippingCarrier: 'Giao Hàng Nhanh (GHN)', trackingCode: 'GHN882910', status: 'Đã hoàn thành' },
                { buyerName: 'tranthib', shopName: 'Shop Nhóm 8', productName: 'Túi Canvas Pastel Cute (x1)', totalAmount: 120000, platformFee: 6000, sellerNet: 114000, buyingMode: 'Mua lẻ', paymentMethod: 'COD', shippingCarrier: 'Giao Hàng Tiết Kiệm (GHTK)', status: 'Chờ duyệt' },
                { buyerName: 'nguyenvana', shopName: 'Shop Nhóm 8', productName: 'Áo Hoodie Local Brand Pastel (x1)', totalAmount: 250000, platformFee: 12500, sellerNet: 237500, buyingMode: 'Mua lẻ', paymentMethod: 'Ví điện tử MoMo', returnReason: 'Khách báo nhầm size XL sang L, muốn đổi hoặc hoàn tiền', status: 'Yêu cầu đổi trả/hoàn tiền' },
                { buyerName: 'tranthib', shopName: 'Gian hàng chung', productName: 'Tai nghe Bluetooth Wireless Bass Pro (x1)', totalAmount: 450000, platformFee: 22500, sellerNet: 427500, buyingMode: 'Mua lẻ', paymentMethod: 'Thẻ ATM Napas (Nội địa)', status: 'Đang giao hàng' }
            ]);
        }

        if (await Promotion.countDocuments() === 0) {
            await Promotion.insertMany([
                { title: 'Chiến Dịch Siêu Sale 11/11 Toàn Sàn', code: 'MEGA1111', discountPercent: 20, type: 'Platform_Campaign', shopName: 'Toàn sàn', status: 'Đang diễn ra' },
                { title: 'Black Friday Midnight Sale', code: 'BLACKFRIDAY', discountPercent: 30, type: 'Platform_Campaign', shopName: 'Toàn sàn', status: 'Đang diễn ra' },
                { title: 'Voucher Freeship & Giảm Giá Sàn', code: 'PINKYMART50', discountPercent: 10, type: 'Platform_Voucher', shopName: 'Toàn sàn', status: 'Đang diễn ra' }
            ]);
        }

        if (await ChatMessage.countDocuments() === 0) {
            await ChatMessage.insertMany([
                { shopName: 'Shop Nhóm 8', buyerName: 'nguyenvana', senderRole: 'Buyer', productName: 'Áo Hoodie Local Brand Pastel', message: 'Shop ơi mẫu Áo Hoodie hồng phấn còn size L cho người 60kg không ạ?' },
                { shopName: 'Shop Nhóm 8', buyerName: 'nguyenvana', senderRole: 'Seller', productName: 'Áo Hoodie Local Brand Pastel', message: 'Chào bạn Nguyễn Văn A! Dạ mẫu này bên mình còn sẵn kho 30 chiếc đủ size M, L, XL nha. Bạn đặt đơn mình đóng gói giao ngay hôm nay ạ!' },
                { shopName: 'Shop Nhóm 8', buyerName: 'tranthib', senderRole: 'Buyer', productName: 'Túi Canvas Pastel Cute', message: 'Túi này đựng vừa laptop 14 inch không shop?' }
            ]);
        }

        if (await Withdrawal.countDocuments() === 0) {
            await Withdrawal.insertMany([
                { shopName: 'Shop Nhóm 8', sellerUsername: 'shop_techzone', amount: 200000, bankInfo: 'Vietcombank - 0071001234567 - LE THI B', status: 'Chờ duyệt' }
            ]);
        }

        if (await SystemConfig.countDocuments() === 0) {
            await SystemConfig.create({});
        }
    } catch (e) {
        console.error("Lỗi Seed Data:", e);
    }
}

// ==========================================
// 3. API DANH MỤC (CATEGORIES)
// ==========================================
async function buildCategoryResponse(limitCount = 0) {
    let query = Category.find({});
    if (limitCount > 0) query = query.limit(limitCount);
    const result_category = await query.lean();
    const result_products = await Product.find({}).lean();

    return result_category.map(cat => {
        const catName = cat.category_name || cat.name || '';
        const count = result_products.filter(p => p.category && p.category.toLowerCase() === catName.toLowerCase()).length;
        return {
            _id: cat._id,
            name: catName,
            category_name: catName,
            slug: cat.slug || '',
            description: cat.description || '',
            commissionFee: cat.commissionFee || 5,
            icon: cat.icon || getDefaultCategoryIcon(catName),
            items: count
        };
    });
}

app.get('/api/categories/category', async (req, res) => {
    try { res.json({ category: await buildCategoryResponse(10) }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/categories/category/viewall', async (req, res) => {
    try { res.json({ category: await buildCategoryResponse(0) }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/categories/category', async (req, res) => {
    try {
        const name = req.body.category_name || req.body.name;
        const newCat = new Category({
            category_name: name,
            slug: req.body.slug || name.toLowerCase().replace(/\s+/g, '-'),
            description: req.body.description || 'Danh mục chuẩn toàn sàn',
            commissionFee: Number(req.body.commissionFee || 5),
            icon: req.body.icon || getDefaultCategoryIcon(name)
        });
        res.json(await newCat.save());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/categories/category/:id', async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.body.name && !req.body.category_name) updateData.category_name = req.body.name;
        res.json(await Category.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/categories/category/:id', async (req, res) => {
    try { await Category.findByIdAndDelete(req.params.id); res.json({ message: 'Đã xóa danh mục' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 4. API SẢN PHẨM & GIAN HÀNG
// ==========================================
async function formatProductsWithReviews(rawProducts) {
    const reviews = await Review.find({}).lean();
    const shops = await Shop.find({}).lean();

    return rawProducts.map(p => {
        const prodReviews = reviews.filter(r => r.productName && p.productName && r.productName.toLowerCase() === p.productName.toLowerCase());
        const calcRating = prodReviews.length > 0
            ? Number((prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length).toFixed(1))
            : (p.rating || 4.5);

        const shopInfo = shops.find(s => s.shop_name === p.shopName);
        const defaultImg = getDefaultProductImage(p.productName, p.category);

        return {
            ...p,
            name: p.productName,
            brand: p.shopName || 'Gian hàng chung',
            rating: calcRating,
            reviewCount: prodReviews.length,
            shopStatus: shopInfo ? shopInfo.status : 'Active',
            images: (p.images && p.images.length > 0 && p.images[0]) ? p.images : [defaultImg]
        };
    });
}

// Lấy sản phẩm (Buyer chỉ thấy SP không bị Từ chối, Admin thấy toàn bộ khi truyền includeAll=true)
app.get('/api/products', async (req, res) => {
    try {
        const { search, category, sort, shop, includeAll } = req.query;
        let query = {};
        if (!includeAll) {
            query.approvalStatus = { $ne: 'Từ chối' };
        }
        if (search) query.productName = { $regex: search, $options: 'i' };
        if (category && category !== 'all') query.category = category;
        if (shop && shop !== 'all') query.shopName = shop;

        let sortOpt = {};
        if (sort === 'asc') sortOpt.price = 1;
        if (sort === 'desc') sortOpt.price = -1;

        const rawList = await Product.find(query).sort(sortOpt).lean();
        res.json(await formatProductsWithReviews(rawList));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lấy sản phẩm của riêng Seller
app.get('/api/seller/products', authenticate, requireRole('Seller', 'Admin'), async (req, res) => {
    try {
        const shopInfo = await Shop.findOne({ owner_name: req.user.username });
        const shopName = shopInfo ? shopInfo.shop_name : 'Shop Nhóm 8';
        const rawList = await Product.find({ shopName }).lean();
        res.json(await formatProductsWithReviews(rawList));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lấy thông tin Shop của riêng Seller
app.get('/api/seller/shop', authenticate, requireRole('Seller', 'Admin'), async (req, res) => {
    try {
        let shopInfo = await Shop.findOne({ owner_name: req.user.username });
        if (!shopInfo) {
            shopInfo = await Shop.findOne({ shop_name: 'Shop Nhóm 8' });
        }
        res.json(shopInfo);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cập nhật cấu hình Kho & Vận chuyển của Seller
app.put('/api/seller/shop', authenticate, requireRole('Seller', 'Admin'), async (req, res) => {
    try {
        let shopInfo = await Shop.findOne({ owner_name: req.user.username });
        if (!shopInfo) shopInfo = await Shop.findOne({ shop_name: 'Shop Nhóm 8' });
        const updated = await Shop.findByIdAndUpdate(shopInfo._id, req.body, { returnDocument: 'after' });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', authenticate, requireRole('Seller', 'Admin'), async (req, res) => {
    try {
        let shopName = req.body.shopName;
        if (req.user.role === 'Seller') {
            const shopInfo = await Shop.findOne({ owner_name: req.user.username });
            if (shopInfo) shopName = shopInfo.shop_name;
        }
        const images = req.body.imageUrl ? [req.body.imageUrl] : (req.body.images || []);
        const newProd = new Product({
            ...req.body,
            shopName: shopName || 'Shop Nhóm 8',
            images,
            approvalStatus: 'Chờ duyệt'
        });
        res.json(await newProd.save());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', authenticate, requireRole('Seller', 'Admin'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.body.imageUrl) updateData.images = [req.body.imageUrl];
        res.json(await Product.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', authenticate, requireRole('Seller', 'Admin'), async (req, res) => {
    try { await Product.findByIdAndDelete(req.params.id); res.json({ message: 'Thành công' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/shops', async (req, res) => {
    try { res.json(await Shop.find()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/shops', authenticate, async (req, res) => {
    try {
        const exists = await Shop.findOne({ shop_name: req.body.shop_name });
        if (exists) return res.status(400).json({ error: 'Tên gian hàng đã tồn tại!' });
        const newShop = new Shop({ 
            shop_name: req.body.shop_name, 
            owner_name: req.user.username, 
            description: req.body.description,
            status: 'Chờ duyệt' 
        });
        res.json(await newShop.save());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/shops/:id', authenticate, requireRole('Admin'), async (req, res) => {
    try { res.json(await Shop.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 5. API NGƯỜI DÙNG (USERS & KYC) CHO ADMIN
// ==========================================
app.get('/api/users', authenticate, requireRole('Admin'), async (req, res) => {
    try {
        const users = await User.find().select('-password_hash').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id/status', authenticate, requireRole('Admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { returnDocument: 'after' }).select('-password_hash');
        // Đồng bộ trạng thái Shop nếu duyệt KYC hoặc khóa Seller
        if (user && user.role === 'Seller') {
            if (req.body.status === 'Active') {
                await Shop.updateMany({ owner_name: user.username }, { status: 'Active' });
            } else if (req.body.status === 'Banned') {
                await Shop.updateMany({ owner_name: user.username }, { status: 'Đã khóa' });
            }
        }
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 6. API MẶC CẢ, GIỎ HÀNG & ĐƠN HÀNG
// ==========================================
app.get('/api/bargains', authenticate, async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Seller') {
            const shopInfo = await Shop.findOne({ owner_name: req.user.username });
            if (shopInfo) query.shopName = shopInfo.shop_name;
        }
        res.json(await Bargain.find(query).sort({ createdAt: -1 }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/bargains', async (req, res) => {
    try { res.json(await new Bargain(req.body).save()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/bargains/:id', authenticate, requireRole('Seller', 'Admin'), async (req, res) => {
    try {
        const bargain = await Bargain.findByIdAndUpdate(req.params.id, { status: req.body.status }, { returnDocument: 'after' });
        if (bargain && req.body.status === 'Đã chấp nhận') {
            const user_id = bargain.buyerName;
            let cart = await Cart.findOne({ user_id });
            const newItem = {
                product_id: bargain.productId,
                name: `${bargain.productName} [Giá chốt mặc cả]`,
                price: bargain.offeredPrice,
                quantity: 1,
                image: getDefaultProductImage(bargain.productName),
                shopName: bargain.shopName,
                isBargained: true
            };
            if (cart) {
                cart.items.push(newItem);
                await cart.save();
            } else {
                await new Cart({ user_id, items: [newItem] }).save();
            }
        }
        res.json(bargain);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/cart', authenticate, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user_id: req.user.username });
        if (!cart) return res.json({ items: [] });
        res.json(cart);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/cart/add', authenticate, async (req, res) => {
    try {
        const user_id = req.user.username;
        const { product } = req.body; 
        const dbProduct = await Product.findOne({ productName: product.name.replace(' [Giá chốt mặc cả]', '') });
        if (!dbProduct) return res.status(404).json({ error: 'Sản phẩm không tồn tại!' });

        let cart = await Cart.findOne({ user_id });
        let currentQtyInCart = 0;
        if (cart) {
            const existingItem = cart.items.find(i => i.product_id === product.product_id && !i.isBargained);
            if (existingItem) currentQtyInCart = existingItem.quantity;
        }
        if (currentQtyInCart + product.quantity > dbProduct.quantity) {
            return res.status(400).json({ error: `Kho chỉ còn ${dbProduct.quantity} sản phẩm!` });
        }
        if (cart) {
            const existingItem = cart.items.find(i => i.product_id === product.product_id && !i.isBargained);
            if (existingItem) existingItem.quantity += product.quantity;
            else cart.items.push(product);
            await cart.save();
        } else {
            await new Cart({ user_id, items: [product] }).save();
        }
        res.json({ message: "Đã thêm sản phẩm vào giỏ hàng." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [ĐÃ CẬP NHẬT THEO YÊU CẦU] API Cập nhật số lượng có kiểm tra tồn kho
app.put('/api/cart/update', authenticate, async (req, res) => {
    try {
        const user_id = req.user.username;
        const { product_id, delta } = req.body;
        const cart = await Cart.findOne({ user_id });
        if (!cart) return res.status(404).json({ error: 'Không tìm thấy giỏ hàng' });

        const item = cart.items.find(i => i.product_id === product_id);
        if (!item) return res.status(404).json({ error: 'Sản phẩm không có trong giỏ' });

        // Kiểm tra tồn kho thực tế nếu tăng số lượng
        if (delta > 0) {
            const cleanName = item.name.replace(' [Giá chốt mặc cả]', '');
            const dbProd = await Product.findOne({ productName: cleanName });
            if (dbProd && (item.quantity + delta > dbProd.quantity)) {
                return res.status(400).json({ error: `Kho chỉ còn tối đa ${dbProd.quantity} sản phẩm!` });
            }
        }

        item.quantity += delta;
        if (item.quantity <= 0) {
            cart.items = cart.items.filter(i => i.product_id !== product_id);
        }
        await cart.save();
        res.json({ message: 'Đã cập nhật số lượng.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/cart/remove/:productId', authenticate, async (req, res) => {
    try {
        const user_id = req.user.username;
        await Cart.updateOne({ user_id }, { $pull: { items: { product_id: req.params.productId } } });
        res.json({ message: "Đã xóa sản phẩm." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orders/checkout', authenticate, async (req, res) => {
    try {
        const buyerName = req.user.username;
        const { paymentMethod, buyingMode } = req.body;
        const cart = await Cart.findOne({ user_id: buyerName });
        if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'Giỏ hàng trống!' });

        const groupedByShop = {};
        const deductedStock = []; 

        try {
            for (const item of cart.items) {
                const shop = item.shopName || 'Gian hàng chung';
                if (!groupedByShop[shop]) groupedByShop[shop] = [];
                groupedByShop[shop].push(item);

                const cleanName = item.name.replace(' [Giá chốt mặc cả]', '');
                const product = await Product.findOneAndUpdate(
                    { productName: cleanName, quantity: { $gte: item.quantity } }, 
                    { $inc: { quantity: -item.quantity } },
                    { returnDocument: 'after' }
                );
                if (!product) throw new Error(`Sản phẩm "${cleanName}" không đủ tồn kho!`);
                deductedStock.push({ productName: cleanName, quantity: item.quantity });
            }

            const discountMultiplier = buyingMode === 'Mua chung nhóm (-15%)' ? 0.85 : 1;
            const createdOrders = [];

            for (const [shopName, items] of Object.entries(groupedByShop)) {
                const shopDoc = await Shop.findOne({ shop_name: shopName });
                const rate = shopDoc && shopDoc.commissionRate ? shopDoc.commissionRate : 5;

                const rawSum = items.reduce((s, i) => s + (i.price * i.quantity), 0);
                const finalAmount = Math.round(rawSum * discountMultiplier);
                const platformFee = Math.round(finalAmount * (rate / 100));
                const sellerNet = finalAmount - platformFee;
                const summary = items.map(i => `${i.name} (x${i.quantity})`).join(', ');

                const order = await new Order({
                    buyerName, shopName, productName: summary, totalAmount: finalAmount,
                    platformFee, sellerNet, buyingMode: buyingMode || 'Mua lẻ',
                    paymentMethod, status: 'Chờ duyệt'
                }).save();
                createdOrders.push(order);
            }

            await Cart.deleteOne({ user_id: buyerName }); 
            res.json({ message: `Đã tách thành ${createdOrders.length} đơn hàng theo Shop!`, orders: createdOrders });
        } catch (error) {
            for (const item of deductedStock) {
                await Product.updateOne({ productName: item.productName }, { $inc: { quantity: item.quantity } });
            }
            return res.status(400).json({ error: error.message });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', authenticate, requireRole('Admin', 'Seller'), async (req, res) => { 
    try {
        let query = {};
        if (req.user.role === 'Seller') {
            const shopInfo = await Shop.findOne({ owner_name: req.user.username });
            query.shopName = shopInfo ? shopInfo.shop_name : 'Shop Nhóm 8';
        }
        res.json(await Order.find(query).sort({ createdAt: -1 })); 
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/orders/:id', authenticate, requireRole('Admin', 'Seller'), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn' });
        const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 7. API DÀNH RIÊNG CHO BUYER (MỚI THÊM)
// ==========================================

// 7.1 Lấy lịch sử đơn hàng của riêng Buyer đang đăng nhập
app.get('/api/buyer/orders', authenticate, async (req, res) => {
    try {
        const myOrders = await Order.find({
            $or: [
                { buyerName: req.user.username },
                { buyerName: req.user.full_name } // Đề phòng trường hợp buyerName lưu tên thật
            ]
        }).sort({ createdAt: -1 });
        res.json(myOrders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7.2 API Buyer thao tác trên đơn hàng (Hủy đơn, Xác nhận đã nhận, Yêu cầu đổi trả)
app.put('/api/buyer/orders/:id/action', authenticate, async (req, res) => {
    try {
        const { action, returnReason } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng!' });

        if (order.buyerName !== req.user.username && order.buyerName !== req.user.full_name) {
            return res.status(403).json({ error: 'Bạn không có quyền thao tác trên đơn hàng này!' });
        }

        if (action === 'cancel') {
            if (order.status !== 'Chờ duyệt') {
                return res.status(400).json({ error: 'Chỉ có thể hủy đơn khi đang ở trạng thái Chờ duyệt!' });
            }
            order.status = 'Hủy đơn';
        } else if (action === 'confirm_received') {
            order.status = 'Đã hoàn thành';
        } else if (action === 'request_return') {
            order.status = 'Yêu cầu đổi trả/hoàn tiền';
            order.returnReason = returnReason || 'Sản phẩm không đúng mô tả / Lỗi kỹ thuật';
        }

        await order.save();
        res.json({ message: 'Cập nhật trạng thái đơn hàng thành công!', order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7.3 API Cập nhật thông tin cá nhân & Đổi mật khẩu
app.put('/api/auth/profile', authenticate, async (req, res) => {
    try {
        const { full_name, email, phone, address, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản!' });

        if (full_name !== undefined) user.full_name = full_name;
        if (email !== undefined) user.email = email;
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;

        // Nếu người dùng nhập mật khẩu mới -> kiểm tra mật khẩu hiện tại
        if (newPassword && newPassword.trim() !== '') {
            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'Mật khẩu mới phải từ 6 ký tự trở lên!' });
            }
            if (!currentPassword) {
                return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại để xác nhận!' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isMatch) {
                return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác!' });
            }
            user.password_hash = await bcrypt.hash(newPassword, 10);
        }

        await user.save();
        res.json({
            message: 'Cập nhật thông tin tài khoản thành công!',
            user: {
                _id: user._id,
                username: user.username,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 8. API TÀI CHÍNH, KHUYẾN MÃI, CHAT & CẤU HÌNH
// ==========================================
app.get('/api/withdrawals', authenticate, requireRole('Admin', 'Seller'), async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Seller') {
            const shopInfo = await Shop.findOne({ owner_name: req.user.username });
            query.shopName = shopInfo ? shopInfo.shop_name : 'Shop Nhóm 8';
        }
        res.json(await Withdrawal.find(query).sort({ createdAt: -1 }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/withdrawals', authenticate, requireRole('Seller', 'Admin'), async (req, res) => {
    try {
        const shopInfo = await Shop.findOne({ owner_name: req.user.username });
        const shopName = shopInfo ? shopInfo.shop_name : (req.body.shopName || 'Shop Nhóm 8');
        const nw = new Withdrawal({
            shopName,
            sellerUsername: req.user.username,
            amount: Number(req.body.amount),
            bankInfo: req.body.bankInfo,
            status: 'Chờ duyệt'
        });
        res.json(await nw.save());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/withdrawals/:id', authenticate, requireRole('Admin'), async (req, res) => {
    try {
        res.json(await Withdrawal.findByIdAndUpdate(req.params.id, { status: req.body.status }, { returnDocument: 'after' }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/promotions', async (req, res) => {
    try { res.json(await Promotion.find().sort({ createdAt: -1 })); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/promotions', authenticate, requireRole('Admin', 'Seller'), async (req, res) => {
    try { res.json(await new Promotion(req.body).save()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/promotions/:id', authenticate, requireRole('Admin', 'Seller'), async (req, res) => {
    try { await Promotion.findByIdAndDelete(req.params.id); res.json({ message: 'Đã xóa khuyến mãi' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/chats', authenticate, async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Seller') {
            const shopInfo = await Shop.findOne({ owner_name: req.user.username });
            query.shopName = shopInfo ? shopInfo.shop_name : 'Shop Nhóm 8';
        }
        res.json(await ChatMessage.find(query).sort({ createdAt: 1 }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chats', authenticate, async (req, res) => {
    try {
        const shopInfo = await Shop.findOne({ owner_name: req.user.username });
        const msg = new ChatMessage({
            shopName: req.body.shopName || (shopInfo ? shopInfo.shop_name : 'Shop Nhóm 8'),
            buyerName: req.body.buyerName || 'nguyenvana',
            senderRole: req.body.senderRole || req.user.role,
            productName: req.body.productName || 'Tư vấn chung',
            message: req.body.message
        });
        res.json(await msg.save());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/settings', async (req, res) => {
    try {
        let cfg = await SystemConfig.findOne();
        if (!cfg) cfg = await SystemConfig.create({});
        res.json(cfg);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/settings', authenticate, requireRole('Admin'), async (req, res) => {
    try {
        let cfg = await SystemConfig.findOne();
        if (!cfg) cfg = await SystemConfig.create(req.body);
        else cfg = await SystemConfig.findByIdAndUpdate(cfg._id, req.body, { returnDocument: 'after' });
        res.json(cfg);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reviews', async (req, res) => { res.json(await Review.find().sort({ createdAt: -1 })); });

app.post('/api/reviews', authenticate, async (req, res) => {
    try {
        const buyerName = req.user.username;
        const { productName, rating, comment } = req.body;
        res.json(await new Review({ buyerName, productName, rating, comment }).save());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stats', authenticate, requireRole('Admin'), async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const totalReviews = await Review.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalShops = await Shop.countDocuments({ status: 'Active' });
        const allOrders = await Order.find().lean();
        const completedOrders = allOrders.filter(o => o.status === 'Đã hoàn thành');
        const totalRevenue = completedOrders.reduce((sum, item) => sum + item.totalAmount, 0);
        const totalPlatformFee = completedOrders.reduce((sum, item) => sum + (item.platformFee || Math.round(item.totalAmount * 0.05)), 0);

        const shops = await Shop.find().lean();
        const totalVisits = shops.reduce((sum, s) => sum + (s.visits || 500), 0);

        // Tính Top Shop bán chạy
        const shopStatsMap = {};
        shops.forEach(s => {
            shopStatsMap[s.shop_name] = {
                shopName: s.shop_name,
                owner: s.owner_name,
                ordersCount: 0,
                gmv: 0,
                platformFee: 0,
                sellerNet: 0,
                visits: s.visits || 500,
                rating: s.rating || 4.8
            };
        });
        completedOrders.forEach(o => {
            if (!shopStatsMap[o.shopName]) {
                shopStatsMap[o.shopName] = { shopName: o.shopName, owner: 'shop_techzone', ordersCount: 0, gmv: 0, platformFee: 0, sellerNet: 0, visits: 450, rating: 4.7 };
            }
            shopStatsMap[o.shopName].ordersCount += 1;
            shopStatsMap[o.shopName].gmv += o.totalAmount;
            shopStatsMap[o.shopName].platformFee += (o.platformFee || Math.round(o.totalAmount * 0.05));
            shopStatsMap[o.shopName].sellerNet += (o.sellerNet || Math.round(o.totalAmount * 0.95));
        });

        const topShops = Object.values(shopStatsMap).sort((a, b) => b.gmv - a.gmv);

        res.json({
            totalProducts, totalOrders, totalReviews, totalUsers, totalShops,
            totalRevenue, totalPlatformFee, totalVisits, topShops
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 9. AUTH: ĐĂNG KÝ & ĐĂNG NHẬP
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email, full_name, phone, role } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Vui lòng nhập username và password' });
        if (password.length < 6) return res.status(400).json({ error: 'Mật khẩu phải từ 6 ký tự trở lên' });

        const exists = await User.findOne({ username });
        if (exists) return res.status(400).json({ error: 'Username này đã có người sử dụng' });

        const safeRole = ['Buyer', 'Seller'].includes(role) ? role : 'Buyer';
        const hash = await bcrypt.hash(password, 10);
        const initialStatus = safeRole === 'Seller' ? 'Pending_KYC' : 'Active';

        const user = await User.create({
            username, password_hash: hash, email, full_name, phone, role: safeRole, status: initialStatus
        });

        if (safeRole === 'Seller') {
            await Shop.create({
                shop_name: `Shop của ${full_name || username}`,
                owner_name: username,
                description: 'Gian hàng mới đăng ký chờ duyệt KYC',
                status: 'Chờ duyệt'
            });
        }

        res.status(201).json({ message: 'Đăng ký thành công', user: { _id: user._id, username: user.username, role: user.role } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Vui lòng nhập username và password' });

        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Sai username hoặc password' });

        if (user.status === 'Banned') {
            return res.status(403).json({ error: 'Tài khoản của bạn đã bị Ban (Khóa) do vi phạm chính sách sàn!' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Sai username hoặc password' });

        const token = signToken({ userId: user._id.toString(), username: user.username, role: user.role });

        res.json({
            message: 'Đăng nhập thành công', token,
            user: { _id: user._id, username: user.username, full_name: user.full_name, role: user.role, status: user.status }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password_hash');
        res.json({ user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 9. TÍCH HỢP CỔNG THANH TOÁN VNPAY (CHUẨN LAB 10 & TECHSPEC 2.1.0)
// ==========================================
const crypto = require('crypto');

const VNPAY_CONFIG = {
    vnp_TmnCode: process.env.VNP_TMNCODE || 'CGXZLS0Z', // Mã test hoặc lấy từ .env
    vnp_HashSecret: process.env.VNP_HASHSECRET || 'XNBCJFAKAZQSGTARRLGCHVZWCIOIGSHN',
    vnp_Url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    vnp_ReturnUrl: `http://localhost:${PORT}/api/orders/vnpay_return`
};

function formatVnpDate(date) {
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return (
        date.getFullYear().toString() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds())
    );
}

function sortObjectVnpay(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        if (obj[key] !== '' && obj[key] !== null && obj[key] !== undefined) {
            sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
        }
    }
    return sorted;
}

// Route 1: Tạo đơn hàng từ Giỏ hàng & Sinh URL thanh toán VNPAY (Chuẩn Lab 10)
app.post('/api/orders/create_payment_url', authenticate, async (req, res) => {
    try {
        const buyerName = req.user.username;
        const {
            amount,
            bankCode = '',
            language = 'vn',
            buyingMode = 'Mua lẻ',
            voucherDiscount = 0,
            useSimulator = false
        } = req.body;

        const cart = await Cart.findOne({ user_id: buyerName });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: 'Giỏ hàng của bạn đang trống!' });
        }

        // Kiểm tra & Trừ tồn kho + Tách đơn theo từng Gian hàng (Shop)
        const groupedByShop = {};
        const deductedStock = [];

        try {
            for (const item of cart.items) {
                const shop = item.shopName || 'Gian hàng chung';
                if (!groupedByShop[shop]) groupedByShop[shop] = [];
                groupedByShop[shop].push(item);

                const cleanName = item.name.replace(' [Giá chốt mặc cả]', '');
                const product = await Product.findOneAndUpdate(
                    { productName: cleanName, quantity: { $gte: item.quantity } },
                    { $inc: { quantity: -item.quantity } },
                    { returnDocument: 'after' }
                );
                if (!product) {
                    throw new Error(`Sản phẩm "${cleanName}" không đủ số lượng tồn kho!`);
                }
                deductedStock.push({ productName: cleanName, quantity: item.quantity });
            }

            const modeMultiplier = buyingMode.includes('-15%') ? 0.85 : 1;
            const voucherMultiplier = 1 - Number(voucherDiscount || 0) / 100;
            const createdOrderIds = [];
            let totalCalculated = 0;

            for (const [shopName, items] of Object.entries(groupedByShop)) {
                const shopDoc = await Shop.findOne({ shop_name: shopName });
                const rate = shopDoc && shopDoc.commissionRate ? shopDoc.commissionRate : 5;

                const rawSum = items.reduce((s, i) => s + i.price * i.quantity, 0);
                const finalAmount = Math.round(rawSum * modeMultiplier * voucherMultiplier);
                const platformFee = Math.round(finalAmount * (rate / 100));
                const sellerNet = finalAmount - platformFee;
                const summary = items.map((i) => `${i.name} (x${i.quantity})`).join(', ');

                const newOrder = await new Order({
                    buyerName,
                    shopName,
                    productName: summary,
                    totalAmount: finalAmount,
                    platformFee,
                    sellerNet,
                    buyingMode,
                    paymentMethod: `VNPAY (${bankCode || 'VNPAYQR'})`,
                    status: 'Chờ thanh toán VNPAY'
                }).save();

                createdOrderIds.push(newOrder._id.toString());
                totalCalculated += finalAmount;
            }

            const finalPayAmount = Number(amount) || totalCalculated;
            const txnRef = createdOrderIds.join('_'); // Ghép mã đơn hàng để cập nhật khi VNPAY trả về
            const now = new Date();
            const createDate = formatVnpDate(now);
            const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

            let vnp_Params = {
                vnp_Version: '2.1.0',
                vnp_Command: 'pay',
                vnp_TmnCode: VNPAY_CONFIG.vnp_TmnCode,
                vnp_Locale: language || 'vn',
                vnp_CurrCode: 'VND',
                vnp_TxnRef: txnRef,
                vnp_OrderInfo: `Thanh toan don hang PinkyMart ma GD ${txnRef.slice(0, 12)}`,
                vnp_OrderType: 'other',
                vnp_Amount: finalPayAmount * 100, // Nhân 100 theo đặc tả VNPAY 2.1.0
                vnp_ReturnUrl: VNPAY_CONFIG.vnp_ReturnUrl,
                vnp_IpAddr: ipAddr,
                vnp_CreateDate: createDate
            };

            if (bankCode && bankCode !== '') {
                vnp_Params['vnp_BankCode'] = bankCode;
            }

            const sortedParams = sortObjectVnpay(vnp_Params);
            const signData = Object.keys(sortedParams)
                .map((k) => `${k}=${sortedParams[k]}`)
                .join('&');

            const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
            sortedParams['vnp_SecureHash'] = signed;

            const queryString = Object.keys(sortedParams)
                .map((k) => `${k}=${sortedParams[k]}`)
                .join('&');

            // Nếu dùng cổng Simulator NCB tích hợp sẵn hoặc chuyển hướng sang Sandbox VNPAY
             // Trong route app.post('/api/orders/create_payment_url') của server.js:
// Thay đoạn const paymentUrl = useSimulator ? ... bằng đoạn này:

const paymentUrl = useSimulator
    ? `http://localhost:${PORT}/api/orders/vnpay_return?${queryString}&vnp_ResponseCode=00&vnp_TransactionStatus=00&sim=1`
    : `${VNPAY_CONFIG.vnp_Url}?${queryString}`;

res.json({ paymentUrl, txnRef, amount: finalPayAmount, vnp_Params: sortedParams });

            res.json({ paymentUrl, txnRef, amount: finalPayAmount, vnp_Params: sortedParams });
        } catch (innerErr) {
            for (const item of deductedStock) {
                await Product.updateOne({ productName: item.productName }, { $inc: { quantity: item.quantity } });
            }
            return res.status(400).json({ error: innerErr.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route 2: Nhận kết quả trả về từ VNPAY (vnp_ReturnUrl chuẩn Lab 10)
app.get('/api/orders/vnpay_return', async (req, res) => {
    try {
        let vnp_Params = { ...req.query };
        const secureHash = vnp_Params['vnp_SecureHash'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        const sortedParams = sortObjectVnpay(vnp_Params);
        const signData = Object.keys(sortedParams)
            .map((k) => `${k}=${sortedParams[k]}`)
            .join('&');

        const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        const isValidSignature = secureHash === signed || req.query.sim === '1';
        const responseCode = req.query.vnp_ResponseCode || '00';
        const txnRef = req.query.vnp_TxnRef || '';
        const orderIds = txnRef.split('_').filter((id) => mongoose.Types.ObjectId.isValid(id));

        if (isValidSignature && responseCode === '00') {
            for (const id of orderIds) {
                const ord = await Order.findByIdAndUpdate(
                    id,
                    { status: 'Chờ duyệt', trackingCode: 'VNP' + Date.now().toString().slice(-6) },
                    { returnDocument: 'after' }
                );
                if (ord && ord.buyerName) {
                    await Cart.deleteOne({ user_id: ord.buyerName });
                }
            }
        } else {
            for (const id of orderIds) {
                await Order.findByIdAndUpdate(id, { status: 'Hủy đơn' });
            }
        }

        const redirectQuery = new URLSearchParams(req.query).toString();
        res.redirect(`/vnpay_return.html?${redirectQuery}`);
    } catch (err) {
        res.redirect(`/vnpay_return.html?vnp_ResponseCode=99`);
    }
});

app.listen(PORT, () => {
    console.log(`[INFO] Server Backend Nhóm 08 đang chạy tại: http://localhost:${PORT}`);
});
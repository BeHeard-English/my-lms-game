const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors()); 
app.use(express.json()); 

// Serve thư mục uploads (để xem ảnh/game)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve thư mục public (để hiện giao diện index.html)
// Dòng này giúp máy chủ biết tìm file html ở đâu
app.use(express.static('public', { extensions: ['html'] })); 

// --- DATABASE SETUP (MONGODB) ---
const mongoose = require('mongoose');

// Thay chuỗi này bằng chuỗi kết nối của bạn (nhớ thay <password>)
const mongoURI = "mongodb+srv://beheard:<10032026>@cluster0.2qyx0oo.mongodb.net/?appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Connected to MongoDB Atlas!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// Định nghĩa khuôn mẫu cho Game (Schema)
const gameSchema = new mongoose.Schema({
    title: String,
    level: String,
    skill: String,
    file: String,
    icon: String,
    createdAt: { type: Date, default: Date.now }
});

const Game = mongoose.model('Game', gameSchema);

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'uploads/';
        if (file.fieldname === 'gameFile') uploadPath += 'games/';
        else if (file.fieldname === 'iconFile') uploadPath += 'icons/';
        
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

// --- API ENDPOINTS ---

app.get('/games', async (req, res) => {
    try {
        const games = await Game.find(); // Lấy từ database thay vì đọc file
        const gamesWithUrls = games.map(game => ({
            id: game._id,
            title: game.title,
            level: game.level,
            skill: game.skill,
            fileUrl: `${req.protocol}://${req.get('host')}/uploads/games/${game.file}`,
            iconUrl: `${req.protocol}://${req.get('host')}/uploads/icons/${game.icon}`
        }));
        res.json(gamesWithUrls);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve games from database' });
    }
});

app.post('/upload-game', 
    upload.fields([{ name: 'gameFile', maxCount: 1 }, { name: 'iconFile', maxCount: 1 }]), 
    async (req, res) => { // Thêm chữ 'async' ở đây
        try {
            const { title, level, skill } = req.body;
            const files = req.files;

            if (!title || !level || !skill || !files.gameFile || !files.iconFile) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Tạo đối tượng game mới theo Schema
            const newGame = new Game({
                title,
                level,
                skill,
                file: files.gameFile[0].filename,
                icon: files.iconFile[0].filename
            });

            await newGame.save(); // Lưu vào MongoDB Atlas

            res.status(201).json({ message: 'Success!', game: newGame });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to save game to database.' });
        }
    }
);

const path = require('path');

// 1. Phải có dòng này để server biết thư mục 'public' chứa gì
app.use(express.static(path.join(__dirname, 'public')));

// 2. Ép trang chủ hiện users.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'users.html'));
});

// 3. Dự phòng: Nếu gõ /users cũng hiện users.html
app.get('/users', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'users.html'));
});

// --- START SERVER (Luôn để cuối cùng) ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

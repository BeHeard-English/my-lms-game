const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. MIDDLEWARE ---
app.use(cors()); 
app.use(express.json()); 

// --- 2. DATABASE SETUP ---
const mongoURI = "mongodb+srv://beheard:10032026@cluster0.2qyx0oo.mongodb.net/myLMS?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Connected to MongoDB Atlas!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

const gameSchema = new mongoose.Schema({
    title: String,
    level: String,
    skill: String,
    file: String,
    icon: String,
    createdAt: { type: Date, default: Date.now }
});
const Game = mongoose.model('Game', gameSchema);

// --- 3. MULTER CONFIG ---
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
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- 4. ROUTES & API ---

// API lấy danh sách game
app.get('/games', async (req, res) => {
    try {
        const games = await Game.find();
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
        res.status(500).json({ error: 'Failed to retrieve games' });
    }
});

// API Upload
app.post('/upload-game', upload.fields([{ name: 'gameFile', maxCount: 1 }, { name: 'iconFile', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, level, skill } = req.body;
        const files = req.files;
        if (!title || !level || !skill || !files.gameFile || !files.iconFile) {
            return res.status(400).json({ error: 'Missing fields' });
        }
        const newGame = new Game({
            title, level, skill,
            file: files.gameFile[0].filename,
            icon: files.iconFile[0].filename
        });
        await newGame.save();
        res.status(201).json({ message: 'Success!', game: newGame });
    } catch (error) {
        res.status(500).json({ error: 'Upload failed' });
    }
});

// --- 5. ĐIỀU HƯỚNG TRANG (ROUTING) - QUAN TRỌNG: ĐẶT TRÊN STATIC ---

// Ép trang chủ hiện users.html cho học sinh
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'users.html'));
});

// Trang để giáo viên upload
app.get('/teacher-zone', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Phục vụ các file tĩnh (CSS, JS, hình ảnh) sau khi đã check các đường dẫn trên
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 6. START ---
app.listen(PORT, () => {
    console.log(`🚀 Server is flying at http://localhost:${PORT}`);
});

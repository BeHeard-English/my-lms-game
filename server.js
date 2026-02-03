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
app.use(express.static('public')); 

// --- DATABASE SETUP ---
const DB_FILE = path.join(__dirname, 'data', 'games.json');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

const readDB = () => {
    const data = fs.readFileSync(DB_FILE);
    return JSON.parse(data);
};

const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

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

app.get('/games', (req, res) => {
    try {
        const games = readDB();
        const gamesWithUrls = games.map(game => ({
            ...game,
            fileUrl: `${req.protocol}://${req.get('host')}/uploads/games/${game.file}`,
            iconUrl: `${req.protocol}://${req.get('host')}/uploads/icons/${game.icon}`
        }));
        res.json(gamesWithUrls);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve games' });
    }
});

app.post('/upload-game', 
    upload.fields([{ name: 'gameFile', maxCount: 1 }, { name: 'iconFile', maxCount: 1 }]), 
    (req, res) => {
        try {
            const { title, level, skill } = req.body;
            const files = req.files;

            if (!title || !level || !skill || !files.gameFile || !files.iconFile) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const newGame = {
                id: uuidv4(),
                title: title,
                level: level,
                skill: skill,
                file: files.gameFile[0].filename,
                icon: files.iconFile[0].filename,
                createdAt: new Date().toISOString()
            };

            const games = readDB();
            games.push(newGame);
            writeDB(games);

            res.status(201).json({ message: 'Success!', game: newGame });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to save data.' });
        }
    }
);

// --- FRONTEND ROUTE (Đoạn mới thêm) ---
// Khi vào trang chủ (/) thì gửi về file index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- START SERVER (Luôn để cuối cùng) ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
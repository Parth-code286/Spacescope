const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:3000", "https://spacescope-4q7k0htjv-parths-projects-267acbe7.vercel.app"],
        methods: ["GET", "POST"]
    }
});

app.set('io', io);

const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for images/PDFs

// DB Initialization
const initDB = async () => {
    try {
        // Instructors table
        await db.query(`
            CREATE TABLE IF NOT EXISTS instructors (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT,
                location TEXT,
                approved_date DATE DEFAULT CURRENT_DATE,
                image TEXT,
                specialization TEXT,
                status TEXT DEFAULT 'OFFLINE',
                session_title TEXT,
                session_link TEXT,
                upcoming_session TIMESTAMP,
                access_code TEXT UNIQUE -- Unique code for instructor login
            )
        `);

        // Migration: Add missing columns if they don't exist (for existing DBs)
        await db.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instructors' AND column_name='access_code') THEN
                    ALTER TABLE instructors ADD COLUMN access_code TEXT UNIQUE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instructors' AND column_name='status') THEN
                    ALTER TABLE instructors ADD COLUMN status TEXT DEFAULT 'OFFLINE';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instructors' AND column_name='session_title') THEN
                    ALTER TABLE instructors ADD COLUMN session_title TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instructors' AND column_name='session_link') THEN
                    ALTER TABLE instructors ADD COLUMN session_link TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instructors' AND column_name='upcoming_session') THEN
                    ALTER TABLE instructors ADD COLUMN upcoming_session TIMESTAMP;
                END IF;
            END $$;
        `);

        // Backfill access codes for demo users if they are NULL
        await db.query(`
            UPDATE instructors SET access_code = 'CMD-ELENA' WHERE email = 'evance@astro.edu' AND access_code IS NULL;
            UPDATE instructors SET access_code = 'CMD-MARCUS' WHERE email = 'mchen@cosmos.org' AND access_code IS NULL;
        `);

        // Sessions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS instructor_sessions (
                id SERIAL PRIMARY KEY,
                instructor_id INTEGER REFERENCES instructors(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                topic TEXT,
                description TEXT,
                start_time TIMESTAMP NOT NULL,
                duration INTEGER, -- in minutes
                status TEXT DEFAULT 'UPCOMING', -- UPCOMING, LIVE, COMPLETED
                meeting_link TEXT,
                student_count INTEGER DEFAULT 0
            )
        `);

        // Applications table
        await db.query(`
            CREATE TABLE IF NOT EXISTS instructor_applications (
                id SERIAL PRIMARY KEY,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                specialization TEXT,
                bio TEXT,
                resume TEXT,
                certificate TEXT,
                id_card TEXT,
                status TEXT DEFAULT 'PENDING',
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Notifications table
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                type VARCHAR(20) NOT NULL CHECK (type IN ('urgent', 'info', 'warning')),
                category VARCHAR(50) NOT NULL CHECK (category IN ('solar', 'asteroid', 'satellite', 'weather', 'mission', 'general')),
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                link VARCHAR(500),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Email subscriptions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS email_subscriptions (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                preferences JSONB DEFAULT '{"solar": true, "asteroid": true, "satellite": true, "weather": true, "mission": true}'::jsonb,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified_at TIMESTAMP,
                unsubscribe_token VARCHAR(255) UNIQUE
            )
        `);

        // Create indexes for notifications
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        `);

        // Reports table
        await db.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT,
                username TEXT,
                status TEXT DEFAULT 'PENDING',
                category TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                images TEXT[]
            )
        `);

        // Doubts table
        await db.query(`
            CREATE TABLE IF NOT EXISTS doubts (
                id SERIAL PRIMARY KEY,
                username TEXT,
                question TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS doubt_replies (
                id SERIAL PRIMARY KEY,
                doubt_id INTEGER REFERENCES doubts(id) ON DELETE CASCADE,
                username TEXT,
                text TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // SEED DATA (Only if tables are empty)
        const instructorCheck = await db.query('SELECT COUNT(*) FROM instructors');
        if (parseInt(instructorCheck.rows[0].count) === 0) {
            console.log('Seeding initial instructors...');
            await db.query(`
                INSERT INTO instructors (name, email, role, location, image, specialization, status, session_title, session_link, access_code) VALUES
                ('Dr. Elena Vance', 'evance@astro.edu', 'Senior Astrophysicist', 'Geneva, Switzerland', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', 'Quantum Singularity', 'IN_SESSION', '🔴 Solar Storms Explained', 'https://meet.jit.si/SpaceScopeSolarStorms', 'CMD-ELENA'),
                ('Prof. Marcus Chen', 'mchen@cosmos.org', 'Lead Researcher', 'Beijing, China', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200', 'Exoplanetary Systems', 'ONLINE', NULL, NULL, 'CMD-MARCUS')
            `);
        }

        // Seed Sessions (Check if missing and insert)
        console.log('Verifying session data...');
        await db.query(`
            INSERT INTO instructor_sessions (instructor_id, title, topic, description, start_time, duration, status, meeting_link, student_count)
            SELECT id, '🔴 Solar Storms Explained', 'Space Weather', 'Deep dive into the recent C-class flares and their impact on GPS satellites.', NOW() - INTERVAL '10 minutes', 45, 'LIVE', 'https://meet.jit.si/SpaceScopeSolarStorms', 142
            FROM instructors WHERE email = 'evance@astro.edu'
            AND NOT EXISTS (SELECT 1 FROM instructor_sessions WHERE title = '🔴 Solar Storms Explained');

            INSERT INTO instructor_sessions (instructor_id, title, topic, description, start_time, duration, status, meeting_link, student_count)
            SELECT id, 'Black Holes: Event Horizon', 'Astrophysics', 'Understanding the physics at the point of no return.', NOW() + INTERVAL '2 days', 90, 'UPCOMING', 'https://meet.jit.si/SpaceScopeBlackHoles', 0
            FROM instructors WHERE email = 'evance@astro.edu'
            AND NOT EXISTS (SELECT 1 FROM instructor_sessions WHERE title = 'Black Holes: Event Horizon');

            INSERT INTO instructor_sessions (instructor_id, title, topic, description, start_time, duration, status, meeting_link, student_count)
            SELECT id, 'Intro to Orbital Mechanics', 'Rocket Science', 'Basics of Hohmann transfer orbits.', NOW() - INTERVAL '3 days', 60, 'COMPLETED', 'https://meet.jit.si/SpaceScopeOrbital', 89
            FROM instructors WHERE email = 'evance@astro.edu'
            AND NOT EXISTS (SELECT 1 FROM instructor_sessions WHERE title = 'Intro to Orbital Mechanics');

            -- Seed Sessions for Prof. Marcus Chen
            INSERT INTO instructor_sessions (instructor_id, title, topic, description, start_time, duration, status, meeting_link, student_count)
            SELECT id, 'Exoplanet Atmospheres', 'Exobiology', 'Analyzing spectroscopy data from JWST to find biosignatures.', NOW() + INTERVAL '5 hours', 60, 'UPCOMING', 'https://meet.jit.si/SpaceScopeExo', 0
            FROM instructors WHERE email = 'mchen@cosmos.org'
            AND NOT EXISTS (SELECT 1 FROM instructor_sessions WHERE title = 'Exoplanet Atmospheres');
        `);

        const reportCheck = await db.query('SELECT COUNT(*) FROM reports');
        if (parseInt(reportCheck.rows[0].count) === 0) {
            console.log('Seeding initial reports...');
            await db.query(`
                INSERT INTO reports (title, content, username, category, status, images) VALUES
                ('Strange Aurora over Norway', 'Captured these unusual violet pillars during the last solar flare.', 'StarGazer_99', 'Observation', 'APPROVED', '{"/assets/community/aurora_fix.png"}'),
                ('Meteor Impact? Small Crater Found', 'Found this small impact site while hiking. Looks fresh.', 'CitizenScience', 'Report', 'PENDING', '{"https://images-assets.nasa.gov/image/PIA23351/PIA23351~orig.jpg"}')
            `);
        }

        const doubtCheck = await db.query('SELECT COUNT(*) FROM doubts');
        if (parseInt(doubtCheck.rows[0].count) === 0) {
            console.log('Seeding initial doubts...');
            const res = await db.query(`
                INSERT INTO doubts (username, question) VALUES
                ('AstroNewbie', 'How do I calculate the orbital velocity of a satellite around Earth?')
                RETURNING id
            `);
            const doubtId = res.rows[0].id;
            await db.query(`
                INSERT INTO doubt_replies (doubt_id, username, text) VALUES
                ($1, 'CosmicGuru', 'You can use the formula v = sqrt(GM/r).')
            `, [doubtId]);
        }

        await db.query(`ALTER TABLE instructors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'OFFLINE'`);
        await db.query(`ALTER TABLE instructors ADD COLUMN IF NOT EXISTS session_title TEXT`);
        await db.query(`ALTER TABLE instructors ADD COLUMN IF NOT EXISTS session_link TEXT`);
        await db.query(`ALTER TABLE instructors ADD COLUMN IF NOT EXISTS upcoming_session TIMESTAMP`);

        console.log('PostgreSQL Database Initialized and Seeded');
    } catch (err) {
        console.error('Database Initialization Failed:', err);
    }
};

initDB();

// Import notification routes
const notificationRoutes = require('./routes/notifications');

// Use notification routes
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
    res.send('SpaceScope Server is Running on PostgreSQL Node!');
});

// --- INSTRUCTOR APIS ---
app.post('/api/instructor-applications', async (req, res) => {
    try {
        const { fullName, email, specialization, bio, resume, certificate, idCard } = req.body;
        const result = await db.query(
            'INSERT INTO instructor_applications (full_name, email, specialization, bio, resume, certificate, id_card) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [fullName, email, specialization, bio, resume, certificate, idCard]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/instructor-applications', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM instructor_applications WHERE status = \'PENDING\' ORDER BY applied_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/verify-instructor', async (req, res) => {
    const { id, status, adminNote } = req.body;
    try {
        // 1. Update application status
        const appResult = await db.query(
            'UPDATE instructor_applications SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        const applicant = appResult.rows[0];

        // 2. If approved, transfer to instructors table
        if (status === 'APPROVED' && applicant) {
            await db.query(
                `INSERT INTO instructors (name, email, role, location, image, specialization) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 ON CONFLICT (email) DO NOTHING`,
                [applicant.full_name, applicant.email, applicant.specialization, 'Remote Node', `https://ui-avatars.com/api/?name=${encodeURIComponent(applicant.full_name)}&background=22a6b3&color=fff`, applicant.specialization]
            );

            // Generate a random access code for the approved instructor
            const accessCode = 'CMD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            await db.query(
                'UPDATE instructors SET access_code = $1 WHERE email = $2',
                [accessCode, applicant.email]
            );
            console.log(`Generated access code for ${applicant.email}: ${accessCode}`);
        }

        res.json({ message: `Application ${status.toLowerCase()} successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/instructors', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM instructors ORDER BY approved_date DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/instructors/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM instructors WHERE id = $1', [req.params.id]);
        res.json({ message: 'Instructor access revoked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SESSION MANAGEMENT APIS ---
app.post('/api/instructor-login', async (req, res) => {
    const { email, accessCode } = req.body;
    try {
        const result = await db.query(
            'SELECT * FROM instructors WHERE email = $1 AND access_code = $2',
            [email, accessCode]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(401).json({ error: 'Invalid credentials or non-verified access code.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/instructor-sessions', async (req, res) => {
    const { instructorId } = req.query;
    try {
        const result = await db.query(
            'SELECT * FROM instructor_sessions WHERE instructor_id = $1 ORDER BY start_time ASC',
            [instructorId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/instructor-sessions', async (req, res) => {
    const { instructor_id, title, topic, description, start_time, duration } = req.body;
    // Auto-generate a secure meeting link using Jitsi as a proxy
    const meetingLink = `https://meet.jit.si/SpaceScope_${Math.random().toString(36).substring(7)}`;
    try {
        const result = await db.query(
            `INSERT INTO instructor_sessions (instructor_id, title, topic, description, start_time, duration, meeting_link) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [instructor_id, title, topic, description, start_time, duration, meetingLink]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/instructor-sessions/:id', async (req, res) => {
    const { status, student_count } = req.body;
    try {
        const result = await db.query(
            'UPDATE instructor_sessions SET status = COALESCE($1, status), student_count = COALESCE($2, student_count) WHERE id = $3 RETURNING *',
            [status, student_count, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sessions/public', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, i.name as instructor_name, i.image as instructor_image, i.specialization 
            FROM instructor_sessions s
            JOIN instructors i ON s.instructor_id = i.id
            WHERE s.status IN ('UPCOMING', 'LIVE')
            ORDER BY s.status DESC, s.start_time ASC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/instructors/:id/status', async (req, res) => {
    const { status, sessionTitle, sessionLink } = req.body;
    try {
        const result = await db.query(
            'UPDATE instructors SET status = $1, session_title = $2, session_link = $3 WHERE id = $4 RETURNING *',
            [status, sessionTitle, sessionLink, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- COMMUNITY APIS ---
app.post('/api/reports', async (req, res) => {
    try {
        const { title, content, user, category, images } = req.body;
        const result = await db.query(
            'INSERT INTO reports (title, content, username, category, images) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, content, user, category, images]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports', async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM reports';
        let params = [];
        if (status) {
            query += ' WHERE status = $1';
            params.push(status);
        }
        query += ' ORDER BY timestamp DESC';
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reports/verify', async (req, res) => {
    const { id, status } = req.body;
    try {
        await db.query('UPDATE reports SET status = $1 WHERE id = $2', [status, id]);
        res.json({ message: `Report ${status.toLowerCase()}ed` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/doubts', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM doubts ORDER BY timestamp DESC');
        const doubts = result.rows;

        // Fetch replies for each doubt
        const doubtsWithReplies = await Promise.all(doubts.map(async (d) => {
            const replyResult = await db.query('SELECT * FROM doubt_replies WHERE doubt_id = $1 ORDER BY timestamp ASC', [d.id]);
            return { ...d, replies: replyResult.rows };
        }));

        res.json(doubtsWithReplies);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/doubts', async (req, res) => {
    try {
        const { user, question } = req.body;
        const result = await db.query(
            'INSERT INTO doubts (username, question) VALUES ($1, $2) RETURNING *',
            [user, question]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/doubts/:id/replies', async (req, res) => {
    try {
        const { user, text } = req.body;
        const result = await db.query(
            'INSERT INTO doubt_replies (doubt_id, username, text) VALUES ($1, $2, $3) RETURNING *',
            [req.params.id, user, text]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper to convert NOAA DSCOVR array-of-arrays to objects
const formatDSCVR = (data) => {
    if (!data || !Array.isArray(data) || data.length < 2) return [];
    const headers = data[0];
    return data.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
    });
};

// Proxy Routes
const fetchNOAA = async (url) => {
    return axios.get(url, {
        headers: {
            'User-Agent': 'SpaceScope/1.0 (Contact: space-labs@googledemo.com)'
        },
        timeout: 10000
    });
};

app.get('/api/solar-wind', async (req, res) => {
    try {
        const response = await fetchNOAA('https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json');
        res.json(formatDSCVR(response.data));
    } catch (error) {
        console.error('Error fetching solar wind:', error.message);
        res.status(500).json({ error: 'Failed to fetch solar wind data', message: error.message });
    }
});

app.get('/api/magnetic-field', async (req, res) => {
    try {
        const response = await fetchNOAA('https://services.swpc.noaa.gov/products/solar-wind/mag-5-minute.json');
        res.json(formatDSCVR(response.data));
    } catch (error) {
        console.error('Error fetching magnetic field:', error.message);
        res.status(500).json({ error: 'Failed to fetch magnetic field data', message: error.message });
    }
});

app.get('/api/k-index', async (req, res) => {
    try {
        const response = await fetchNOAA('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching K-index:', error.message);
        res.status(500).json({ error: 'Failed to fetch K-index data', message: error.message });
    }
});

app.get('/api/proton-flux', async (req, res) => {
    try {
        const response = await fetchNOAA('https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching proton flux:', error.message);
        res.status(500).json({ error: 'Failed to fetch proton flux data' });
    }
});

app.get('/api/solar-flares', async (req, res) => {
    try {
        const now = new Date();
        const endDate = now.toISOString().split('T')[0];
        const startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const response = await fetchNOAA(`https://kauai.ccmc.gsfc.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching solar flares:', error.message);
        // Return empty array instead of error - flares are optional
        res.json([]);
    }
});

app.get('/api/cme', async (req, res) => {
    try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
        const response = await axios.get(`https://kauai.ccmc.gsfc.nasa.gov/DONKI/CME?startDate=${startDate}&endDate=${endDate}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching CME:', error.message);
        res.status(500).json({ error: 'Failed to fetch CME data' });
    }
});

// ISS Proxies
app.get('/api/iss-now', async (req, res) => {
    try {
        // Switching to wheretheiss.at for better reliability
        const response = await axios.get('https://api.wheretheiss.at/v1/satellites/25544');
        // Map to expected format if needed, but the original frontend might expect open-notify format
        // Open-notify: { iss_position: { latitude, longitude }, message: "success", timestamp: ... }
        // Wheretheiss: { latitude, longitude, ... }
        const data = response.data;
        res.json({
            iss_position: {
                latitude: data.latitude.toString(),
                longitude: data.longitude.toString()
            },
            message: "success",
            timestamp: data.timestamp
        });
    } catch (error) {
        console.error('Error fetching ISS position:', error.message);
        res.status(500).json({ error: 'Failed to fetch ISS position' });
    }
});

app.get('/api/iss-pass', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) return res.status(400).json({ error: 'Latitude and Longitude required' });

        const response = await axios.get(`http://api.open-notify.org/iss-pass.json?lat=${lat}&lon=${lon}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching ISS pass:', error.message);
        // Return 503 to signal service unavailability specifically
        res.status(503).json({ error: 'ISS Pass prediction service is currently offline' });
    }
});

// Meteor Shower Proxy
app.get('/api/meteor-showers', async (req, res) => {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/astronexus/MeteorShowerCatalog/master/catalog.json');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching meteor showers:', error.message);
        res.status(500).json({ error: 'Failed to fetch meteor shower data' });
    }
});

// Asteroid Proxy (NeoWS Feed)
app.get('/api/asteroids', async (req, res) => {
    try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const startStr = today.toISOString().split('T')[0];
        const endStr = tomorrow.toISOString().split('T')[0];

        // Fetching today and tomorrow for a better radar view
        const response = await axios.get(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${startStr}&end_date=${endStr}&api_key=DEMO_KEY`);
        res.json(response.data);
    } catch (error) {
        console.warn('NASA API Throttled, providing simulation data');
        // Fallback to simulation data instead of empty objects
        const mockData = {
            element_count: 3,
            near_earth_objects: {
                "2026-01-23": [
                    {
                        id: "MOCK_01",
                        name: "(SIMULATION) 2011 AG5",
                        is_potentially_hazardous_asteroid: true,
                        estimated_diameter: { kilometers: { estimated_diameter_min: 0.14, estimated_diameter_max: 0.23 } },
                        close_approach_data: [{
                            close_approach_date: "2026-01-23",
                            relative_velocity: { kilometers_per_hour: "54200" },
                            miss_distance: { kilometers: "1850000" }
                        }]
                    },
                    {
                        id: "MOCK_02",
                        name: "(SIMULATION) 2024 BX1",
                        is_potentially_hazardous_asteroid: false,
                        estimated_diameter: { kilometers: { estimated_diameter_min: 0.05, estimated_diameter_max: 0.08 } },
                        close_approach_data: [{
                            close_approach_date: "2026-01-23",
                            relative_velocity: { kilometers_per_hour: "42000" },
                            miss_distance: { kilometers: "32000000" }
                        }]
                    },
                    {
                        id: "MOCK_03",
                        name: "(SIMULATION) Apophis",
                        is_potentially_hazardous_asteroid: true,
                        estimated_diameter: { kilometers: { estimated_diameter_min: 0.31, estimated_diameter_max: 0.45 } },
                        close_approach_data: [{
                            close_approach_date: "2026-01-23",
                            relative_velocity: { kilometers_per_hour: "108000" },
                            miss_distance: { kilometers: "31000" }
                        }]
                    }
                ]
            },
            status: "Simulation Mode (NASA API Throttled)"
        };
        res.status(200).json(mockData);
    }
});

// Asteroid Lookup Proxy (Specific ID)
app.get('/api/asteroid/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (id.startsWith('MOCK_')) {
            // Return simulation details for mock IDs
            return res.json({
                name: id === 'MOCK_01' ? "2011 AG5" : id === 'MOCK_03' ? "Apophis" : "2024 BX1",
                designation: id,
                orbital_data: {
                    orbit_id: "SIM-882",
                    orbit_class: { orbit_class_type: "APO", orbit_class_description: "Apollo-class (Simulated)" },
                    minimum_orbit_intersection: "0.0002"
                }
            });
        }
        const response = await axios.get(`https://api.nasa.gov/neo/rest/v1/neo/${id}?api_key=DEMO_KEY`);
        res.json(response.data);
    } catch (error) {
        console.error(`Error fetching asteroid ${req.params.id}:`, error.message);
        res.status(500).json({ error: 'Failed to fetch asteroid details' });
    }
});

// Space Launch Proxy (The Space Devs LL2)
app.get('/api/launches/upcoming', async (req, res) => {
    try {
        const response = await axios.get('https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=10');
        res.json(response.data);
    } catch (error) {
        console.warn('Upcoming launches throttled, using simulation');
        res.json({
            results: [
                {
                    id: 'u-sim-1',
                    name: '(SIMULATION) Artemis II',
                    status: { name: 'Scheduled' },
                    net: '2025-09-01T12:00:00Z',
                    mission: { description: 'First crewed flight of SLS/Orion around the Moon.', type: 'Lunar' },
                    launch_service_provider: { name: 'NASA' },
                    pad: { location: { name: 'Kennedy Space Center, FL' } },
                    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Artemis_1_launch_SLS_liftoff_closeup.jpg/800px-Artemis_1_launch_SLS_liftoff_closeup.jpg'
                }
            ]
        });
    }
});

app.get('/api/launches/previous', async (req, res) => {
    try {
        const response = await axios.get('https://lldev.thespacedevs.com/2.2.0/launch/previous/?limit=10');
        res.json(response.data);
    } catch (error) {
        console.warn('Previous launches throttled, using simulation');
        res.json({
            results: [
                {
                    id: 'p-sim-1',
                    name: '(SIMULATION) Chandrayaan-3',
                    status: { name: 'Success' },
                    net: '2023-07-14T09:05:00Z',
                    mission: { description: 'ISRO\'s third lunar exploration mission.', type: 'Lunar' },
                    launch_service_provider: { name: 'ISRO' },
                    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Chandrayaan-3_Launch.jpg/800px-Chandrayaan-3_Launch.jpg'
                }
            ]
        });
    }
});

app.get('/api/space-events', async (req, res) => {
    try {
        const response = await axios.get('https://lldev.thespacedevs.com/2.2.0/event/upcoming/?limit=5');
        res.json(response.data);
    } catch (error) {
        res.json({ results: [] });
    }
});

// NASA EONET Proxy (Natural Events)
app.get('/api/eonet', async (req, res) => {
    try {
        // Fetch active events (limit to recent days if needed, but default is active)
        const response = await axios.get('https://eonet.gsfc.nasa.gov/api/v2.1/events?status=open&limit=20');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching EONET data:', error.message);
        res.status(500).json({ error: 'Failed to fetch natural events' });
    }
});

// Socket.io for SpaceScope Meet & Real-time Chat
const rooms = {};

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Chat Logic
    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined chat room ${roomId}`);
    });

    socket.on('send_message', (data) => {
        // data: { roomId, sender, text, timestamp }
        io.to(data.roomId).emit('receive_message', data);
    });

    // WebRTC Logic (Existing)
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);

        // Notify others in the room
        socket.to(roomId).emit('user-joined', socket.id);
    });

    socket.on('offer', ({ target, sdps }) => {
        socket.to(target).emit('offer', { sender: socket.id, sdps });
    });

    socket.on('answer', ({ target, sdps }) => {
        socket.to(target).emit('answer', { sender: socket.id, sdps });
    });

    socket.on('ice-candidate', ({ target, candidate }) => {
        socket.to(target).emit('ice-candidate', { sender: socket.id, candidate });
    });

    socket.on('disconnecting', () => {
        for (const room of socket.rooms) {
            if (room !== socket.id) {
                socket.to(room).emit('user-left', socket.id);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Explicit error handling for the server
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`ERROR: Port ${PORT} is already in use by another process.`);
        process.exit(1);
    } else {
        console.error('Server Error:', error);
    }
});

// Global Error Handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
    console.error('FATAL ERROR (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL ERROR (Unhandled Rejection):', reason);
});

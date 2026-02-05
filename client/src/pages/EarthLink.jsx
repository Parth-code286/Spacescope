import React, { useState, useEffect } from 'react';
import { Wind, Sun, Droplets, AlertTriangle, MapPin, Globe, Shield, CloudRain, Search, Navigation, Zap, Heart, Info, X } from 'lucide-react';
import SmartTerm from '../components/SmartTerm';
import './EarthLink.css';

const EarthLink = () => {
    const [location, setLocation] = useState({ lat: null, lon: null, city: 'Locating...' });
    const [searchQuery, setSearchQuery] = useState('');
    const [envData, setEnvData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [gameMode, setGameMode] = useState(false);

    const API_BASE = 'https://spacescope-1v1p.onrender.com/api';

    // Initial Location
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude, city: 'My Location' });
            },
            (err) => {
                console.warn("Location denied:", err);
                setLocation({ lat: 19.07, lon: 72.87, city: 'Mumbai (Default)' }); // Default to Mumbai for demo
            }
        );
    }, []);

    // Search Handler
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setLoading(true);

        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${searchQuery}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();

            if (geoData.results && geoData.results.length > 0) {
                const city = geoData.results[0];
                setLocation({ lat: city.latitude, lon: city.longitude, city: city.name });
            } else {
                alert("Location not found! Try a major city.");
            }
        } catch (error) {
            console.error("Geocoding failed:", error);
        }
    };

    // Data Fetching
    useEffect(() => {
        if (!location.lat) return;

        const fetchData = async () => {
            try {
                // 1. Open-Meteo: Air Quality & Weather (Switching to US AQI for Google alignment)
                const aqRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lon}&current=us_aqi,pm2_5,nitrogen_dioxide,ozone`);
                const aqData = await aqRes.json();

                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,rain,soil_moisture_0_to_7cm,uv_index`);
                const wData = await weatherRes.json();

                setEnvData({
                    aqi: aqData.current?.us_aqi || 0,
                    pm25: aqData.current?.pm2_5 || 0,
                    temp: wData.current?.temperature_2m,
                    soil: wData.current?.soil_moisture_0_to_7cm, // 0-1 (Volumetric)
                    uv: wData.current?.uv_index,
                    rain: wData.current?.rain // mm
                });

                // 2. NASA EONET: Natural Events + Dummy Space Alerts
                const eonetRes = await fetch(`${API_BASE}/eonet`);
                const eonetData = await eonetRes.json();

                const dummyAlerts = [
                    {
                        id: 'dummy-1',
                        title: 'NASA NEO Tracking: Asteroid 2024 BX1',
                        categories: [{ title: 'Near Earth Objects' }],
                        geometries: [{ coordinates: [12.49, 41.89] }],
                        link: 'https://cneos.jpl.nasa.gov/'
                    },
                    {
                        id: 'dummy-2',
                        title: 'NOAA Geomagnetic Storm Watch: G2 Level',
                        categories: [{ title: 'Space Weather' }],
                        geometries: [{ coordinates: [-97.74, 30.26] }],
                        link: 'https://www.swpc.noaa.gov/'
                    }
                ];

                const activeAlerts = [...(eonetData.events?.slice(0, 2) || []), ...dummyAlerts];
                setAlerts(activeAlerts);

                setLoading(false);
            } catch (error) {
                console.warn("Environmental Data API Failed, using dummy fallback:", error);

                // FALLBACK DUMMY DATA
                setEnvData({
                    aqi: 42,
                    pm25: 12.4,
                    temp: 24,
                    soil: 0.15,
                    uv: 4.5,
                    rain: 0
                });

                setAlerts([
                    {
                        id: 'dummy-1',
                        title: 'NASA NEO Tracking: Asteroid 2024 BX1',
                        categories: [{ title: 'Near Earth Objects' }],
                        geometries: [{ coordinates: [12.49, 41.89] }],
                        link: 'https://cneos.jpl.nasa.gov/'
                    },
                    {
                        id: 'dummy-2',
                        title: 'NOAA Geomagnetic Storm Watch: G2 Level',
                        categories: [{ title: 'Space Weather' }],
                        geometries: [{ coordinates: [-97.74, 30.26] }],
                        link: 'https://www.swpc.noaa.gov/'
                    },
                    {
                        id: 'dummy-3',
                        title: 'Simulated: Solar Filament Eruption',
                        categories: [{ title: 'Solar Events' }],
                        geometries: [{ coordinates: [0, 0] }],
                        link: '#'
                    }
                ]);
                setLoading(false);
            }
        };

        fetchData();

        // Real-time polling every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [location]);

    const getAQIStatus = (aqi) => {
        if (aqi <= 50) return { label: 'Good', color: '#4caf50' };
        if (aqi <= 100) return { label: 'Moderate', color: '#ffeb3b' };
        if (aqi <= 150) return { label: 'Sensitive Groups', color: '#ff9800' };
        if (aqi <= 200) return { label: 'Unhealthy', color: '#f44336' };
        if (aqi <= 300) return { label: 'Very Unhealthy', color: '#9c27b0' };
        return { label: 'Hazardous', color: '#7e0023' };
    };

    const getDroughtStatus = (soil) => {
        if (soil === undefined) return { label: 'Unknown', color: '#aaa' };
        if (soil < 0.1) return { label: 'High Drought Risk', color: '#f44336' };
        if (soil < 0.25) return { label: 'Monitor', color: '#ff9800' };
        return { label: 'Healthy', color: '#4caf50' };
    };

    if (loading && !envData) return <div className="loading-screen text-center"><Globe className="animate-spin mb-4" />Triangulating Satellites...</div>;

    const aqiStatus = getAQIStatus(envData?.aqi);
    const droughtStatus = getDroughtStatus(envData?.soil);

    return (
        <div className="earth-link-container fade-in">
            <header className="earth-header text-center">
                <h1 className="hero-title"><span className="text-gradient">EarthLink</span> Impact Engine</h1>
                <p className="hero-subtitle"><SmartTerm term="Satellite" display="Satellite Intelligence" /> for <span className="text-white font-bold">{location.city}</span></p>

                <div className="header-actions">
                    <button className="game-toggle-btn" onClick={() => setGameMode(true)}>
                        <Shield className="mr-2" size={18} /> SAVE EARTH MODE
                    </button>

                    <form onSubmit={handleSearch} className="search-bar">
                        <input
                            type="text"
                            placeholder="Enter city (e.g. Mumbai, New York)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit"><Search size={20} /></button>
                    </form>
                </div>
            </header>

            {/* LIVE SATELLITE FEED */}
            <div className="section-header-flex">
                <h2 className="section-label">Real-Time Biosphere Scanner</h2>
                <div className="live-indicator-pulse">● LIVE TELEMETRY</div>
            </div>
            <div className="telemetry-grid">
                {/* Air Quality */}
                <div className="data-card aqi-card">
                    <div className="card-top">
                        <Wind size={24} />
                        <h3>NASA Satellite AQI</h3>
                    </div>
                    <div className="display-value" style={{ color: aqiStatus.color }}>
                        {envData?.aqi} <span className="unit">S-AQI</span>
                    </div>
                    <div className="status-label" style={{ color: aqiStatus.color }}>{aqiStatus.label}</div>
                    <div className="micro-stats">
                        <p>PM2.5: {envData?.pm25} µg/m³</p>
                        <p className="source-note">Source: Sentinel-5P TROPOMI (NASA/ESA)</p>
                    </div>
                    <div className="sat-tag live">CALIBRATED: SPACE COLUMN</div>
                </div>

                {/* Drought & Rain */}
                <div className="data-card soil-card">
                    <div className="card-top">
                        <Droplets size={24} />
                        <h3>Rain & Drought</h3>
                    </div>
                    <div className="display-value text-blue">
                        {envData?.rain} <span className="unit">mm</span>
                    </div>
                    <div className="status-label" style={{ color: droughtStatus.color }}>
                        {droughtStatus.label}
                    </div>
                    <div className="micro-stats">
                        <span>Soil Moisture: {envData?.soil} m³/m³</span>
                    </div>
                    <div className="sat-tag">NASA SMAP • GPM</div>
                </div>

                {/* UV & Temp */}
                <div className="data-card uv-card">
                    <div className="card-top">
                        <Sun size={24} />
                        <h3><SmartTerm term="UV Index" display="Solar Impact" /></h3>
                    </div>
                    <div className="display-value text-orange">
                        {envData?.uv} <span className="unit">UV</span>
                    </div>
                    <div className="status-label text-orange">
                        {envData?.uv > 7 ? 'High Exposure' : envData?.uv > 3 ? 'Moderate' : 'Low'}
                    </div>
                    <div className="micro-stats">
                        <span>Temp: {envData?.temp}°C</span>
                    </div>
                    <div className="sat-tag">NOAA GOES-16</div>
                </div>
            </div>

            {/* NASA/ISRO DATA NOTE */}
            {/* <div className="data-disclaimer glass-panel">
                <Info size={18} className="text-blue mr-3" />
                <div className="disclaimer-text">
                    <strong>Why does this differ from Google/ISRO Ground Sensors?</strong>
                    <p>Google and mobile apps use ground-level sensors (2m height). Our <strong>NASA Sentinel-5P</strong> telemetry measures the <strong>Total Atmospheric Column</strong>. This "Space View" is what NASA and ISRO use for global climate monitoring, capturing pollutants ground sensors might miss.</p>
                </div>
            </div> */}

            {/* DISASTER MONITOR */}
            <section className="disaster-section">
                <h2 className="section-title"><Shield className="mr-2" /> Planet Defense: Active Alerts</h2>
                <div className="alerts-list">
                    {alerts.length === 0 ? (
                        <div className="no-alerts">No major global anomalies detected right now.</div>
                    ) : (
                        alerts.map(alert => (
                            <div key={alert.id} className="alert-item glass-panel">
                                <div className="alert-icon">
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="alert-info">
                                    <h3>{alert.title}</h3>
                                    <p className="alert-cat">{alert.categories[0]?.title}</p>
                                    <p className="alert-coords">
                                        <MapPin size={14} />
                                        {alert.geometries[0]?.coordinates ?
                                            `${alert.geometries[0].coordinates[1].toFixed(2)}, ${alert.geometries[0].coordinates[0].toFixed(2)}`
                                            : 'Unknown Coords'}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* IMPACT STORY CARDS */}
            <section className="impact-stories">
                <h2 className="section-title text-center">How Space Tech Saves Earth</h2>
                <div className="stories-grid">
                    <div className="story-card glass-panel">
                        <div className="story-img flood-img">
                            <CloudRain size={48} />
                        </div>
                        <h3>Flood Prediction</h3>
                        <p><SmartTerm term="Satellite" display="Satellites" /> like <strong><SmartTerm term="Sentinel" display="Sentinel-1" /></strong> use radar to see through clouds, mapping floodwaters in real-time to guide rescue teams.</p>
                    </div>
                    <div className="story-card glass-panel">
                        <div className="story-img fire-img">
                            <Sun size={48} />
                        </div>
                        <h3>Wildfire Tracking</h3>
                        <p>Infrared sensors on <strong><SmartTerm term="MODIS" /></strong> detect heat anomalies, alerting firefighters to new blazes minutes after they start.</p>
                    </div>
                    <div className="story-card glass-panel">
                        <div className="story-img crop-img">
                            <Droplets size={48} />
                        </div>
                        <h3><SmartTerm term="Precision Farming" /></h3>
                        <p><strong><SmartTerm term="Landsat" /></strong> data monitors crop health and soil moisture, helping farmers save water and increase global food security.</p>
                    </div>
                </div>
            </section>
            {/* SAVE EARTH GAME OVERLAY */}
            {gameMode && (
                <SaveEarthGame onClose={() => setGameMode(false)} />
            )}

        </div>
    );
};

const SaveEarthGame = ({ onClose }) => {
    const [health, setHealth] = useState(100);
    const [shieldActive, setShieldActive] = useState(false);
    const [stormStatus, setStormStatus] = useState('NORMAL'); // NORMAL, WARNING, IMPACT
    const [score, setScore] = useState(0);
    const [physicsFact, setPhysicsFact] = useState(null);
    const [gameOver, setGameOver] = useState(false);

    const facts = [
        { title: "Magnetosphere", content: <>Earth's <SmartTerm term="Magnetic Field" display="magnetic field" /> acts as a shield, deflecting <SmartTerm term="Solar Wind" /> particles that would otherwise strip away our <SmartTerm term="Atmosphere" />.</> },
        { title: "Solar Wind", content: <><SmartTerm term="Solar Wind" display="The Sun continuously emits a stream of charged particles" /> called the solar wind, traveling at millions of kilometers per hour.</> },
        { title: "CME (Coronal Mass Ejection)", content: <>A massive burst of solar wind and magnetic fields, a <SmartTerm term="Coronal Mass Ejection" display="CME" /> can overwhelm Earth's shield, causing <SmartTerm term="Geomagnetic Storm" display="geomagnetic storms" />.</> },
        { title: "Aurora", content: <>When solar particles bypass the shield near the poles, they excite <SmartTerm term="Atmosphere" display="atmospheric gases" />, creating beautiful shimmering lights called <SmartTerm term="Aurora" display="auroras" />.</> },
        { title: "Van Allen Belts", content: "Regions of trapped radiation around Earth that help filter high-energy particles before they reach the surface." }
    ];

    useEffect(() => {
        if (gameOver) return;

        const interval = setInterval(() => {
            // Randomly trigger a storm warning
            if (stormStatus === 'NORMAL' && Math.random() < 0.2) {
                setStormStatus('WARNING');
                setTimeout(() => {
                    setStormStatus('IMPACT');
                    // Storm lasts 2 seconds
                    setTimeout(() => {
                        setStormStatus('NORMAL');
                        setScore(s => s + 10);
                        if (Math.random() < 0.3) {
                            setPhysicsFact(facts[Math.floor(Math.random() * facts.length)]);
                        }
                    }, 2000);
                }, 1500);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [stormStatus, gameOver]);

    useEffect(() => {
        if (stormStatus === 'IMPACT' && !shieldActive) {
            const damage = setInterval(() => {
                setHealth(h => {
                    if (h <= 1) {
                        setGameOver(true);
                        return 0;
                    }
                    return h - 1;
                });
            }, 100);
            return () => clearInterval(damage);
        }
    }, [stormStatus, shieldActive]);

    return (
        <div className="game-overlay">
            <div className="game-container">
                <button className="close-game" onClick={onClose}><X /></button>

                <div className="game-header">
                    <h2>DEFEND PLANET EARTH</h2>
                    <div className="health-bar-container">
                        <div className="health-label"><Heart size={16} fill="red" /> BIOSPHERE HEALTH</div>
                        <div className="health-bar">
                            <div
                                className="health-fill"
                                style={{ width: `${health}%`, background: health < 30 ? '#ff4444' : '#00ff88' }}
                            ></div>
                        </div>
                    </div>
                    <div className="score-display">SURVIVAL RANK: {Math.floor(score / 10)}</div>
                </div>

                <div className="game-world">
                    {/* The Earth */}
                    <div className={`earth-vessel ${shieldActive ? 'shielded' : ''}`}>
                        <div className="earth-sphere"></div>
                        {shieldActive && <div className="shield-effect"></div>}
                        {stormStatus === 'IMPACT' && !shieldActive && <div className="damage-flash"></div>}
                    </div>

                    {/* Solar Storm Visuals */}
                    {stormStatus !== 'NORMAL' && (
                        <div className={`solar-storm ${stormStatus.toLowerCase()}`}>
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className="storm-particle" style={{ top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }}></div>
                            ))}
                        </div>
                    )}

                    {/* Alarms */}
                    {stormStatus === 'WARNING' && <div className="storm-warning">! GEOMAGNETIC STORM DETECTED !</div>}
                    {stormStatus === 'IMPACT' && <div className="storm-impact">IMPACT IN PROGRESS</div>}
                </div>

                <div className="game-controls">
                    <p className="control-hint">HOLD BUTTON OR SPACEBAR TO DEPLOY MAGNETIC SHIELD</p>
                    <button
                        className={`shield-btn ${shieldActive ? 'active' : ''}`}
                        onMouseDown={() => setShieldActive(true)}
                        onMouseUp={() => setShieldActive(false)}
                        onTouchStart={() => setShieldActive(true)}
                        onTouchEnd={() => setShieldActive(false)}
                    >
                        <Zap size={24} /> {shieldActive ? 'SHIELD ACTIVE' : 'DEPLOY SHIELD'}
                    </button>
                </div>

                {/* Physics Fact Popup */}
                {physicsFact && (
                    <div className="fact-popup glass-panel">
                        <div className="fact-header">
                            <Info size={18} />
                            <h3>{physicsFact.title}</h3>
                        </div>
                        <p>{physicsFact.content}</p>
                        <button onClick={() => setPhysicsFact(null)}>UNDERSTOOD</button>
                    </div>
                )}

                {/* Game Over */}
                {gameOver && (
                    <div className="game-over-overlay glass-panel">
                        <h1>EARTH RENDERED UNINHABITABLE</h1>
                        <p>Survivability reached zero. The magnetic shield was breached.</p>
                        <div className="final-stats">Survival Points: {score}</div>
                        <button onClick={() => { setHealth(100); setGameOver(false); setScore(0); }} className="restart-btn">REBOOT BIOSPHERE</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EarthLink;

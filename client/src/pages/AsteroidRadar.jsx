import React, { useState, useEffect, useRef } from 'react';
import { Search, Info, AlertCircle, Calendar, Target, Shield, Gauge, Move, Globe, Orbit, Zap, Share2, Rocket } from 'lucide-react';
import SmartTerm from '../components/SmartTerm';
import './AsteroidRadar.css';

const AsteroidRadar = () => {
    const [asteroids, setAsteroids] = useState([]);
    const [stats, setStats] = useState({ total: 0, hazardous: 0, closest: null, largest: null });
    const [selectedAsteroid, setSelectedAsteroid] = useState(null);
    const [detailedData, setDetailedData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const canvasRef = useRef(null);

    const API_BASE = 'https://spacescope-1v1p.onrender.com/api';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/asteroids`);
                if (!res.ok) throw new Error("NASA API unavailable");
                const data = await res.json();

                // Flatten NASA's dated dictionary into a single array
                const neoData = data.near_earth_objects || {};
                const flatList = Object.values(neoData).flat();

                // Sorting by miss distance
                const sorted = flatList.sort((a, b) =>
                    parseFloat(a.close_approach_data[0].miss_distance.kilometers) -
                    parseFloat(b.close_approach_data[0].miss_distance.kilometers)
                );

                setAsteroids(sorted);

                if (sorted.length > 0) {
                    setStats({
                        total: sorted.length,
                        hazardous: sorted.filter(a => a.is_potentially_hazardous_asteroid).length,
                        closest: sorted[0],
                        largest: [...sorted].sort((a, b) =>
                            b.estimated_diameter.kilometers.estimated_diameter_max -
                            a.estimated_diameter.kilometers.estimated_diameter_max
                        )[0]
                    });

                    // Auto-select the closest asteroid
                    handleAsteroidClick(sorted[0]);
                }
            } catch (err) {
                console.warn("Asteroid Radar fetch failed, check server connection.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 300000); // Refresh every 5 mins
        return () => clearInterval(interval);
    }, []);

    const handleAsteroidClick = async (ast) => {
        setSelectedAsteroid(ast);
        setLoadingDetails(true);
        try {
            const res = await fetch(`${API_BASE}/asteroid/${ast.id}`);
            if (res.ok) {
                const data = await res.json();
                setDetailedData(data);
            }
        } catch (e) {
            console.warn("Failed to fetch asteroid details");
        } finally {
            setLoadingDetails(false);
        }
    };

    // Radar Visualization Logic
    const getCoordinates = (distance, angle) => {
        // Logarithmic scale for distance to fit both close and far objects
        // Max distance usually around 70 million km, min around 10k km
        // We'll map this to radius 0-140px
        const minKm = 10000;
        const maxKm = 80000000;
        const normalizedDist = Math.log10(distance) / Math.log10(maxKm);
        const radius = Math.max(20, Math.min(140, normalizedDist * 140)); // keep away from center

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return { x, y };
    };

    if (loading) return <div className="loading-screen">Activating Deep Space Radar...</div>;

    return (
        <div className="asteroid-radar-container">
            <header className="radar-page-header">
                <h1 className="page-title glow-text">
                    <span className="text-gradient"><SmartTerm term="Asteroid" /></span> Radar
                </h1>
                <div className="subtitle text-center text-secondary mb-8 -mt-6">
                    <SmartTerm term="NEO" display="Near-Earth Object" /> Surveillance Network
                </div>
            </header>

            <div className="radar-grid">

                {/* 1. The Radar Visualizer */}
                <div className="glass-panel radar-visual-panel">
                    <div className="radar-header">
                        <Radar className="card-icon animate-pulse" />
                        <h3>Live Detection</h3>
                    </div>
                    <div className="radar-display">
                        {/* Radar Circles */}
                        <div className="radar-circle c1"></div>
                        <div className="radar-circle c2"></div>
                        <div className="radar-circle c3"></div>
                        <div className="radar-sweep"></div>
                        <div className="earth-center"></div>

                        {/* Asteroid Dots */}
                        {asteroids.map((ast, idx) => {
                            // Generate a stable psuedo-random angle based on ID
                            const seed = ast.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            const angle = (seed % 360) * (Math.PI / 180);
                            const dist = parseFloat(ast.close_approach_data[0].miss_distance.kilometers);
                            const { x, y } = getCoordinates(dist, angle);

                            const isHazard = ast.is_potentially_hazardous_asteroid;
                            const isSelected = selectedAsteroid?.id === ast.id;

                            return (
                                <div
                                    key={ast.id}
                                    className={`asteroid-dot ${isHazard ? 'hazard' : ''} ${isSelected ? 'selected' : ''}`}
                                    style={{
                                        transform: `translate(${x}px, ${y}px)`,
                                        width: Math.max(4, Math.min(12, ast.estimated_diameter.kilometers.estimated_diameter_max * 10)) + 'px',
                                        height: Math.max(4, Math.min(12, ast.estimated_diameter.kilometers.estimated_diameter_max * 10)) + 'px',
                                    }}
                                    onClick={() => handleAsteroidClick(ast)}
                                    title={ast.name}
                                ></div>
                            );
                        })}
                    </div>
                    <div className="radar-legend">
                        <div className="legend-item"><span className="dot safe"></span> Safe</div>
                        <div className="legend-item"><span className="dot hazard"></span> Hazardous</div>
                        <div className="legend-item"><span className="dot selected"></span> Selected</div>
                    </div>
                </div>

                {/* 2. Detail Card */}
                <div className="glass-panel asteroid-detail-panel">
                    <div className="card-header">
                        <Database className="card-icon" />
                        <h3>Object Analysis</h3>
                    </div>
                    {selectedAsteroid ? (
                        <div className="detail-content">
                            <h2 className={`asteroid-name ${selectedAsteroid.is_potentially_hazardous_asteroid ? 'text-red-500' : 'text-blue-400'}`}>
                                {selectedAsteroid.name.replace(/[()]/g, '')}
                            </h2>
                            <div className="detail-row">
                                <span className="label"><SmartTerm term="Hazardous" display="Hazard Status" /></span>
                                <span className={`value badge ${selectedAsteroid.is_potentially_hazardous_asteroid ? 'bg-red-900 text-red-100' : 'bg-green-900 text-green-100'}`}>
                                    {selectedAsteroid.is_potentially_hazardous_asteroid ? 'POTENTIALLY HAZARDOUS' : 'SAFE'}
                                </span>
                            </div>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <Scale size={18} className="text-gray-400" />
                                    <div>
                                        <div className="label">Est. Diameter</div>
                                        <div className="value">
                                            {selectedAsteroid.estimated_diameter.kilometers.estimated_diameter_min.toFixed(2)} - {selectedAsteroid.estimated_diameter.kilometers.estimated_diameter_max.toFixed(2)} km
                                        </div>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <Move size={18} className="text-gray-400" />
                                    <div>
                                        <div className="label"><SmartTerm term="Velocity" /></div>
                                        <div className="value">
                                            {parseFloat(selectedAsteroid.close_approach_data[0].relative_velocity.kilometers_per_hour).toLocaleString()} km/h
                                        </div>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <Target size={18} className="text-gray-400" />
                                    <div>
                                        <div className="label"><SmartTerm term="Miss Distance" /></div>
                                        <div className="value">
                                            {parseFloat(selectedAsteroid.close_approach_data[0].miss_distance.kilometers).toLocaleString()} km
                                        </div>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <Database size={18} className="text-gray-400" />
                                    <div>
                                        <div className="label">Absolute Magnitude</div>
                                        <div className="value">{selectedAsteroid.absolute_magnitude_h} H</div>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <Info size={18} className="text-gray-400" />
                                    <div>
                                        <div className="label">Approach Time</div>
                                        <div className="value">{selectedAsteroid.close_approach_data[0].close_approach_date_full}</div>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <span className="text-gray-400 font-mono text-xs border rounded px-1">ID</span>
                                    <div>
                                        <div className="label">Orbiting Body / ID</div>
                                        <div className="value">
                                            {selectedAsteroid.close_approach_data[0].orbiting_body} / {selectedAsteroid.id}
                                        </div>
                                        {detailedData && (
                                            <div className="text-xs text-accent mt-1">
                                                Orbit ID: {detailedData.orbital_data.orbit_id} <br />
                                                Class: {detailedData.orbital_data.orbit_class.orbit_class_type}
                                            </div>
                                        )}
                                        {loadingDetails && <span className="text-xs text-yellow-400 animate-pulse">Scanning deep specs...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="select-prompt">Select an object on radar</div>
                    )}
                </div>

                {/* 3. Daily Summary */}
                <div className="glass-panel summary-panel">
                    <h3>Daily Report</h3>
                    <div className="stat-row">
                        <span>Total Objects</span>
                        <span className="stat-val">{stats.total}</span>
                    </div>
                    <div className="stat-row">
                        <span><SmartTerm term="Hazardous" /></span>
                        <span className={`stat-val ${stats.hazardous > 0 ? 'text-red-500' : 'text-green-400'}`}>{stats.hazardous}</span>
                    </div>
                    <div className="stat-row">
                        <span>Closest Approach</span>
                        <span className="stat-val text-sm">
                            {stats.closest ? `${parseFloat(stats.closest.close_approach_data[0].miss_distance.kilometers).toLocaleString()} km` : '--'}
                        </span>
                    </div>
                    <div className="stat-row">
                        <span>Largest Object</span>
                        <span className="stat-val text-sm">
                            {stats.largest ? `${stats.largest.estimated_diameter.kilometers.estimated_diameter_max.toFixed(2)} km` : '--'}
                        </span>
                    </div>
                </div >

                {/* 4. List View */}
                < div className="glass-panel list-panel" >
                    <div className="section-header">
                        <h2><SmartTerm term="Asteroid" /> Monitoring</h2>
                        <div className="discovery-stats">
                            <SmartTerm term="NEO" /> objects detected in proximity
                        </div>
                    </div>
                    <div className="asteroid-list">
                        {asteroids.map(ast => (
                            <div
                                key={ast.id}
                                className={`list-item ${selectedAsteroid?.id === ast.id ? 'active' : ''}`}
                                onClick={() => handleAsteroidClick(ast)}
                            >
                                <span className="name">{ast.name.replace(/[()]/g, '')}</span>
                                <span className={`hazard-dot ${ast.is_potentially_hazardous_asteroid ? 'hazard' : 'safe'}`}></span>
                            </div>
                        ))}
                    </div>
                </div >

            </div >
        </div >
    );
};

export default AsteroidRadar;

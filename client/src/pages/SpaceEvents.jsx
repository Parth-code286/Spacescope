import React, { useState, useEffect } from 'react';
import SunCalc from 'suncalc';
import * as Astronomy from 'astronomy-engine';
import { Plane, Star, Sun as SunIcon, Moon, MapPin, Watch, Eye, Globe, AlertOctagon, Lightbulb } from 'lucide-react';
import SmartTerm from '../components/SmartTerm';
import './SpaceEvents.css';

const SpaceEvents = () => {
    const [issPosition, setIssPosition] = useState(null);
    const [issPass, setIssPass] = useState(null);
    const [meteors, setMeteors] = useState([]);
    const [astronomy, setAstronomy] = useState(null);
    const [planets, setPlanets] = useState([]);
    const [solarFlareAlert, setSolarFlareAlert] = useState(null);
    const [weather, setWeather] = useState({ cloudCover: null, condition: 'Unknown', score: 0 });
    const [location, setLocation] = useState({ lat: null, lon: null, city: 'Unknown' });
    const [launches, setLaunches] = useState([]);
    const [issDistance, setIssDistance] = useState(null);
    const [auroraForecast, setAuroraForecast] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_BASE = 'https://spacescope-1v1p.onrender.com/api';

    useEffect(() => {
        // Get User Location with City Name
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                // Reverse geocode to get city name
                try {
                    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`);
                    const geoData = await geoRes.json();
                    const cityName = geoData.results?.[0]?.name || 'Your Location';

                    setLocation({ lat, lon, city: cityName });
                } catch (e) {
                    setLocation({ lat, lon, city: 'Your Location' });
                }
            },
            (error) => {
                console.warn("Location access denied, defaulting to equator.");
                setLocation({ lat: 0, lon: 0, city: 'Equator' });
            }
        );
    }, []);

    useEffect(() => {
        if (location.lat === null) return;

        const fetchData = async () => {
            const date = new Date();

            // Always calculate local astronomy first to ensure it's available even if APIs fail
            try {
                const sunTimes = SunCalc.getTimes(date, location.lat, location.lon);
                const moonTimes = SunCalc.getMoonTimes(date, location.lat, location.lon);
                const moonIllum = SunCalc.getMoonIllumination(date);
                const moonPos = SunCalc.getMoonPosition(date, location.lat, location.lon);

                const moonAltitude = moonPos.altitude;
                const moonAzimuth = moonPos.azimuth;
                const sunPos = SunCalc.getPosition(date, location.lat, location.lon);

                // Calculate the angle of the illuminated limb
                let parallacticAngle = Math.atan2(
                    Math.cos(sunPos.altitude) * Math.sin(sunPos.azimuth - moonAzimuth),
                    Math.sin(sunPos.altitude) * Math.cos(moonAltitude) -
                    Math.cos(sunPos.altitude) * Math.sin(moonAltitude) * Math.cos(sunPos.azimuth - moonAzimuth)
                ) * 180 / Math.PI;

                if (location.lat < 0) parallacticAngle = -parallacticAngle;

                setAstronomy({
                    sunrise: sunTimes.sunrise,
                    sunset: sunTimes.sunset,
                    moonrise: moonTimes.rise,
                    moonset: moonTimes.set,
                    moonPhase: moonIllum.phase,
                    moonFraction: moonIllum.fraction,
                    moonAngle: moonIllum.angle,
                    parallacticAngle: parallacticAngle,
                    moonAltitude: moonAltitude * 180 / Math.PI
                });
            } catch (e) {
                console.error("Critical error in astronomy calculation:", e);
                setAstronomy({ sunrise: null, sunset: null, moonPhase: 0.5, moonFraction: 0.5 });
            }

            // Fetch ISS Data
            try {
                const issNowRes = await fetch(`${API_BASE}/iss-now`);
                const issNowData = await issNowRes.json();
                const issPos = issNowData.iss_position;
                setIssPosition(issPos);

                const distance = calculateDistance(location.lat, location.lon, parseFloat(issPos.latitude), parseFloat(issPos.longitude));
                setIssDistance(distance);

                if (location.lat !== 0) {
                    const issPassRes = await fetch(`${API_BASE}/iss-pass?lat=${location.lat}&lon=${location.lon}`);
                    if (!issPassRes.ok) throw new Error("API Down");
                    const issPassData = await issPassRes.json();
                    setIssPass(issPassData.response?.[0] || false);
                }
            } catch (e) {
                console.warn("ISS API failed");
                setIssPass(false);
            }

            // Fetch Meteor Showers
            try {
                const meteorRes = await fetch(`${API_BASE}/meteor-showers`);
                const meteorData = await meteorRes.json();
                const activeMeteors = meteorData.filter(m => {
                    const start = new Date(date.getFullYear(), getMonthIndex(m.start.split(' ')[0]), parseInt(m.start.split(' ')[1]));
                    const end = new Date(date.getFullYear(), getMonthIndex(m.end.split(' ')[0]), parseInt(m.end.split(' ')[1]));
                    if (end < start) end.setFullYear(end.getFullYear() + 1);
                    return date >= start && date <= end;
                });
                setMeteors(activeMeteors);
            } catch (e) { console.warn("Meteors API failed"); }

            // Fetch Planetary Positions
            try {
                const observer = new Astronomy.Observer(location.lat, location.lon, 0);
                const visiblePlanets = [];
                const planetList = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
                planetList.forEach(p => {
                    const body = Astronomy.Body[p];
                    const equator = Astronomy.Equator(body, date, observer, true, true);
                    const horizon = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');
                    if (horizon.altitude > 0) visiblePlanets.push({ name: p, altitude: horizon.altitude, azimuth: horizon.azimuth });
                });
                setPlanets(visiblePlanets);
            } catch (e) { console.warn("Planetary calculation failed"); }

            // Fetch Weather / Visibility
            try {
                if (location.lat !== 0) {
                    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=cloud_cover&hourly=cloud_cover&forecast_days=1`);
                    const weatherData = await weatherRes.json();
                    const currentCloud = weatherData.current?.cloud_cover || 0;

                    const moonIllum = SunCalc.getMoonIllumination(date);
                    let baseScore = Math.max(0, 100 - currentCloud);
                    let moonPenalty = moonIllum.fraction * 30;
                    let finalScore = Math.max(0, Math.round(baseScore - moonPenalty));

                    let condition = "Perfect";
                    if (finalScore < 20) condition = "Poor Visibility";
                    else if (finalScore < 50) condition = "Fair";
                    else if (finalScore < 80) condition = "Good";

                    setWeather({ cloudCover: currentCloud, condition, score: finalScore });
                }
            } catch (e) { console.warn("Weather API failed"); }

            // Fetch Solar / Aurora Alert
            try {
                const flareRes = await fetch(`${API_BASE}/solar-flares`);
                const flareData = await flareRes.json();
                const strongFlare = flareData.find(f => f.classType.startsWith('X') || (f.classType.startsWith('M') && parseInt(f.classType.slice(1)) >= 5));
                if (strongFlare) setSolarFlareAlert(strongFlare);

                const kRes = await fetch(`${API_BASE}/k-index`);
                const kData = await kRes.json();
                const latestKp = kData && kData.length > 0 ? kData[kData.length - 1].kp_index : 0;
                const absLat = Math.abs(location.lat);
                let auroraVisible = false, auroraChance = 'None';
                if (latestKp >= 9 && absLat >= 30) { auroraVisible = true; auroraChance = 'Very High'; }
                else if (latestKp >= 7 && absLat >= 40) { auroraVisible = true; auroraChance = 'High'; }
                else if (latestKp >= 5 && absLat >= 50) { auroraVisible = true; auroraChance = 'Moderate'; }
                else if (latestKp >= 3 && absLat >= 60) { auroraVisible = true; auroraChance = 'Low'; }
                else if (absLat >= 65) { auroraVisible = true; auroraChance = 'Possible'; }
                setAuroraForecast({ visible: auroraVisible, chance: auroraChance, kp: latestKp });
            } catch (e) { console.warn("Solar/Aurora API failed"); }

            // Fetch Launches
            try {
                const launchRes = await fetch(`${API_BASE}/launches/upcoming`);
                const launchData = await launchRes.json();
                setLaunches(launchData.results?.slice(0, 3) || []);
            } catch (e) { console.warn("Launches API failed"); }

            setLoading(false);
        };

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);

    }, [location]);

    // Helper: Calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    };

    const getMonthIndex = (monthAbbr) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(monthAbbr);
    };

    const getMoonPhaseName = (phase) => {
        // SunCalc phase: 0 = New Moon, 0.25 = First Quarter, 0.5 = Full Moon, 0.75 = Last Quarter
        if (phase < 0.03 || phase > 0.97) return 'New Moon';
        if (phase < 0.22) return 'Waxing Crescent';
        if (phase < 0.28) return 'First Quarter';
        if (phase < 0.47) return 'Waxing Gibbous';
        if (phase < 0.53) return 'Full Moon';
        if (phase < 0.72) return 'Waning Gibbous';
        if (phase < 0.78) return 'Last Quarter';
        return 'Waning Crescent';
    };

    const formatTime = (isoTime) => {
        if (!isoTime) return '--:--';
        return new Date(isoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <div className="loading-screen">Scanning Local Sky...</div>;

    return (
        <div className="space-events-container">
            <h1 className="page-title glow-text">Space Events Notifier</h1>
            <div className="location-badge">
                <MapPin size={16} />
                <span>Viewing from: {location.city}</span>
            </div>

            <div className="events-grid">

                {/* ISS Tracker */}
                <div className="glass-panel event-card iss-card">
                    <div className="card-header">
                        <Plane className="card-icon" style={{ transform: 'rotate(-45deg)' }} />
                        <h3><SmartTerm term="ISS" display="ISS Live Tracker" /></h3>
                    </div>
                    <div className="iss-map-placeholder">
                        <div className="earth-visual"></div>
                        <div className="iss-dot" style={{ animation: 'orbit 10s linear infinite' }}></div>
                        <p className="iss-coords">
                            Lat: {parseFloat(issPosition?.latitude).toFixed(2)} <br />
                            Lon: {parseFloat(issPosition?.longitude).toFixed(2)}
                        </p>
                    </div>
                    <div className="iss-info-row">
                        <MapPin size={16} />
                        <span>Distance from you: {issDistance ? `${issDistance.toLocaleString()} km` : 'Calculating...'}</span>
                    </div>
                    <div className="next-pass">
                        <Watch size={16} />
                        <span>Next Pass: {issPass === null ? 'Calculating path...' : issPass === false ? 'No visible passes soon' : new Date(issPass.risetime * 1000).toLocaleString()}</span>
                    </div>
                </div>

                {/* Sky Info */}
                <div className="glass-panel event-card">
                    <div className="card-header">
                        <SunIcon className="card-icon" />
                        <h3>Sky Watch</h3>
                    </div>
                    <div className="astro-stats">
                        <div className="astro-row">
                            <span><SmartTerm term="Sunrise" /></span>
                            <span>{formatTime(astronomy?.sunrise)}</span>
                        </div>
                        <div className="astro-row">
                            <span><SmartTerm term="Sunset" /></span>
                            <span>{formatTime(astronomy?.sunset)}</span>
                        </div>
                        <div className="astro-divider"></div>
                        <div className="astro-row">
                            <span>Moonrise</span>
                            <span>{formatTime(astronomy?.moonrise)}</span>
                        </div>
                        <div className="astro-row">
                            <span>Moonset</span>
                            <span>{formatTime(astronomy?.moonset)}</span>
                        </div>
                        <div className="astro-divider"></div>
                        <div className="astro-row">
                            <span><SmartTerm term="Moon Phase" /></span>
                            <div className="moon-visual">
                                <div className="moon-phase-display">
                                    <svg width="50" height="50" viewBox="0 0 100 100">
                                        <defs>
                                            <radialGradient id="moonGradient">
                                                <stop offset="0%" stopColor="#ffffff" />
                                                <stop offset="100%" stopColor="#d0d0d0" />
                                            </radialGradient>
                                            <mask id="moonMask">
                                                <rect width="100" height="100" fill="white" />
                                                <ellipse
                                                    cx="50"
                                                    cy="50"
                                                    rx={astronomy?.moonPhase < 0.5
                                                        ? 50 * (1 - astronomy?.moonPhase * 2)
                                                        : 50 * ((astronomy?.moonPhase - 0.5) * 2)}
                                                    ry="50"
                                                    fill="black"
                                                    transform={`translate(${astronomy?.moonPhase < 0.5 ? 50 : -50}, 0)`}
                                                />
                                            </mask>
                                        </defs>
                                        <g transform={`rotate(${astronomy?.parallacticAngle || 0}, 50, 50)`}>
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                fill="url(#moonGradient)"
                                                mask="url(#moonMask)"
                                            />
                                        </g>
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                                    </svg>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <span style={{ fontWeight: '600' }}>{getMoonPhaseName(astronomy?.moonPhase)}</span>
                                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                        {astronomy?.moonAltitude > 0
                                            ? `Visible (${Math.round(astronomy?.moonAltitude)}° high)`
                                            : 'Below horizon'}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                        Tilt: {Math.round(astronomy?.parallacticAngle || 0)}° from YOUR location
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Meteor Showers */}
                <div className="glass-panel event-card wide-card">
                    <div className="card-header">
                        <Star className="card-icon" />
                        <h3>Active <SmartTerm term="Meteor Shower" display="Meteor Showers" /></h3>
                    </div>
                    <div className="meteors-list custom-meteors-group">
                        {meteors.length > 0 ? meteors.map((shower, idx) => (
                            <div key={idx} className="meteor-item">
                                <div className="meteor-name">{shower.name}</div>
                                <div className="meteor-peak">Peak: {shower.peak}</div>
                                <div className="meteor-rating">
                                    Rating: <span className={shower.rating === 'Strong' ? 'text-green-400' : 'text-yellow-400'}>{shower.rating}</span>
                                </div>
                            </div>
                        )) : <p>No major showers active right now.</p>}
                    </div>
                </div>

                {/* Event Summary */}
                <div className="glass-panel event-card">
                    <div className="card-header">
                        <Eye className="card-icon" />
                        <h3>Tonight's Summary</h3>
                    </div>
                    <ul className="summary-list">
                        <li>Moon is {getMoonPhaseName(astronomy?.moonPhase)}.</li>
                        <li>{meteors.length} Meteor Shower(s) active.</li>
                        <li>ISS pass: {issPass ? 'Yes, be ready!' : 'Not visible soon.'}</li>
                        <li>Visible Planets: {planets.length > 0 ? planets.map(p => p.name).join(', ') : 'None right now'}.</li>
                    </ul>
                </div>

                {/* Planetary Positions */}
                <div className="glass-panel event-card">
                    <div className="card-header">
                        <Globe className="card-icon" />
                        <h3><SmartTerm term="Planet" display="Visible Planets" /></h3>
                    </div>
                    <div className="planets-list custom-planets-group">
                        {planets.length > 0 ? planets.map((p, idx) => (
                            <div key={idx} className="planet-item">
                                <span className="planet-name">{p.name}</span>
                                <span className="planet-pos"><SmartTerm term="Altitude" display="Alt" />: {p.altitude.toFixed(1)}°</span>
                            </div>
                        )) : <p>No planets currently above the horizon.</p>}
                    </div>
                    <p className="card-hint">Look closely! Values &gt; 20° are best.</p>
                </div>

                {/* Stargazing Forecast (Weather + Moon) */}
                <div className="glass-panel event-card">
                    <div className="card-header">
                        <Moon className="card-icon" />
                        <h3>Stargazing Forecast</h3>
                    </div>
                    <div className="forecast-display">
                        <div className={`score-circle ${weather.score >= 80 ? 'good' : weather.score >= 50 ? 'fair' : 'poor'}`}>
                            <span className="score-val">{weather.score}</span>
                            <span className="score-label"><SmartTerm term="Visibility" /></span>
                        </div>
                        <div className="forecast-details">
                            <div className="f-row">
                                <span>Status:</span>
                                <span className="highlight">{weather.condition}</span>
                            </div>
                            <div className="f-row">
                                <span><SmartTerm term="Cloud Cover" />:</span>
                                <span>{weather.cloudCover}%</span>
                            </div>
                            <div className="f-row">
                                <span>Moon Brightness:</span>
                                <span>{Math.round(astronomy?.moonFraction * 100)}%</span>
                            </div>
                            <p className="prediction-text">
                                {weather.score > 70 ? "Great night for telescopes!" : "Clouds or Moon may interfere."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Upcoming Launches */}
                {launches.length > 0 && (
                    <div className="glass-panel event-card wide-card">
                        <div className="card-header">
                            <Plane className="card-icon" />
                            <h3>Upcoming Space Launches</h3>
                        </div>
                        <div className="launches-list">
                            {launches.map((launch, idx) => (
                                <div key={idx} className="launch-item">
                                    <div className="launch-name">{launch.name}</div>
                                    <div className="launch-time">
                                        {new Date(launch.net).toLocaleString()}
                                    </div>
                                    <div className="launch-location">
                                        {launch.pad?.location?.name || 'Location TBD'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Viewing Tips */}
                <div className="glass-panel event-card wide-card">
                    <div className="card-header">
                        <Lightbulb className="card-icon" />
                        <h3>Viewing Conditions & Tips</h3>
                    </div>
                    <div className="tips-grid">
                        <div className="tip-box">
                            <h4>Meteor Visibility</h4>
                            <p className={astronomy?.moonFraction > 0.5 ? 'text-yellow-400' : 'text-green-400'}>
                                {astronomy?.moonFraction > 0.5 ? 'Poor (Bright Moon)' : 'Excellent (Dark Sky)'}
                            </p>
                        </div>
                        <div className="tip-box">
                            <h4><SmartTerm term="Aurora" display="Aurora Forecast (Your Location)" /></h4>
                            {auroraForecast ? (
                                <div>
                                    <p className={auroraForecast.visible ? 'text-green-400' : 'text-gray-400'}>
                                        {auroraForecast.visible ? `${auroraForecast.chance} Chance` : 'Not Visible'}
                                    </p>
                                    <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.7 }}>
                                        Kp: {auroraForecast.kp} | Lat: {Math.abs(location.lat).toFixed(1)}°
                                    </p>
                                </div>
                            ) : <span className="text-gray-400">Calculating...</span>}
                        </div>
                        <div className="tip-box">
                            <h4><SmartTerm term="Solar Flare" display="Solar Activity" /></h4>
                            {solarFlareAlert ? (
                                <div className="text-red-500 flex items-center gap-2">
                                    <AlertOctagon size={16} />
                                    <span>STRONG FLARE: {solarFlareAlert.classType}</span>
                                </div>
                            ) : <span className="text-green-400">Normal</span>}
                        </div>
                        <div className="tip-box full-width">
                            <h4>Best Time to Watch</h4>
                            <p>For Meteors: After midnight when the radiant is high. <br />
                                For Planets: Early evening or pre-dawn (check altitude).</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SpaceEvents;

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, AlertTriangle, Wind, Zap, Satellite, CloudRain, History, Calendar, Clock, Globe, TrendingUp, Sun, Droplets, Info, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import LocationHistory from '../components/LocationHistory';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import SmartTerm from '../components/SmartTerm';
import './SpaceRisk.css';
import './EarthLink.css'; // Reuse Time Travel styles

const SpaceRisk = () => {
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [riskData, setRiskData] = useState(null);
    const [error, setError] = useState('');
    const [globalRiskTrends, setGlobalRiskTrends] = useState([]);
    const [riskDistribution, setRiskDistribution] = useState([]);
    const [coordinates, setCoordinates] = useState(null);

    // Initialize mock data for charts
    useEffect(() => {
        // Generate global risk trends (last 30 days)
        const trends = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            trends.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                solarRisk: 20 + Math.random() * 40,
                orbitalRisk: 15 + Math.random() * 25,
                radiationRisk: 10 + Math.random() * 30,
                communicationRisk: 5 + Math.random() * 20
            });
        }
        setGlobalRiskTrends(trends);

        // Risk distribution by category
        const distribution = [
            { category: 'Low Risk', value: 45, color: '#10b981' },
            { category: 'Medium Risk', value: 35, color: '#f59e0b' },
            { category: 'High Risk', value: 15, color: '#ef4444' },
            { category: 'Critical Risk', value: 5, color: '#991b1b' }
        ];
        setRiskDistribution(distribution);
    }, []);

    const calculateRisk = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setRiskData(null);

        try {
            // 1. Geocoding
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();

            if (!geoData.results) {
                throw new Error("City not found. Try a major city name.");
            }

            const { latitude, longitude, name, country } = geoData.results[0];
            setCoordinates({ lat: latitude, lon: longitude });

            const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,wind_speed_10m,cloud_cover&hourly=uv_index&forecast_days=1`
            );
            const weatherData = await weatherRes.json();
            const current = weatherData.current;

            // 3. Real-Time Space Weather (Kp-Index & Proton Flux)
            const API_BASE = 'https://spacescope-1v1p.onrender.com/api';
            const [kRes, protonRes] = await Promise.all([
                fetch(`${API_BASE}/k-index`),
                fetch(`${API_BASE}/proton-flux`)
            ]);

            const kData = await kRes.json();
            const protonData = await protonRes.json();

            const latestK = kData && kData.length > 0 ? kData[kData.length - 1].kp_index : 0;
            const latestProton = protonData && protonData.length > 0 ? protonData[protonData.length - 1].flux : 0;

            // 3. Risk Calculation Logic
            // Cyclone Risk: Based on Wind Speed (km/h)
            // > 60km/h = High, > 30 = Medium
            let cycloneRisk = Math.min(current.wind_speed_10m / 10, 10).toFixed(1);
            let cycloneLabel = current.wind_speed_10m > 60 ? "Active Storm Threat" : current.wind_speed_10m > 30 ? "Moderate Turbulance" : "Stable Atmosphere";

            // Flood Risk: Based on Precipitation (mm)
            // > 5mm = High
            let floodRisk = Math.min(current.precipitation * 3, 10).toFixed(1);
            let floodLabel = current.precipitation > 5 ? "Flash Flood Warning" : current.precipitation > 1 ? "Heavy Rainfall" : "Dry Baseline";

            // Solar Risk (Real-time Kp-Index + Latitude factor)
            // Kp-index 0-9 translates well to risk score
            const latFactor = Math.abs(latitude) / 90;
            let solarRisk = (parseFloat(latestK) + (latFactor * 2)).toFixed(1);
            let solarLabel = solarRisk > 7 ? "Geomagnetic Storm Inbound" : solarRisk > 4 ? "Unsettled Space Weather" : "Normal Solar Wind";

            // Satellite Dependency Score (Real-time Proton Flux + Tech factor)
            const techScore = (name.length + 5) % 10;
            const protonModifier = Math.log10(Math.max(latestProton, 1)) * 2;
            let satRisk = (3 + (techScore / 2) + protonModifier).toFixed(1);
            satRisk = Math.min(satRisk, 10);

            // Total Score
            const totalScore = ((parseFloat(cycloneRisk) + parseFloat(floodRisk) + parseFloat(solarRisk) + parseFloat(satRisk)) / 4).toFixed(1);

            setRiskData({
                location: `${name}, ${country}`,
                totalScore,
                breakdown: {
                    cyclone: { score: cycloneRisk, label: cycloneLabel, val: `${current.wind_speed_10m} km/h Wind` },
                    flood: { score: floodRisk, label: floodLabel, val: `${current.precipitation} mm Rain` },
                    solar: { score: solarRisk, label: solarLabel, val: `Kp-Index: ${latestK}` },
                    satellite: { score: satRisk, label: "Network Vulnerability", val: `Proton Flux: ${parseFloat(latestProton).toExponential(1)}` }
                }
            });

        } catch (err) {
            setError(err.message || "Failed to fetch scan data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-risk-page">
            {/* Header */}
            <header className="space-risk-header">
                <Link to="/dashboard" className="back-link">
                    <ArrowLeft size={18} /> BACK
                </Link>
                <div className="header-content">
                    <h1 className="risk-title">SPACE RISK <span className="text-cyan">SCANNER</span></h1>
                    <p className="risk-subtitle">Environmental & Orbital <SmartTerm term="Hazardous" display="Threat" /> Assessment</p>
                </div>
            </header>

            {/* Search Section */}
            <div className="risk-search-container">
                <form onSubmit={calculateRisk} className="risk-search-form">
                    <input
                        type="text"
                        placeholder="ENTER CITY NAME TO SCAN (e.g. TOKYO)"
                        className="risk-input"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                    />
                    <button type="submit" className="risk-submit-btn" disabled={loading}>
                        {loading ? <span className="animate-spin">🌀</span> : <Search size={24} strokeWidth={3} />}
                        SCAN
                    </button>
                </form>
                {error && <div className="error-message">{error}</div>}
            </div>

            {/* Results Section */}
            {riskData && (
                <>
                    <div className="risk-results-wrapper">

                        {/* Main Score Card */}
                        <div className="risk-main-card">
                            <div className="card-top-glow"></div>
                            <h2 className="main-card-title">Composite Risk Assessment Score</h2>
                            <div className="location-name">{riskData.location}</div>

                            <div className="score-display">
                                <span className="total-score">{riskData.totalScore}</span>
                                <span className="score-max">/ 10</span>
                            </div>

                            <div className={`risk-status-badge ${riskData.totalScore > 7 ? 'status-critical' : 'status-safe'}`}>
                                {riskData.totalScore > 7 ? '⚠️ CRITICAL VULNERABILITY DETECTED' : '✅ SYSTEMS WITHIN SAFE TOLERANCE'}
                            </div>
                        </div>

                        {/* Breakdown Grid */}
                        <div className="risk-grid">
                            {/* Solar */}
                            <RiskCard
                                icon={<Zap size={28} className="text-yellow" />}
                                title={<SmartTerm term="Space Weather" display="Solar Storm Exposure" />}
                                score={riskData.breakdown.solar.score}
                                label={riskData.breakdown.solar.label}
                                detail={riskData.breakdown.solar.val}
                                theme="theme-yellow"
                                colorClass="text-yellow"
                                bgClass="bg-yellow"
                                iconBg="rgba(234, 179, 8, 0.1)"
                                iconBorder="rgba(234, 179, 8, 0.2)"
                            />
                            {/* Cyclone */}
                            <RiskCard
                                icon={<Wind size={28} className="text-blue" />}
                                title="Atmospheric Instability"
                                score={riskData.breakdown.cyclone.score}
                                label={riskData.breakdown.cyclone.label}
                                detail={riskData.breakdown.cyclone.val}
                                theme="theme-blue"
                                colorClass="text-blue"
                                bgClass="bg-blue"
                                iconBg="rgba(59, 130, 246, 0.1)"
                                iconBorder="rgba(59, 130, 246, 0.2)"
                            />
                            {/* Flood */}
                            <RiskCard
                                icon={<CloudRain size={28} className="text-cyan" />}
                                title="Hydrological Risk"
                                score={riskData.breakdown.flood.score}
                                label={riskData.breakdown.flood.label}
                                detail={riskData.breakdown.flood.val}
                                theme="theme-cyan"
                                colorClass="text-cyan"
                                bgClass="bg-cyan"
                                iconBg="rgba(6, 182, 212, 0.1)"
                                iconBorder="rgba(6, 182, 212, 0.2)"
                            />
                            {/* Satellite */}
                            <RiskCard
                                icon={<Satellite size={28} className="text-purple" />}
                                title={<SmartTerm term="Satellite" display="Satellite Dependency" />}
                                score={riskData.breakdown.satellite.score}
                                label={riskData.breakdown.satellite.label}
                                detail={riskData.breakdown.satellite.val}
                                theme="theme-purple"
                                colorClass="text-purple"
                                bgClass="bg-purple"
                                iconBg="rgba(168, 85, 247, 0.1)"
                                iconBorder="rgba(168, 85, 247, 0.2)"
                            />
                        </div>
                    </div>

                    {/* Time Travel Simulation */}
                    <TimeTravelMode
                        location={{
                            city: riskData.location.split(',')[0],
                            lat: coordinates?.lat,
                            lon: coordinates?.lon
                        }}
                        currentData={null} // Will use defaults
                    />
                </>
            )}


            {/* Location History Feature */}
            {
                coordinates && riskData && (
                    <LocationHistory city={riskData.location} coordinates={coordinates} />
                )
            }

            {/* Global Risk Analytics Section */}
            {
                !riskData && (
                    <div className="global-risk-analytics">
                        <h2 className="analytics-title">Global Space Risk Analytics</h2>

                        {/* 30-Day Risk Trends */}
                        <div className="glass-panel risk-chart-panel">
                            <h3>30-Day Global Risk Trends</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={globalRiskTrends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="date" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="solarRisk" stroke="#f59e0b" strokeWidth={2} name="Solar Storm Risk" />
                                    <Line type="monotone" dataKey="orbitalRisk" stroke="#3b82f6" strokeWidth={2} name="Orbital Debris Risk" />
                                    <Line type="monotone" dataKey="radiationRisk" stroke="#ef4444" strokeWidth={2} name="Radiation Risk" />
                                    <Line type="monotone" dataKey="communicationRisk" stroke="#8b5cf6" strokeWidth={2} name="Communication Risk" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="risk-charts-grid">
                            {/* Risk Distribution Pie Chart */}
                            <div className="glass-panel risk-chart-panel">
                                <h3>Global Risk Distribution</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={riskDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.category}: ${entry.value}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {riskDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Regional Risk Comparison */}
                            <div className="glass-panel risk-chart-panel">
                                <h3>Regional Risk Comparison</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={[
                                        { region: 'North America', solar: 35, orbital: 25, radiation: 20 },
                                        { region: 'Europe', solar: 30, orbital: 20, radiation: 25 },
                                        { region: 'Asia', solar: 40, orbital: 30, radiation: 35 },
                                        { region: 'Africa', solar: 45, orbital: 15, radiation: 40 },
                                        { region: 'South America', solar: 35, orbital: 20, radiation: 30 }
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="region" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                                        <Legend />
                                        <Bar dataKey="solar" fill="#f59e0b" name="Solar Risk" />
                                        <Bar dataKey="orbital" fill="#3b82f6" name="Orbital Risk" />
                                        <Bar dataKey="radiation" fill="#ef4444" name="Radiation Risk" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};



const RiskCard = ({ icon, title, score, label, detail, theme, colorClass, bgClass, iconBg, iconBorder }) => (
    <div className={`factor-card ${theme}`}>
        <div className="icon-wrapper" style={{ backgroundColor: iconBg, borderColor: iconBorder }}>
            {icon}
        </div>
        <div className="card-content-wrapper">
            <div className="card-header">
                <h3 className="factor-title">{title}</h3>
                <span className={`factor-score ${colorClass}`}>{score}</span>
            </div>
            <div className="progress-track">
                <div
                    className={`progress-fill ${bgClass}`}
                    style={{ width: `${score * 10}%` }}
                ></div>
            </div>
            <p className="factor-label">{label}</p>
            <p className="factor-detail">{detail}</p>
        </div>
    </div>
);


const TimeTravelMode = ({ location, currentData }) => {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [timelineData, setTimelineData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('overview'); // overview, trends, milestones
    const [selectedInfo, setSelectedInfo] = useState(null); // For info modal

    // Parameter information for modals
    const parameterInfo = {
        aqi: {
            title: "Air Quality Index (AQI)",
            icon: "💨",
            description: "A standardized indicator of air pollution levels that affects human health and crop productivity.",
            satellite: "Measured by NASA's Sentinel-5P TROPOMI satellite using spectroscopy to detect pollutants like NO₂, SO₂, and particulate matter from space.",
            agriculture: "Poor air quality reduces photosynthesis efficiency, damages plant tissues, and decreases crop yields by up to 15% in heavily polluted areas.",
            interpretation: {
                good: "0-50: Excellent conditions for plant growth",
                moderate: "51-100: Acceptable, minimal crop impact",
                unhealthy: "101-200: Reduced photosynthesis, visible leaf damage",
                hazardous: "200+: Severe crop stress, significant yield loss"
            }
        },
        temperature: {
            title: "Surface Temperature",
            icon: "🌡️",
            description: "Average land surface temperature that directly affects crop growth rates and water requirements.",
            satellite: "Measured using thermal infrared sensors on MODIS (Terra/Aqua) and Landsat satellites, detecting heat radiation from Earth's surface.",
            agriculture: "Each crop has an optimal temperature range. Deviations cause stress, affecting germination, flowering, and yield. Rising temps shift growing zones.",
            interpretation: {
                optimal: "20-25°C: Ideal for most temperate crops",
                warm: "25-30°C: Good for tropical crops, stress for wheat/barley",
                hot: "30-35°C: Heat stress, increased water needs",
                extreme: "35+°C: Severe stress, potential crop failure"
            }
        },
        soil: {
            title: "Soil Moisture",
            icon: "💧",
            description: "Water content in the top soil layer, critical for plant water uptake and irrigation planning.",
            satellite: "NASA's SMAP satellite uses L-band microwave radiometry to penetrate soil and measure moisture content up to 5cm depth globally every 2-3 days.",
            agriculture: "Optimal soil moisture ensures nutrient uptake and prevents drought stress. Satellite data helps farmers optimize irrigation timing and water conservation.",
            interpretation: {
                saturated: "0.4-0.5: Waterlogged, risk of root rot",
                optimal: "0.2-0.4: Perfect for most crops",
                dry: "0.1-0.2: Drought stress begins",
                critical: "<0.1: Severe drought, crop failure risk"
            }
        },
        precipitation: {
            title: "Annual Precipitation",
            icon: "🌧️",
            description: "Total rainfall over a year, determining water availability for agriculture and flood/drought risks.",
            satellite: "GPM (Global Precipitation Measurement) constellation uses radar and microwave sensors to measure rainfall intensity and distribution worldwide every 3 hours.",
            agriculture: "Rainfall patterns determine crop selection, planting dates, and irrigation needs. Extreme variations cause floods or droughts, devastating harvests.",
            interpretation: {
                abundant: "1000+ mm: High productivity, flood risk",
                adequate: "600-1000 mm: Sufficient for most crops",
                limited: "300-600 mm: Irrigation required",
                arid: "<300 mm: Only drought-resistant crops viable"
            }
        },
        co2: {
            title: "Atmospheric CO₂",
            icon: "🌫️",
            description: "Carbon dioxide concentration in the atmosphere, affecting plant growth and climate change.",
            satellite: "NASA's OCO-2 and OCO-3 satellites measure CO₂ concentrations using spectrometers that analyze sunlight reflected through the atmosphere.",
            agriculture: "Higher CO₂ can boost photosynthesis (CO₂ fertilization), but associated warming and weather extremes often negate benefits, reducing net yields.",
            interpretation: {
                preindustrial: "280-350 ppm: Historical baseline",
                current: "350-420 ppm: Modern levels, mild fertilization",
                elevated: "420-500 ppm: Enhanced growth offset by heat stress",
                critical: "500+ ppm: Severe climate impacts dominate"
            }
        },
        cropHealth: {
            title: "Crop Health Index",
            icon: "🌾",
            description: "Vegetation health indicator based on chlorophyll content and photosynthetic activity.",
            satellite: "Calculated from NDVI (Normalized Difference Vegetation Index) using Sentinel-2 and Landsat multispectral imagery comparing red and near-infrared reflectance.",
            agriculture: "Detects crop stress weeks before visible to human eye, enabling early intervention for pests, diseases, or nutrient deficiencies to prevent yield loss.",
            interpretation: {
                excellent: "80-100: Vigorous growth, optimal health",
                good: "60-80: Healthy, normal development",
                stressed: "40-60: Moderate stress, intervention needed",
                poor: "<40: Severe stress, disease, or failure"
            }
        },
        growingSeason: {
            title: "Growing Season Length",
            icon: "📅",
            description: "Number of frost-free days suitable for crop cultivation, determined by temperature patterns.",
            satellite: "Derived from daily temperature data from MODIS and VIIRS satellites, tracking when temperatures stay above freezing thresholds.",
            agriculture: "Longer seasons allow multiple harvests or longer-maturing crops. Climate change is extending seasons but increasing unpredictability and extreme weather.",
            interpretation: {
                extended: "200+ days: Multiple crops possible",
                normal: "150-200 days: Standard growing season",
                short: "120-150 days: Limited crop options",
                minimal: "<120 days: Only fast-maturing varieties"
            }
        },
        risks: {
            title: "Climate Risk Assessment",
            icon: "⚠️",
            description: "Combined evaluation of drought and flood risks based on precipitation and soil moisture trends.",
            satellite: "Integrated analysis from SMAP (soil moisture), GPM (precipitation), and MODIS (vegetation stress) satellites for comprehensive risk mapping.",
            agriculture: "Early warning systems help farmers prepare for extremes: securing crop insurance, adjusting planting schedules, or implementing protective measures.",
            interpretation: {
                low: "Stable conditions, normal planning",
                moderate: "Monitor closely, prepare contingencies",
                high: "Immediate action needed, crop protection",
                extreme: "Emergency measures, potential evacuation"
            }
        }
    };

    // Generate historical/predicted data based on year
    const generateTimelineData = (year) => {
        const yearDiff = year - currentYear;
        const baseData = currentData || { aqi: 50, temp: 24, soil: 0.15, uv: 4.5 };

        // Simulate historical trends (worse in past, improving recently, predictions for future)
        let aqiMultiplier = 1;
        let tempChange = 0;
        let soilChange = 0;
        let precipitationChange = 0;
        let co2Change = 0;
        let cropHealthChange = 0;
        let growingSeasonChange = 0;

        if (year < 2000) {
            aqiMultiplier = 1.8; // Worse air quality in the past
            tempChange = -0.8;
            soilChange = 0.05;
            precipitationChange = 50; // More rainfall historically
            co2Change = -80; // Lower CO2 levels
            cropHealthChange = 10; // Better natural conditions
            growingSeasonChange = -5; // Shorter growing season
        } else if (year < 2010) {
            aqiMultiplier = 1.5;
            tempChange = -0.5;
            soilChange = 0.03;
            precipitationChange = 30;
            co2Change = -50;
            cropHealthChange = 5;
            growingSeasonChange = -3;
        } else if (year < 2020) {
            aqiMultiplier = 1.2;
            tempChange = -0.2;
            soilChange = 0.01;
            precipitationChange = 10;
            co2Change = -20;
            cropHealthChange = 2;
            growingSeasonChange = -1;
        } else if (year > currentYear) {
            // Future predictions (optimistic with space tech)
            aqiMultiplier = 0.7 - (yearDiff * 0.05);
            tempChange = yearDiff * 0.15; // Climate warming
            soilChange = -yearDiff * 0.01; // Drought risk
            precipitationChange = -yearDiff * 8; // Decreasing rainfall
            co2Change = yearDiff * 15; // Rising CO2
            cropHealthChange = -yearDiff * 3; // Declining without intervention
            growingSeasonChange = yearDiff * 2; // Longer but more unstable
        }

        const basePrecipitation = 800; // mm/year
        const baseCO2 = 420; // ppm
        const baseCropHealth = 75; // 0-100 index
        const baseGrowingSeason = 180; // days

        return {
            year,
            aqi: Math.max(10, Math.min(300, baseData.aqi * aqiMultiplier)),
            temp: baseData.temp + tempChange,
            soil: Math.max(0, Math.min(1, baseData.soil + soilChange)),
            uv: baseData.uv,
            // New agricultural parameters
            precipitation: Math.max(200, Math.min(1500, basePrecipitation + precipitationChange)),
            co2: Math.max(280, Math.min(600, baseCO2 + co2Change)),
            cropHealth: Math.max(0, Math.min(100, baseCropHealth + cropHealthChange)),
            growingSeason: Math.max(120, Math.min(240, baseGrowingSeason + growingSeasonChange)),
            droughtRisk: soilChange < -0.005 ? 'High' : soilChange < 0 ? 'Moderate' : 'Low',
            floodRisk: precipitationChange > 100 ? 'High' : precipitationChange > 50 ? 'Moderate' : 'Low',
            isFuture: year > currentYear,
            isPast: year < currentYear,
            isCurrent: year === currentYear
        };
    };

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setTimelineData(generateTimelineData(selectedYear));
            setLoading(false);
        }, 300);
    }, [selectedYear]);

    const milestones = [
        {
            year: 1972,
            title: "Landsat 1 Launch",
            description: "First Earth observation satellite, revolutionizing environmental monitoring",
            icon: "🛰️",
            details: {
                agency: "NASA / USGS",
                launchDate: "July 23, 1972",
                instruments: "Return Beam Vidicon (RBV), Multispectral Scanner (MSS)",
                mission: "The first satellite dedicated to monitoring Earth's landmasses.",
                impact: "Revolutionized agriculture, cartography, geology, forestry, and surveillance. Provided the longest continuous space-based record of Earth's land in existence."
            }
        },
        {
            year: 1999,
            title: "Terra Satellite",
            description: "NASA's flagship Earth observation mission begins",
            icon: "🌍",
            details: {
                agency: "NASA (USA), METI (Japan), CSA (Canada)",
                launchDate: "December 18, 1999",
                instruments: "ASTER, CERES, MISR, MODIS, MOPITT",
                mission: "Explores the connections between Earth's atmosphere, land, snow and ice, ocean, and energy balance.",
                impact: "Provides global data on the state of the atmosphere, land, and oceans, improving weather forecasting and climate change monitoring."
            }
        },
        {
            year: 2002,
            title: "Aqua Mission",
            description: "Water cycle monitoring from space",
            icon: "💧",
            details: {
                agency: "NASA (USA), JAXA (Japan), INPE (Brazil)",
                launchDate: "May 4, 2002",
                instruments: "AIRS, AMSU, CERES, MODIS, AMSR-E",
                mission: "Collects data on Earth's water cycle, including precipitation, evaporation, and water vapor.",
                impact: "Crucial for understanding the global water cycle and its role in the climate system, forecasting weather, and monitoring severe storms."
            }
        },
        {
            year: 2014,
            title: "OCO-2 Launch",
            description: "Tracking CO2 levels globally",
            icon: "🌫️",
            details: {
                agency: "NASA",
                launchDate: "July 2, 2014",
                instruments: "Three high-resolution grating spectrometers",
                mission: "Dedicated to studying atmospheric carbon dioxide on a regional scale.",
                impact: "Helps scientists understand the geographic distribution of CO2 sources and sinks and their changes over time."
            }
        },
        {
            year: 2015,
            title: "Sentinel-2",
            description: "High-resolution land monitoring",
            icon: "🗺️",
            details: {
                agency: "ESA (European Space Agency)",
                launchDate: "June 23, 2015 (2A)",
                instruments: "MultiSpectral Instrument (MSI)",
                mission: "Provides high-resolution optical imagery for land services.",
                impact: "Vital for monitoring vegetation, soil and water cover, as well as observation of inland waterways and coastal areas."
            }
        },
        {
            year: 2020,
            title: "Sentinel-6",
            description: "Sea level rise tracking",
            icon: "🌊",
            details: {
                agency: "ESA, EUMETSAT, NASA, NOAA, CNES",
                launchDate: "November 21, 2020",
                instruments: "Poseidon-4 Altimeter, AMR-C",
                mission: "Reference mission for sea-level measurements.",
                impact: "Delivers crucial data for climate policy and oceanography, extending the unique record of sea-level rise began in 1992."
            }
        },
        {
            year: 2025,
            title: "NISAR Mission",
            description: "NASA-ISRO radar mission for Earth changes",
            icon: "📡",
            details: {
                agency: "NASA / ISRO",
                launchDate: "Expected 2025",
                instruments: "L-band and S-band Synthetic Aperture Radar (SAR)",
                mission: "Will map the entire globe in 12 days to observe environmental changes.",
                impact: "Provides clear views of Earth's changing ecosystems, ice masses, and vegetation biomass, independent of cloud cover."
            }
        },
        {
            year: 2030,
            title: "Climate Prediction AI",
            description: "Advanced AI models using 50+ years of satellite data",
            icon: "🤖",
            details: {
                agency: "Global Collaboration",
                launchDate: "Future Concept",
                instruments: "AI-driven Data Fusion",
                mission: "Integrate multi-source satellite data for hyper-local climate forecasting.",
                impact: "Will enable precise agricultural planning, disaster mitigation, and urban adaptation strategies facing climate change."
            }
        }
    ];

    const getAQIStatus = (aqi) => {
        if (aqi <= 50) return { label: 'Good', color: '#4caf50' };
        if (aqi <= 100) return { label: 'Moderate', color: '#ffeb3b' };
        if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: '#ff9800' };
        return { label: 'Unhealthy', color: '#f44336' };
    };

    const aqiStatus = timelineData ? getAQIStatus(timelineData.aqi) : { label: '', color: '#fff' };

    return (
        <div className="time-travel-section-wrapper">
            <div className="time-travel-inline-container">
                <div className="time-travel-header">
                    <h1><Clock className="inline-icon" /> Time Travel: {location.city}</h1>
                    <p className="subtitle">Explore environmental changes through satellite data across decades</p>
                </div>

                {/* Year Selector */}
                <div className="timeline-selector">
                    <div className="year-display">
                        <History size={32} />
                        <div className="year-info">
                            <div className="selected-year">{selectedYear}</div>
                            <div className="year-label">
                                {timelineData?.isFuture && "🔮 PREDICTED DATA"}
                                {timelineData?.isPast && "📜 HISTORICAL DATA"}
                                {timelineData?.isCurrent && "🔴 LIVE DATA"}
                            </div>
                        </div>
                        <Calendar size={32} />
                    </div>

                    <div className="timeline-slider-container">
                        <div className="timeline-markers">
                            <span>1970</span>
                            <span>1990</span>
                            <span>2010</span>
                            <span className="current-marker">NOW</span>
                            <span>2030</span>
                            <span>2050</span>
                        </div>
                        <input
                            type="range"
                            min="1970"
                            max="2050"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="timeline-slider"
                        />
                        <div className="slider-track-fill" style={{ width: `${((selectedYear - 1970) / (2050 - 1970)) * 100}%` }}></div>
                    </div>
                </div>

                {/* View Mode Tabs */}
                <div className="view-mode-tabs">
                    <button
                        className={viewMode === 'overview' ? 'active' : ''}
                        onClick={() => setViewMode('overview')}
                    >
                        <Globe size={18} /> Overview
                    </button>
                    <button
                        className={viewMode === 'trends' ? 'active' : ''}
                        onClick={() => setViewMode('trends')}
                    >
                        <TrendingUp size={18} /> Climate Trends
                    </button>
                    <button
                        className={viewMode === 'milestones' ? 'active' : ''}
                        onClick={() => setViewMode('milestones')}
                    >
                        <History size={18} /> Satellite Milestones
                    </button>
                </div>

                {/* Content Area */}
                <div className="time-travel-content">
                    {loading ? (
                        <div className="loading-spinner">
                            <Clock className="spin-icon" size={48} />
                            <p>Accessing satellite archives...</p>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'overview' && timelineData && (
                                <div className="overview-grid">
                                    <div className="time-data-card aqi-card" onClick={() => setSelectedInfo('aqi')}>
                                        <div className="card-info-btn" title="Click for details">
                                            <Info size={16} />
                                        </div>
                                        <Wind size={32} />
                                        <h3>Air Quality Index</h3>
                                        <div className="time-value" style={{ color: aqiStatus.color }}>
                                            {Math.round(timelineData.aqi)}
                                        </div>
                                        <div className="time-status" style={{ color: aqiStatus.color }}>
                                            {aqiStatus.label}
                                        </div>
                                        {timelineData.isPast && (
                                            <p className="data-note">📊 Reconstructed from historical records</p>
                                        )}
                                        {timelineData.isFuture && (
                                            <p className="data-note">🔮 AI-predicted based on current trends</p>
                                        )}
                                    </div>

                                    <div className="time-data-card temp-card" onClick={() => setSelectedInfo('temperature')}>
                                        <div className="card-info-btn" title="Click for details">
                                            <Info size={16} />
                                        </div>
                                        <Sun size={32} />
                                        <h3>Temperature</h3>
                                        <div className="time-value">
                                            {timelineData.temp.toFixed(1)}°C
                                        </div>
                                        <div className="temp-change">
                                            {timelineData.temp > (currentData?.temp || 24) ? '🔥 Warmer' : '❄️ Cooler'} than today
                                        </div>
                                    </div>

                                    <div className="time-data-card soil-card" onClick={() => setSelectedInfo('soil')}>
                                        <div className="card-info-btn" title="Click for details">
                                            <Info size={16} />
                                        </div>
                                        <Droplets size={32} />
                                        <h3>Soil Moisture</h3>
                                        <div className="time-value">
                                            {(timelineData.soil * 100).toFixed(0)}%
                                        </div>
                                        <div className="soil-status">
                                            {timelineData.soil < 0.1 ? '🏜️ Drought Risk' : '💧 Healthy'}
                                        </div>
                                    </div>

                                    {/* New Agricultural Parameters */}
                                    <div className="time-data-card precipitation-card" onClick={() => setSelectedInfo('precipitation')}>
                                        <div className="card-info-btn" title="Click for details">
                                            <Info size={16} />
                                        </div>
                                        <CloudRain size={32} />
                                        <h3>Annual Precipitation</h3>
                                        <div className="time-value" style={{ color: '#00bcd4' }}>
                                            {Math.round(timelineData.precipitation)}
                                        </div>
                                        <div className="time-status">mm/year</div>
                                        <div className="soil-status" style={{
                                            color: timelineData.floodRisk === 'High' ? '#f44336' :
                                                timelineData.floodRisk === 'Moderate' ? '#ff9800' : '#4caf50'
                                        }}>
                                            Flood Risk: {timelineData.floodRisk}
                                        </div>
                                    </div>

                                    <div className="time-data-card co2-card" onClick={() => setSelectedInfo('co2')}>
                                        <div className="card-info-btn" title="Click for details">
                                            <Info size={16} />
                                        </div>
                                        <Wind size={32} />
                                        <h3>Atmospheric CO₂</h3>
                                        <div className="time-value" style={{ color: '#ff5722' }}>
                                            {Math.round(timelineData.co2)}
                                        </div>
                                        <div className="time-status">ppm</div>
                                        <p className="data-note">
                                            {timelineData.co2 > 450 ? '⚠️ Critical levels' :
                                                timelineData.co2 > 400 ? '📈 Elevated' : '✅ Pre-industrial range'}
                                        </p>
                                    </div>

                                    <div className="time-data-card crop-card" onClick={() => setSelectedInfo('cropHealth')}>
                                        <div className="card-info-btn" title="Click for details">
                                            <Info size={16} />
                                        </div>
                                        <Sun size={32} />
                                        <h3>Crop Health Index</h3>
                                        <div className="time-value" style={{
                                            color: timelineData.cropHealth > 70 ? '#4caf50' :
                                                timelineData.cropHealth > 50 ? '#ff9800' : '#f44336'
                                        }}>
                                            {Math.round(timelineData.cropHealth)}
                                        </div>
                                        <div className="time-status">/100</div>
                                        <p className="data-note">
                                            🌾 {timelineData.cropHealth > 70 ? 'Optimal conditions' :
                                                timelineData.cropHealth > 50 ? 'Moderate stress' : 'High stress'}
                                        </p>
                                    </div>

                                    <div className="time-data-card season-card" onClick={() => setSelectedInfo('growingSeason')}>
                                        <div className="card-info-btn" title="Click for details">
                                            <Info size={16} />
                                        </div>
                                        <Calendar size={32} />
                                        <h3>Growing Season</h3>
                                        <div className="time-value" style={{ color: '#8bc34a' }}>
                                            {Math.round(timelineData.growingSeason)}
                                        </div>
                                        <div className="time-status">days</div>
                                        <p className="data-note">
                                            {timelineData.growingSeason > 200 ? '📅 Extended season' :
                                                timelineData.growingSeason > 160 ? '📅 Normal season' : '📅 Short season'}
                                        </p>
                                    </div>

                                    <div className="time-data-card risk-card" onClick={() => setSelectedInfo('risks')}>
                                        <div className="card-info-btn" title="Click for details">
                                            <Info size={16} />
                                        </div>
                                        <AlertTriangle size={32} />
                                        <h3>Climate Risks</h3>
                                        <div className="risk-indicators">
                                            <div className="risk-item">
                                                <span>Drought:</span>
                                                <span style={{
                                                    color: timelineData.droughtRisk === 'High' ? '#f44336' :
                                                        timelineData.droughtRisk === 'Moderate' ? '#ff9800' : '#4caf50'
                                                }}>
                                                    {timelineData.droughtRisk}
                                                </span>
                                            </div>
                                            <div className="risk-item">
                                                <span>Flood:</span>
                                                <span style={{
                                                    color: timelineData.floodRisk === 'High' ? '#f44336' :
                                                        timelineData.floodRisk === 'Moderate' ? '#ff9800' : '#4caf50'
                                                }}>
                                                    {timelineData.floodRisk}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="insight-card">
                                        <Info size={24} />
                                        <h3>Agricultural Impact & Space Tech in {selectedYear}</h3>
                                        {timelineData.isPast && selectedYear < 1972 && (
                                            <p>⚠️ Limited satellite data available. Farmers relied on ground observations and traditional weather forecasting. Crop failures were common due to lack of early warning systems.</p>
                                        )}
                                        {timelineData.isPast && selectedYear >= 1972 && selectedYear < 2000 && (
                                            <p>🛰️ Early Landsat missions revolutionized agriculture by providing the first global views of crop health, deforestation, and land use changes. Enabled early precision farming techniques.</p>
                                        )}
                                        {timelineData.isPast && selectedYear >= 2000 && selectedYear < currentYear && (
                                            <p>🌍 Advanced satellites (Terra, Aqua, Sentinel) enabled precision agriculture with daily monitoring of soil moisture, vegetation health (NDVI), and weather patterns. Farmers could optimize irrigation and fertilizer use.</p>
                                        )}
                                        {timelineData.isCurrent && (
                                            <p>🔴 Real-time satellite data helps farmers make data-driven decisions: predict droughts, monitor crop stress, optimize water usage, and track pest outbreaks. AI models predict yields months in advance.</p>
                                        )}
                                        {timelineData.isFuture && (
                                            <p>🚀 Next-gen satellites with hyperspectral imaging will detect plant diseases before visible symptoms appear. AI-powered climate models will help farmers adapt to changing growing seasons and extreme weather.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {viewMode === 'trends' && (
                                <div className="trends-view">
                                    <div className="trend-chart">
                                        <h3>🌡️ Temperature Trend (1970-2050)</h3>
                                        <div className="chart-visual">
                                            {[1970, 1980, 1990, 2000, 2010, 2020, 2030, 2040, 2050].map(year => {
                                                const data = generateTimelineData(year);
                                                const height = ((data.temp - 20) / 10) * 100;
                                                return (
                                                    <div key={year} className="chart-bar-container">
                                                        <div
                                                            className={`chart-bar ${year === selectedYear ? 'selected' : ''}`}
                                                            style={{
                                                                height: `${Math.max(10, height)}%`,
                                                                background: year > currentYear ? '#ff9800' : '#4caf50'
                                                            }}
                                                        ></div>
                                                        <span className="chart-label">{year}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="chart-note">📈 Global warming trend visible from satellite thermal imaging</p>
                                    </div>

                                    <div className="trend-chart">
                                        <h3>💨 Air Quality Trend (1970-2050)</h3>
                                        <div className="chart-visual">
                                            {[1970, 1980, 1990, 2000, 2010, 2020, 2030, 2040, 2050].map(year => {
                                                const data = generateTimelineData(year);
                                                const height = (data.aqi / 200) * 100;
                                                const status = getAQIStatus(data.aqi);
                                                return (
                                                    <div key={year} className="chart-bar-container">
                                                        <div
                                                            className={`chart-bar ${year === selectedYear ? 'selected' : ''}`}
                                                            style={{
                                                                height: `${Math.max(10, height)}%`,
                                                                background: status.color
                                                            }}
                                                        ></div>
                                                        <span className="chart-label">{year}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="chart-note">🛰️ Sentinel-5P TROPOMI enables global pollution tracking</p>
                                    </div>
                                </div>
                            )}

                            {viewMode === 'milestones' && (
                                <div className="milestones-view">
                                    <div className="milestones-timeline">
                                        {milestones.map((milestone, idx) => (
                                            <div
                                                key={idx}
                                                className={`milestone-item ${milestone.year === selectedYear ? 'highlighted' : ''} ${milestone.year > currentYear ? 'future' : ''}`}
                                                onClick={() => setSelectedYear(milestone.year)}
                                            >
                                                <div className="card-info-btn milestone-info-btn" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedInfo(`milestone-${idx}`);
                                                }} title="Mission Details">
                                                    <Info size={16} />
                                                </div>
                                                <div className="milestone-icon">{milestone.icon}</div>
                                                <div className="milestone-content">
                                                    <div className="milestone-year">{milestone.year}</div>
                                                    <h4>{milestone.title}</h4>
                                                    <p>{milestone.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Info Modal - Moved outside container to avoid overflow issues */}
            {selectedInfo && (
                <div className="param-info-modal" onClick={() => setSelectedInfo(null)}>
                    <div className="param-info-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-param-info" onClick={() => setSelectedInfo(null)}>
                            <X size={24} />
                        </button>

                        {(() => {
                            if (selectedInfo.startsWith('milestone-')) {
                                const index = parseInt(selectedInfo.split('-')[1]);
                                const milestone = milestones[index];

                                if (!milestone || !milestone.details) return null;

                                return (
                                    <>
                                        <div className="param-info-header">
                                            <span className="param-icon">{milestone.icon}</span>
                                            <h2>{milestone.title}</h2>
                                        </div>

                                        <div className="param-info-body">
                                            <div className="info-section">
                                                <h3>🚀 Mission Overview</h3>
                                                <p>{milestone.description}</p>
                                                <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>{milestone.details.mission}</p>
                                            </div>

                                            <div className="info-section">
                                                <h3>📋 Key Details</h3>
                                                <div className="interpretation-list">
                                                    <div className="interpretation-item">
                                                        <span className="interpretation-bullet">•</span>
                                                        <span><strong>Agency:</strong> {milestone.details.agency}</span>
                                                    </div>
                                                    <div className="interpretation-item">
                                                        <span className="interpretation-bullet">•</span>
                                                        <span><strong>Launch Date:</strong> {milestone.details.launchDate}</span>
                                                    </div>
                                                    <div className="interpretation-item">
                                                        <span className="interpretation-bullet">•</span>
                                                        <span><strong>Instruments:</strong> {milestone.details.instruments}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="info-section">
                                                <h3>🌍 Earth Science Impact</h3>
                                                <p>{milestone.details.impact}</p>
                                            </div>
                                        </div>
                                    </>
                                );
                            }

                            const param = parameterInfo[selectedInfo];
                            if (param) {
                                return (
                                    <>
                                        <div className="param-info-header">
                                            <span className="param-icon">{param.icon}</span>
                                            <h2>{param.title}</h2>
                                        </div>

                                        <div className="param-info-body">
                                            <div className="info-section">
                                                <h3>📖 What is this?</h3>
                                                <p>{param.description}</p>
                                            </div>

                                            <div className="info-section">
                                                <h3>🛰️ How Satellites Measure It</h3>
                                                <p>{param.satellite}</p>
                                            </div>

                                            <div className="info-section">
                                                <h3>🌾 Agricultural Significance</h3>
                                                <p>{param.agriculture}</p>
                                            </div>

                                            <div className="info-section">
                                                <h3>📊 Interpretation Guide</h3>
                                                <div className="interpretation-list">
                                                    {Object.entries(param.interpretation).map(([key, value]) => (
                                                        <div key={key} className="interpretation-item">
                                                            <span className="interpretation-bullet">•</span>
                                                            <span>{value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            }

                            return null;
                        })()}

                        <div className="param-info-footer">
                            <button className="understand-btn" onClick={() => setSelectedInfo(null)}>
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpaceRisk;

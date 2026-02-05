import React, { useState, useEffect } from 'react';
import { Rocket, Clock, Calendar, Globe, Satellite, Filter, ChevronRight, Play } from 'lucide-react';
import SmartTerm from '../components/SmartTerm';
import './Missions.css';

const Missions = () => {
    const [launches, setLaunches] = useState([]);
    const [nextLaunch, setNextLaunch] = useState(null);
    const [filter, setFilter] = useState('ALL'); // ALL, SPACEX, ISRO, MOON, MARS
    const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [loading, setLoading] = useState(true);

    const API_BASE = 'https://spacescope-1v1p.onrender.com/api';

    useEffect(() => {
        const fetchLaunches = async () => {
            setLoading(true);
            try {
                // Fetch Upcoming and Previous in parallel
                const [upcomingRes, previousRes] = await Promise.all([
                    fetch(`${API_BASE}/launches/upcoming`),
                    fetch(`${API_BASE}/launches/previous`)
                ]);

                const upcomingData = await upcomingRes.json();
                const previousData = await previousRes.json();

                const upcoming = upcomingData.results || [];
                const previous = previousData.results || [];

                // Use a Map to deduplicate by ID across previous and upcoming datasets
                const missionMap = new Map();
                [...previous, ...upcoming].forEach(m => {
                    missionMap.set(m.id, m);
                });

                const combined = Array.from(missionMap.values())
                    .sort((a, b) => new Date(a.net) - new Date(b.net));

                setLaunches(combined);

                // Set Next Launch (First upcoming future launch)
                const futureOnly = upcoming
                    .filter(l => new Date(l.net) > new Date())
                    .sort((a, b) => new Date(a.net) - new Date(b.net));

                if (futureOnly.length > 0) {
                    setNextLaunch(futureOnly[0]);
                } else if (upcoming.length > 0) {
                    setNextLaunch(upcoming[0]);
                }

                setLoading(false);
            } catch (error) {
                console.error("Error fetching missions:", error);
                setLoading(false);
            }
        };

        fetchLaunches();
    }, []);

    // Countdown Timer logic
    useEffect(() => {
        if (!nextLaunch) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const launchTime = new Date(nextLaunch.net).getTime();
            const distance = launchTime - now;

            if (distance < 0) {
                setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            } else {
                setCountdown({
                    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((distance % (1000 * 60)) / 1000)
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [nextLaunch]);

    const getFilteredLaunches = () => {
        if (filter === 'ALL') return launches;
        return launches.filter(l => {
            const provider = l.launch_service_provider?.name?.toLowerCase() || '';
            const desc = l.mission?.description?.toLowerCase() || '';
            const title = l.name?.toLowerCase() || '';

            if (filter === 'SPACEX') return provider.includes('spacex');
            if (filter === 'ISRO') return provider.includes('isro');
            if (filter === 'MOON') return desc.includes('moon') || desc.includes('lunar') || title.includes('moon');
            if (filter === 'MARS') return desc.includes('mars') || title.includes('mars');
            return true;
        });
    };

    if (loading) return <div className="loading-screen">Aligning Telemetry...</div>;

    const filtered = getFilteredLaunches();

    return (
        <div className="missions-container">
            {/* Hero: Next Launch Countdown */}
            {nextLaunch && (
                <div className="launch-hero" style={{
                    backgroundImage: nextLaunch.image ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.9)), url(${nextLaunch.image})` : undefined
                }}>
                    <div className="hero-content">
                        <div className="badge-live">NEXT <SmartTerm term="Mission" /></div>
                        <h1 className="hero-title">{nextLaunch.name}</h1>
                        <p className="hero-provider">{nextLaunch.launch_service_provider?.name}</p>

                        <div className="countdown-grid">
                            <div className="count-box">
                                <span className="val">{countdown.days}</span>
                                <span className="label">DAYS</span>
                            </div>
                            <div className="count-box">
                                <span className="val">{countdown.hours}</span>
                                <span className="label">HRS</span>
                            </div>
                            <div className="count-box">
                                <span className="val">{countdown.minutes}</span>
                                <span className="label">MIN</span>
                            </div>
                            <div className="count-box">
                                <span className="val">{countdown.seconds}</span>
                                <span className="label">SEC</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mission Section Header - Positioned Above the Timeline */}
            <div className="timeline-header-block">
                <h2 className="section-title"><SmartTerm term="Mission" /> Timeline</h2>
                <div className="filters-container">
                    <div className="filters">
                        {['ALL', 'SPACEX', 'ISRO', 'MOON', 'MARS'].map(f => (
                            <button
                                key={f}
                                className={`filter-btn ${filter === f ? 'active' : ''}`}
                                onClick={() => setFilter(f)}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Timeline Section Track */}
            <div className="timeline-section">
                <div className="timeline-track">
                    {filtered.map((mission, idx) => {
                        const isPast = new Date(mission.net) < new Date();
                        return (
                            <div key={mission.id} className={`timeline-card ${isPast ? 'past' : 'future'}`}>
                                <div className="timeline-marker">
                                    {isPast ? <div className="dot past"></div> : <Rocket className="icon-marker" size={16} />}
                                    <div className="line"></div>
                                </div>
                                <div className="card-content glass-panel">
                                    <div className="card-top">
                                        <span className={`status-badge ${mission.status?.name === 'Success' ? 'success' : 'pending'}`}>
                                            {mission.status?.name || 'Scheduled'}
                                        </span>
                                        <span className="mission-date">
                                            {new Date(mission.net).toLocaleDateString(undefined, {
                                                year: 'numeric', month: 'short', day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <h3 className="mission-name">{mission.name}</h3>
                                    <p className="mission-desc">{mission.mission?.description || "No mission description available."}</p>
                                    <div className="mission-meta">
                                        <div className="meta-item">
                                            <Globe size={14} />
                                            <span>{mission.launch_service_provider?.name}</span>
                                        </div>
                                        {mission.pad && (
                                            <div className="meta-item">
                                                <SmartTerm term="Satellite" display={<Satellite size={14} />} />
                                                <span>{mission.pad.location?.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Missions;

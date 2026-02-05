import React, { useState, useEffect } from 'react';
import {
    Users,
    Video,
    Copy,
    MessageCircle,
    User,
    Calendar,
    ShieldCheck,
    Search,
    Filter,
    ArrowRight,
    ExternalLink
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import ChatModal from '../components/ChatModal';
import './InstructorConnect.css';

const InstructorConnect = () => {
    const [instructors, setInstructors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterExpertise, setFilterExpertise] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedInstructor, setSelectedInstructor] = useState(null);
    const [upcomingSessions, setUpcomingSessions] = useState([]);

    useEffect(() => {
        fetchInstructors();
        fetchUpcomingSessions();
    }, []);

    const fetchUpcomingSessions = async () => {
        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/sessions/public');
            const data = await res.json();
            setUpcomingSessions(data);
        } catch (err) {
            console.error('Error fetching sessions:', err);
        }
    };

    const fetchInstructors = async () => {
        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/instructors');
            const data = await res.json();
            if (Array.isArray(data)) {
                setInstructors(data);
            } else {
                console.error('API Error:', data);
                setInstructors([]);
            }
        } catch (err) {
            console.error('Error fetching instructors:', err);
            setInstructors([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = (link) => {
        navigator.clipboard.writeText(link);
        alert('Session link copied to clipboard!');
    };

    const filteredInstructors = instructors.filter(ins => {
        const matchesSearch = ins.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ins.specialization.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterExpertise === 'All' || ins.specialization.includes(filterExpertise);
        return matchesSearch && matchesFilter;
    });

    const expertiseList = ['All', ...new Set(instructors.map(ins => ins.specialization))];

    return (
        <div className="instructor-connect-container">
            <Navbar />

            <header className="connect-header">
                <div className="header-content fade-in">
                    <h1>Connect with Cosmic Experts</h1>
                    <p>Learn from verified mission commanders, researchers, and astrophysicists in real-time.</p>
                </div>
            </header>

            <div className="connect-controls glass-panel fade-in">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or specialty..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-box">
                    <Filter size={20} />
                    <select value={filterExpertise} onChange={(e) => setFilterExpertise(e.target.value)}>
                        {expertiseList.map(exp => <option key={exp} value={exp}>{exp}</option>)}
                    </select>
                </div>
            </div>

            {/* UPCOMING SESSIONS HIGHLIGHT */}
            <div className="upcoming-section-grid fade-in">
                <h2><Calendar size={20} /> Upcoming Briefings</h2>
                <div className="upcoming-scroll">
                    {upcomingSessions.length > 0 ? upcomingSessions.map(session => (
                        <div key={session.id} className="upcoming-card glass-panel" title={session.description}>
                            <div className="uc-header">
                                <div className="uc-badge">{session.status === 'LIVE' ? '🔴 LIVE' : 'SCHEDULED'}</div>
                                <span className="uc-time">{new Date(session.start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <h3 className="uc-title">{session.title}</h3>
                            <div className="uc-instructor">
                                <img src={session.instructor_image} alt={session.instructor_name} className="uc-avatar" />
                                <div className="uc-meta">
                                    <span className="uc-name">{session.instructor_name}</span>
                                    <span className="uc-topic">{session.topic}</span>
                                </div>
                            </div>
                            <button className="uc-join-btn" onClick={() => window.open(session.meeting_link, '_blank')}>
                                <Video size={16} /> Join Mission
                            </button>
                        </div>
                    )) : <div className="uc-empty">No upcoming briefings scheduled.</div>}
                </div>
            </div>

            <main className="instructor-grid">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Syncing with personnel roster...</p>
                    </div>
                ) : filteredInstructors.length > 0 ? (
                    filteredInstructors.map(ins => (
                        <InstructorCard
                            key={ins.id}
                            instructor={ins}
                            onCopy={handleCopyLink}
                            onChat={() => setSelectedInstructor(ins)}
                        />
                    ))
                ) : (
                    <div className="empty-state">
                        <Users size={48} />
                        <h3>No experts found</h3>
                        <p>Try adjusting your search or filters.</p>
                    </div>
                )}
            </main>

            {
                selectedInstructor && (
                    <ChatModal
                        instructor={selectedInstructor}
                        onClose={() => setSelectedInstructor(null)}
                    />
                )
            }
        </div >
    );
};

const InstructorCard = ({ instructor, onCopy, onChat }) => {
    const {
        name,
        role,
        specialization,
        image,
        status,
        session_title,
        session_link,
        upcoming_session
    } = instructor;

    const getStatusColor = () => {
        switch (status) {
            case 'ONLINE': return '#10b981';
            case 'IN_SESSION': return '#ef4444';
            default: return '#94a3b8';
        }
    };

    return (
        <div className="expert-card glass-panel fade-in">
            {status === 'IN_SESSION' && (
                <div className="live-banner">
                    <div className="live-dot"></div>
                    <span>LIVE SESSION</span>
                </div>
            )}

            <div className="card-top">
                <div className="avatar-wrapper">
                    <img src={image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=22a6b3&color=fff`} alt={name} />
                    <div className="status-indicator" style={{ backgroundColor: getStatusColor() }}></div>
                    <div className="verified-badge" title="Verified Expert">
                        <ShieldCheck size={14} />
                    </div>
                </div>

                <div className="expert-main-info">
                    <h3>{name}</h3>
                    <p className="expert-role">{role}</p>
                    <div className="expert-tags">
                        <span className="tag">{specialization}</span>
                    </div>
                </div>
            </div>

            <div className="card-body">
                {status === 'IN_SESSION' ? (
                    <div className="session-info active">
                        <h4>{session_title || 'Ongoing Briefing'}</h4>
                        <div className="session-actions">
                            <a href={session_link} target="_blank" rel="noreferrer" className="btn-join">
                                <Video size={16} /> Join Now
                            </a>
                            <button className="btn-icon" onClick={() => onCopy(session_link)} title="Copy Link">
                                <Copy size={16} />
                            </button>
                        </div>
                    </div>
                ) : upcoming_session ? (
                    <div className="session-info upcoming">
                        <div className="upcoming-label">
                            <Calendar size={14} />
                            <span>Upcoming: {new Date(upcoming_session).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <h4>{session_title || 'Scheduled Briefing'}</h4>
                    </div>
                ) : (
                    <div className="expert-bio">
                        <p>Available for one-to-one mentorship and technical guidance on {specialization}.</p>
                    </div>
                )}
            </div>

            <div className="card-footer">
                <button className="btn-chat" onClick={onChat}>
                    <MessageCircle size={18} />
                    <span>Real-time Chat</span>
                </button>
                <button className="btn-profile">
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default InstructorConnect;

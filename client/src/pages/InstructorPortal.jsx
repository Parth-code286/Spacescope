import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Calendar,
    Video,
    Users,
    Settings,
    Plus,
    Play,
    Square,
    Copy,
    Clock,
    BookOpen,
    FileUp,
    Star,
    MessageCircle,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import './InstructorPortal.css';

const InstructorPortal = () => {
    const [instructor, setInstructor] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [stats, setStats] = useState({ activeStudents: 0, totalHours: 0, rating: 4.9 });
    const [view, setView] = useState('DASHBOARD'); // DASHBOARD, SESSIONS, PROFILE
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newSession, setNewSession] = useState({
        title: '',
        topic: '',
        description: '',
        start_time: '',
        duration: 60
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const info = localStorage.getItem('instructorInfo');
        if (!info) {
            window.location.href = '/community';
            return;
        }
        const parsed = JSON.parse(info);
        setInstructor(parsed);
        fetchSessions(parsed.id);
    }, []);

    const fetchSessions = async (id) => {
        try {
            const res = await fetch(`https://spacescope-1v1p.onrender.com/api/instructor-sessions?instructorId=${id}`);
            const data = await res.json();
            setSessions(data);

            // Calculate total hours
            const total = data.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
            setStats(prev => ({ ...prev, totalHours: total.toFixed(1) }));
        } catch (err) {
            console.error('Error fetching sessions:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/instructor-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newSession, instructor_id: instructor.id })
            });
            if (res.ok) {
                setIsCreateModalOpen(false);
                fetchSessions(instructor.id);
                setNewSession({ title: '', topic: '', description: '', start_time: '', duration: 60 });
            }
        } catch (err) {
            console.error('Error creating session:', err);
        }
    };

    const updateSessionStatus = async (id, status) => {
        try {
            const res = await fetch(`https://spacescope-1v1p.onrender.com/api/instructor-sessions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchSessions(instructor.id);
                // Also update main instructor status for the student view
                await fetch(`https://spacescope-1v1p.onrender.com/api/instructors/${instructor.id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: status === 'LIVE' ? 'IN_SESSION' : 'ONLINE',
                        sessionTitle: status === 'LIVE' ? sessions.find(s => s.id === id).title : null,
                        sessionLink: status === 'LIVE' ? sessions.find(s => s.id === id).meeting_link : null
                    })
                });
            }
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    if (isLoading) return <div className="portal-loading"><Loader2 className="spin" /> Syncing with Command Center...</div>;

    const liveSessions = sessions.filter(s => s.status === 'LIVE');
    const upcomingSessions = sessions.filter(s => s.status === 'UPCOMING');

    return (
        <div className="instructor-portal-container fade-in">
            {/* SIDEBAR */}
            <aside className="portal-sidebar glass-panel">
                <div className="portal-branding">
                    <div className="logo-icon"><Video size={24} /></div>
                    <span>SpaceScope Portal</span>
                </div>

                <nav className="portal-nav">
                    <button className={view === 'DASHBOARD' ? 'active' : ''} onClick={() => setView('DASHBOARD')}>
                        <LayoutDashboard size={20} /> Dashboard
                    </button>
                    <button className={view === 'SESSIONS' ? 'active' : ''} onClick={() => setView('SESSIONS')}>
                        <Calendar size={20} /> My Sessions
                    </button>
                    <button className={view === 'PROFILE' ? 'active' : ''} onClick={() => setView('PROFILE')}>
                        <Settings size={20} /> Configuration
                    </button>
                </nav>

                <div className="portal-user">
                    <img src={instructor.image} alt={instructor.name} />
                    <div className="user-info">
                        <strong>{instructor.name}</strong>
                        <span>{instructor.specialization}</span>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="portal-main">
                {view === 'DASHBOARD' && (
                    <div className="dashboard-content fade-in">
                        <header className="portal-header">
                            <div>
                                <h1>Welcome Back, {instructor.name.split(' ')[0]}</h1>
                                <p>Your mission control for upcoming live sessions.</p>
                            </div>
                            <button className="create-btn" onClick={() => setIsCreateModalOpen(true)}>
                                <Plus size={20} /> Dispatch New Session
                            </button>
                        </header>

                        {/* STATS GRID */}
                        <div className="stats-grid">
                            <div className="stat-card glass-panel">
                                <Users className="stat-icon blue" />
                                <div className="stat-data">
                                    <h3>{stats.activeStudents}</h3>
                                    <span>Active Students</span>
                                </div>
                            </div>
                            <div className="stat-card glass-panel">
                                <Clock className="stat-icon purple" />
                                <div className="stat-data">
                                    <h3>{stats.totalHours}h</h3>
                                    <span>Total Transmission</span>
                                </div>
                            </div>
                            <div className="stat-card glass-panel">
                                <Star className="stat-icon gold" />
                                <div className="stat-data">
                                    <h3>{stats.rating}</h3>
                                    <span>Expert Rating</span>
                                </div>
                            </div>
                        </div>

                        {/* LIVE SECTION */}
                        {liveSessions.length > 0 && (
                            <section className="live-now-section">
                                <h2 className="section-title">🔴 CURRENTLY TRANSMITTING</h2>
                                {liveSessions.map(session => (
                                    <div key={session.id} className="live-session-card glass-panel">
                                        <div className="live-info">
                                            <div className="live-badge">LIVE</div>
                                            <h3>{session.title}</h3>
                                            <p>{session.topic}</p>
                                        </div>
                                        <div className="live-controls">
                                            <button className="control-btn end" onClick={() => updateSessionStatus(session.id, 'COMPLETED')}>
                                                <Square size={16} /> End Mission
                                            </button>
                                            <a href={session.meeting_link} target="_blank" rel="noreferrer" className="control-btn join">
                                                <Play size={16} /> Enter Comms
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </section>
                        )}

                        {/* UPCOMING SECTION */}
                        <section className="upcoming-section">
                            <h2 className="section-title">UPCOMING MISSIONS</h2>
                            <div className="session-list">
                                {upcomingSessions.length > 0 ? upcomingSessions.map(session => (
                                    <div key={session.id} className="session-card glass-panel">
                                        <div className="card-top">
                                            <div className="session-time">
                                                <Clock size={16} />
                                                {new Date(session.start_time).toLocaleString()}
                                            </div>
                                            <div className="status-tag upcoming">Scheduled</div>
                                        </div>
                                        <h3>{session.title}</h3>
                                        <p className="topic-text">{session.topic}</p>
                                        <div className="card-actions">
                                            <button className="action-btn" onClick={() => {
                                                navigator.clipboard.writeText(session.meeting_link);
                                                alert("Link copied to clipboard!");
                                            }}>
                                                <Copy size={16} /> Copy Link
                                            </button>
                                            <button className="action-btn go-live" onClick={() => updateSessionStatus(session.id, 'LIVE')}>
                                                <Play size={16} /> Go Live
                                            </button>
                                        </div>
                                    </div>
                                )) : <div className="empty-state glass-panel">No missions scheduled. Time to dispatch some knowledge!</div>}
                            </div>
                        </section>
                    </div>
                )}

                {view === 'SESSIONS' && (
                    <div className="sessions-content fade-in">
                        <header className="portal-header">
                            <h1>Transmission History</h1>
                            <p>Overview of all past and planned cosmic sessions.</p>
                        </header>
                        <div className="history-table-container glass-panel">
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Date</th>
                                        <th>Duration</th>
                                        <th>Students</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map(session => (
                                        <tr key={session.id}>
                                            <td><strong>{session.title}</strong></td>
                                            <td>{new Date(session.start_time).toLocaleDateString()}</td>
                                            <td>{session.duration} mins</td>
                                            <td>{session.student_count || 0}</td>
                                            <td><span className={`status-pill ${session.status.toLowerCase()}`}>{session.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'PROFILE' && (
                    <div className="profile-content fade-in">
                        <header className="portal-header">
                            <h1>Configuration</h1>
                            <p>Manage your instructor profile and system preferences.</p>
                        </header>

                        <div className="config-grid">
                            <div className="config-card glass-panel">
                                <h2><Users size={20} /> Public Profile</h2>
                                <div className="config-item">
                                    <label>Display Name</label>
                                    <input type="text" value={instructor.name} readOnly className="dummy-input" />
                                </div>
                                <div className="config-item">
                                    <label>Specialization Tag</label>
                                    <input type="text" value={instructor.specialization} readOnly className="dummy-input" />
                                </div>
                                <div className="config-item">
                                    <label>Bio Visibility</label>
                                    <select className="dummy-input">
                                        <option>Public (Visible to everyone)</option>
                                        <option>Students Only</option>
                                    </select>
                                </div>
                            </div>

                            <div className="config-card glass-panel">
                                <h2><Clock size={20} /> Availability & Schedule</h2>
                                <div className="config-item">
                                    <label>Time Zone</label>
                                    <select className="dummy-input">
                                        <option>UTC (Coordinated Universal Time)</option>
                                        <option>EST (Eastern Standard Time)</option>
                                        <option>PST (Pacific Standard Time)</option>
                                    </select>
                                </div>
                                <div className="config-item">
                                    <label>Default Session Duration</label>
                                    <select className="dummy-input">
                                        <option>30 Minutes</option>
                                        <option selected>60 Minutes</option>
                                        <option>90 Minutes</option>
                                    </select>
                                </div>
                            </div>

                            <div className="config-card glass-panel">
                                <h2><MessageCircle size={20} /> Notifications</h2>
                                <div className="toggle-item">
                                    <span>Email Alerts for New Students</span>
                                    <input type="checkbox" checked readOnly />
                                </div>
                                <div className="toggle-item">
                                    <span>Session Reminders (15 min prior)</span>
                                    <input type="checkbox" checked readOnly />
                                </div>
                                <div className="toggle-item">
                                    <span>Daily Summary Report</span>
                                    <input type="checkbox" />
                                </div>
                            </div>

                            <div className="config-card glass-panel">
                                <h2><Settings size={20} /> System</h2>
                                <div className="config-item">
                                    <label>Interface Theme</label>
                                    <select className="dummy-input">
                                        <option>Cosmic Dark (Default)</option>
                                        <option>Starfield Contrast</option>
                                    </select>
                                </div>
                                <div className="config-item">
                                    <button className="danger-btn box-btn">Request Account Deletion</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* CREATE SESSION MODAL */}
            {isCreateModalOpen && (
                <div className="modal-overlay">
                    <div className="session-modal glass-panel fade-in">
                        <div className="modal-header">
                            <h2>Dispatch New Mission</h2>
                            <button className="close-btn" onClick={() => setIsCreateModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateSession} className="session-form">
                            <div className="form-group">
                                <label>Session Title</label>
                                <input
                                    required
                                    placeholder="e.g. Navigating the Kuiper Belt"
                                    value={newSession.title}
                                    onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Topic / Research Area</label>
                                <input
                                    required
                                    placeholder="e.g. Orbital Mechanics"
                                    value={newSession.topic}
                                    onChange={e => setNewSession({ ...newSession, topic: e.target.value })}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Date & Time</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={newSession.start_time}
                                        onChange={e => setNewSession({ ...newSession, start_time: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Duration (Mins)</label>
                                    <input
                                        required
                                        type="number"
                                        value={newSession.duration}
                                        onChange={e => setNewSession({ ...newSession, duration: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    rows="3"
                                    placeholder="Brief summary of the session goals..."
                                    value={newSession.description}
                                    onChange={e => setNewSession({ ...newSession, description: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="dispatch-btn">Dispatch Session</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructorPortal;

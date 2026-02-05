import React, { useState, useEffect } from 'react';
import { Users, Upload, CheckCircle, XCircle, MessageSquare, Image as ImageIcon, Send, ShieldCheck, Clock, Eye, HelpCircle, UserPlus, FileText } from 'lucide-react';
import SmartTerm from '../components/SmartTerm';
import './Community.css';

const Community = () => {
    const [view, setView] = useState('FEED'); // FEED, DOUBTS, SUBMIT, INSTRUCTOR_JOIN
    const [reports, setReports] = useState([]);
    const [doubts, setDoubts] = useState([]);
    const [form, setForm] = useState({ title: '', content: '', category: 'Observation', images: [] });
    const [doubtForm, setDoubtForm] = useState({ question: '' });
    const [instructorForm, setInstructorForm] = useState({
        fullName: '',
        email: '',
        specialization: '',
        bio: '',
        image: null,
        resume: null,
        certificate: null,
        idCard: null
    });
    const [replyForm, setReplyForm] = useState({ doubtId: null, text: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginForm, setLoginForm] = useState({ email: '', accessCode: '' });
    const [loginError, setLoginError] = useState('');

    // Initial Load
    useEffect(() => {
        fetchReports();
        fetchDoubts();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/reports?status=APPROVED');
            const data = await res.json();
            setReports(data);
        } catch (err) {
            console.error('Error fetching reports:', err);
        }
    };

    const fetchDoubts = async () => {
        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/doubts');
            const data = await res.json();
            setDoubts(data);
        } catch (err) {
            console.error('Error fetching doubts:', err);
        }
    };

    // Form Handlers
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, images: [...prev.images, reader.result] }));
            };
            reader.readAsDataURL(file);
        });
    };

    const handleInstructorFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setInstructorForm(prev => ({ ...prev, [field]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    user: "Guest_User"
                })
            });

            if (res.ok) {
                setForm({ title: '', content: '', category: 'Observation', images: [] });
                setView('FEED');
                alert("Report submitted! It is now waiting for Admin validation.");
                fetchReports();
            }
        } catch (err) {
            console.error('Error submitting report:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Doubt Handlers
    const handleDoubtSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/doubts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user: "Student_X",
                    question: doubtForm.question
                })
            });
            if (res.ok) {
                setDoubtForm({ question: '' });
                fetchDoubts();
            }
        } catch (err) {
            console.error('Error submitting doubt:', err);
        }
    };

    const handleReplySubmit = async (e, doubtId) => {
        e.preventDefault();
        try {
            const res = await fetch(`https://spacescope-1v1p.onrender.com/api/doubts/${doubtId}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user: "Space_Explorer",
                    text: replyForm.text
                })
            });
            if (res.ok) {
                setReplyForm({ doubtId: null, text: '' });
                fetchDoubts();
            }
        } catch (err) {
            console.error('Error submitting reply:', err);
        }
    };

    const handleInstructorLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setIsSubmitting(true);
        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/instructor-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginForm)
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('instructorInfo', JSON.stringify(data));
                window.location.href = '/instructor/portal';
            } else {
                setLoginError(data.error || 'Login failed');
            }
        } catch (err) {
            setLoginError('Server connection failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const approvedReports = reports.filter(r => r.status === 'APPROVED');
    const pendingReports = reports.filter(r => r.status === 'PENDING');

    return (
        <div className="community-container fade-in">
            {/* TAB NAVIGATION */}
            <div className="community-nav glass-panel">
                <button className={`nav-tab ${view === 'FEED' ? 'active' : ''}`} onClick={() => setView('FEED')}>
                    <Users size={20} /> Space Intel
                </button>
                <button className={`nav-tab ${view === 'DOUBTS' ? 'active' : ''}`} onClick={() => setView('DOUBTS')}>
                    <MessageSquare size={20} /> Crew Quarters
                </button>
                <button className={`nav-tab ${view === 'SUBMIT' ? 'active' : ''}`} onClick={() => setView('SUBMIT')}>
                    <Upload size={20} /> Contribute
                </button>
                <button className={`nav-tab ${view === 'INSTRUCTOR_JOIN' ? 'active' : ''}`} onClick={() => setView('INSTRUCTOR_JOIN')}>
                    <UserPlus size={20} /> Are you an Instructor?
                </button>
            </div>

            {/* REVIEW SECTION AT TOP (Highlights) */}
            {view === 'FEED' && (
                <div className="review-highlight-section">
                    <div className="section-tag">LATEST VALIDATED REPORTS</div>
                    <div className="highlight-scroll">
                        {approvedReports.slice(0, 3).map(r => (
                            <div key={r.id} className="highlight-card glass-panel" onClick={() => setView('FEED')}>
                                <div className="h-cat">{r.category}</div>
                                <h4>{r.title}</h4>
                                <div className="h-meta"><Clock size={12} /> {new Date(r.timestamp).toLocaleDateString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MAIN VIEWS */}
            <main className="community-main">
                {view === 'FEED' && (
                    <div className="feed-view">
                        <div className="feed-header">
                            <h2>The Collective Conscious</h2>
                            <p>Global space intelligence verified by our crew.</p>
                        </div>
                        <div className="report-grid">
                            {approvedReports.length > 0 ? approvedReports.map(report => (
                                <ReportCard key={report.id} report={report} />
                            )) : <div className="empty-msg">No reports found. Be the first to share!</div>}
                        </div>
                    </div>
                )}

                {view === 'DOUBTS' && (
                    <div className="doubts-view">
                        <div className="doubts-header">
                            <h2>Crew Quarters: Study Deck</h2>
                            <p>Discuss doubts, solve cosmic mysteries, and help fellow students.</p>
                        </div>

                        <div className="doubt-input-section glass-panel">
                            <form onSubmit={handleDoubtSubmit} className="doubt-form">
                                <HelpCircle size={24} className="text-orange-400" />
                                <input
                                    required
                                    placeholder="Got a space question? Ask the crew..."
                                    value={doubtForm.question}
                                    onChange={e => setDoubtForm({ question: e.target.value })}
                                />
                                <button type="submit" className="ask-btn">Ask Question</button>
                            </form>
                        </div>

                        <div className="doubts-list">
                            {doubts.length > 0 ? doubts.map(doubt => (
                                <div key={doubt.id} className="doubt-card glass-panel fade-in">
                                    <div className="doubt-header">
                                        <span className="doubt-user">@{doubt.user} asked:</span>
                                        <span className="doubt-time">{new Date(doubt.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div className="doubt-question">
                                        <h3>{doubt.question}</h3>
                                    </div>

                                    <div className="replies-section">
                                        {doubt.replies.map((reply, i) => (
                                            <div key={i} className="reply-item">
                                                <div className="reply-meta">
                                                    <span className="reply-user">@{reply.user}</span>
                                                    <span className="reply-time">{new Date(reply.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                                <p className="reply-text">{reply.text}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <form onSubmit={(e) => handleReplySubmit(e, doubt.id)} className="reply-form">
                                        <input
                                            required
                                            placeholder="Add a reply..."
                                            value={replyForm.doubtId === doubt.id ? replyForm.text : ''}
                                            onFocus={() => setReplyForm({ ...replyForm, doubtId: doubt.id })}
                                            onChange={e => setReplyForm({ ...replyForm, text: e.target.value })}
                                        />
                                        <button type="submit" className="reply-btn"><Send size={16} /></button>
                                    </form>
                                </div>
                            )) : <div className="empty-msg">Total silence in the comms. Start a discussion!</div>}
                        </div>
                    </div>
                )}

                {view === 'SUBMIT' && (
                    <div className="submit-view glass-panel">
                        <h2>Dispatch New Intel</h2>
                        <form onSubmit={handleSubmit} className="submit-form">
                            <div className="form-group">
                                <label>Report Title</label>
                                <input
                                    required
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Unusual Glow in North Sky"
                                />
                            </div>

                            <div className="form-group">
                                <label>Type</label>
                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option>Observation</option>
                                    <option>Opinion</option>
                                    <option>Report</option>
                                    <option>Question</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Detailed Description</label>
                                <textarea
                                    required
                                    rows="5"
                                    value={form.content}
                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                    placeholder="Describe your observation, impact, or opinion..."
                                ></textarea>
                            </div>

                            <div className="form-group">
                                <label>Attach Evidence (Images)</label>
                                <div className="image-upload-zone">
                                    <input type="file" multiple accept="image/*" onChange={handleFileChange} id="file-upload" />
                                    <label htmlFor="file-upload" className="upload-btn">
                                        <ImageIcon size={24} /> Upload Images
                                    </label>
                                    <div className="preview-strip">
                                        {form.images.map((img, i) => (
                                            <div key={i} className="preview-box" style={{ backgroundImage: `url(${img})` }}></div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="submit-action-btn" disabled={isSubmitting}>
                                {isSubmitting ? "Transmitting..." : <><Send size={18} /> Submit for Validation</>}
                            </button>
                        </form>
                    </div>
                )}

                {view === 'INSTRUCTOR_JOIN' && (
                    <div className="instructor-join-container">
                        <div className="instructor-form-view glass-panel fade-in">
                            <div className="form-head">
                                <h2>Join the Elite Faculty</h2>
                                <p>Apply to become a verified SpaceScope Instructor and mentor the next generation of explorers.</p>
                            </div>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setIsSubmitting(true);
                                try {
                                    const res = await fetch('https://spacescope-1v1p.onrender.com/api/instructor-applications', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(instructorForm)
                                    });
                                    if (res.ok) {
                                        alert("Application transmitted! Our Command Center will review your credentials.");
                                        setView('FEED');
                                    }
                                } catch (err) {
                                    console.error('Error submitting application:', err);
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }} className="instructor-form">

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input required placeholder="Dr. Jane Doe" onChange={e => setInstructorForm({ ...instructorForm, fullName: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input required type="email" placeholder="jane@institute.edu" onChange={e => setInstructorForm({ ...instructorForm, email: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Specialization</label>
                                    <input required placeholder="e.g. Exoplanet Topology, Orbital Mechanics" onChange={e => setInstructorForm({ ...instructorForm, specialization: e.target.value })} />
                                    <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '4px' }}>
                                        Fields like <SmartTerm term="Orbit" display="Orbital Mechanics" /> are highly valued.
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Short Bio</label>
                                    <textarea rows="3" placeholder="Tell us about your research or teaching experience..." onChange={e => setInstructorForm({ ...instructorForm, bio: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label>Profile Picture</label>
                                    <div className="profile-upload-row">
                                        <div className="upload-field">
                                            <input type="file" accept="image/*" onChange={e => handleInstructorFileChange(e, 'image')} />
                                        </div>
                                        {instructorForm.image && <img src={instructorForm.image} alt="Preview" className="profile-preview-sm" />}
                                    </div>
                                </div>

                                <div className="upload-grid">
                                    <div className="upload-field">
                                        <label><FileText size={16} /> CV / Resume</label>
                                        <input type="file" required onChange={e => handleInstructorFileChange(e, 'resume')} />
                                    </div>
                                    <div className="upload-field">
                                        <label><FileText size={16} /> PhD Certificate</label>
                                        <input type="file" required onChange={e => handleInstructorFileChange(e, 'certificate')} />
                                    </div>
                                    <div className="upload-field">
                                        <label><ShieldCheck size={16} /> Identity (Govt ID)</label>
                                        <input type="file" required onChange={e => handleInstructorFileChange(e, 'idCard')} />
                                    </div>
                                </div>

                                <button type="submit" className="submit-action-btn" disabled={isSubmitting}>
                                    {isSubmitting ? "Uploading Documents..." : "Submit Application"}
                                </button>
                            </form>
                        </div>

                        <div className="instructor-login-section glass-panel fade-in">
                            <div className="form-head">
                                <h2>Verified Instructor Login</h2>
                                <p>Already a verified instructor? Enter your credentials to manage your sessions.</p>
                            </div>

                            <form onSubmit={handleInstructorLogin} className="instructor-form">
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="your@email.com"
                                        value={loginForm.email}
                                        onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Instructor Access Code</label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="CMD-XXXXXX"
                                        value={loginForm.accessCode}
                                        onChange={e => setLoginForm({ ...loginForm, accessCode: e.target.value })}
                                    />
                                </div>

                                {loginError && <div className="error-msg">{loginError}</div>}

                                <button type="submit" className="submit-action-btn" disabled={isSubmitting}>
                                    {isSubmitting ? "Authenticating..." : "Enter Command Center"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const ReportCard = ({ report }) => (
    <div className="report-card glass-panel fade-in">
        <div className="report-header">
            <span className="report-cat">{report.category}</span>
            <span className="report-user">@{report.user}</span>
        </div>

        {report.images.length > 0 && (
            <div className="report-image" style={{ backgroundImage: `url(${report.images[0]})` }}>
                {report.images.length > 1 && <div className="img-count">+{report.images.length - 1}</div>}
            </div>
        )}

        <div className="report-body">
            <h3>{report.title}</h3>
            <p>{report.content}</p>
        </div>

        <div className="report-footer">
            <div className="footer-stats">
                <span><MessageSquare size={14} /> 0 Responses</span>
                <span><Eye size={14} /> {Math.floor(Math.random() * 50) + 5} Views</span>
            </div>
            <span className="report-time">{new Date(report.timestamp).toLocaleDateString()}</span>
        </div>
    </div>
);

export default Community;

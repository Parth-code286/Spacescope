import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldClose, Clock, User, Mail, GraduationCap } from 'lucide-react';

const ApplicantList = ({ onVerify }) => {
    const [applicants, setApplicants] = useState([]);

    useEffect(() => {
        fetchApplicants();
    }, []);

    const fetchApplicants = async () => {
        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/instructor-applications');
            const data = await res.json();
            // Map DB snake_case to component camelCase
            const mapped = data.map(app => ({
                id: app.id,
                fullName: app.full_name,
                email: app.email,
                specialization: app.specialization,
                bio: app.bio,
                resume: app.resume,
                certificate: app.certificate,
                idCard: app.id_card,
                status: app.status,
                appliedAt: app.applied_at
            }));
            setApplicants(mapped);
        } catch (err) {
            console.error('Error fetching applicants:', err);
        }
    };

    const pendingApps = applicants; // Server already filters for PENDING

    return (
        <div className="applicant-list-view fade-in">
            <div className="view-header">
                <div>
                    <h1>Pending Verifications</h1>
                    <p>Review credentials for {pendingApps.length} incoming faculty applicants.</p>
                </div>
            </div>

            <div className="applicant-grid">
                {pendingApps.length > 0 ? pendingApps.map(app => (
                    <div key={app.id} className="applicant-card glass-panel">
                        <div className="applicant-main">
                            <div className="applicant-token">
                                <User size={32} className="text-cyan-400" />
                            </div>
                            <div className="applicant-meta">
                                <h3>{app.fullName}</h3>
                                <div className="meta-row">
                                    <GraduationCap size={14} />
                                    <span>{app.specialization}</span>
                                </div>
                                <div className="meta-row">
                                    <Mail size={14} />
                                    <span>{app.email}</span>
                                </div>
                            </div>
                        </div>

                        <div className="applicant-footer">
                            <div className="applied-at">
                                <Clock size={12} />
                                <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                            </div>
                            <button className="verify-button" onClick={() => onVerify(app)}>
                                <span>Analyze Credentials</span>
                                <UserCheck size={16} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="empty-state">
                        <UserCheck size={48} className="text-slate-700" />
                        <p>No new applications detected in the transmission buffer.</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .applicant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 2rem; margin-top: 2rem; }
                .applicant-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; position: relative; overflow: hidden; }
                .applicant-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--accent-primary); }
                .applicant-main { display: flex; gap: 1.5rem; align-items: center; }
                .applicant-token { width: 60px; height: 60px; border-radius: 50%; background: rgba(34, 166, 179, 0.1); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(34, 166, 179, 0.2); }
                .applicant-meta h3 { font-size: 1.25rem; color: #fff; margin-bottom: 0.5rem; }
                .meta-row { display: flex; align-items: center; gap: 8px; color: #888; font-size: 0.85rem; margin-bottom: 4px; }
                .applicant-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem; }
                .applied-at { display: flex; align-items: center; gap: 6px; color: #555; font-size: 0.75rem; font-family: monospace; }
                .verify-button { background: var(--accent-primary); color: #000; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.2s; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .verify-button:hover { box-shadow: 0 0 15px var(--accent-primary); transform: translateY(-1px); }
                .empty-state { text-align: center; padding: 100px; grid-column: 1 / -1; color: #444; }
            `}</style>
        </div>
    );
};

export default ApplicantList;

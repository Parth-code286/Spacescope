import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';

const CommanderReview = () => {
    const [reports, setReports] = useState([]);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/reports?status=PENDING');
            const data = await res.json();
            // Map 'username' to 'user' for component consistency
            const mapped = data.map(r => ({
                ...r,
                user: r.username
            }));
            setReports(mapped);
        } catch (err) {
            console.error('Error fetching reports:', err);
        }
    };

    const handleAdminAction = async (id, status) => {
        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/reports/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            if (res.ok) {
                fetchReports();
            }
        } catch (err) {
            console.error('Error verifying report:', err);
        }
    };

    const pendingReports = reports.filter(r => r.status === 'PENDING');

    return (
        <div className="commander-review-view fade-in">
            <div className="view-header">
                <div>
                    <h1>Commander Review Console</h1>
                    <p>Validate incoming intelligence from the global crew.</p>
                </div>
            </div>

            <div className="admin-list">
                {pendingReports.length > 0 ? pendingReports.map(report => (
                    <div key={report.id} className="admin-item glass-panel">
                        <div className="admin-item-info">
                            <div className="item-head">
                                <span className="item-user">@{report.user}</span>
                                <span className="item-date"><Clock size={12} /> {new Date(report.timestamp).toLocaleString()}</span>
                            </div>
                            <h3>{report.title}</h3>
                            <p>{report.content}</p>
                            <div className="admin-images">
                                {report.images && report.images.map((img, i) => <img key={i} src={img} alt="Evidence" />)}
                            </div>
                        </div>
                        <div className="admin-actions">
                            <button className="approve-btn" onClick={() => handleAdminAction(report.id, 'APPROVED')}>
                                <CheckCircle size={20} /> Verify
                            </button>
                            <button className="reject-btn" onClick={() => handleAdminAction(report.id, 'REJECTED')}>
                                <XCircle size={20} /> Reject
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="empty-state">
                        <CheckCircle size={48} className="text-green-400" />
                        <p>Communication lines clear. All intel has been validated.</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .admin-list { display: flex; flex-direction: column; gap: 1.5rem; margin-top: 2rem; }
                .admin-item { display: flex; gap: 2rem; padding: 2rem; align-items: flex-start; }
                .admin-item-info { flex-grow: 1; }
                .item-head { display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.85rem; }
                .item-user { color: var(--accent-primary); font-weight: 600; }
                .item-date { color: #555; display: flex; align-items: center; gap: 5px; }
                .admin-item h3 { margin-bottom: 1rem; color: #fff; }
                .admin-item p { color: #aaa; line-height: 1.6; font-size: 0.95rem; }
                .admin-images { display: flex; gap: 12px; margin-top: 1.5rem; }
                .admin-images img { height: 120px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
                .admin-actions { display: flex; flex-direction: column; gap: 12px; min-width: 160px; }
                .approve-btn, .reject-btn {
                    padding: 0.85rem; border-radius: 8px; border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    font-weight: 700; transition: 0.3s;
                }
                .approve-btn { background: rgba(76, 175, 80, 0.1); color: #4caf50; border: 1px solid rgba(76, 175, 80, 0.2); }
                .approve-btn:hover { background: #4caf50; color: #fff; }
                .reject-btn { background: rgba(244, 67, 54, 0.1); color: #f44336; border: 1px solid rgba(244, 67, 54, 0.2); }
                .reject-btn:hover { background: #f44336; color: #fff; }
                .empty-state { text-align: center; padding: 100px; color: #444; }
            `}</style>
        </div>
    );
};

export default CommanderReview;

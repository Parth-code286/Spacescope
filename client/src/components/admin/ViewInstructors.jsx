import React, { useState, useEffect } from 'react';
import { User, Mail, GraduationCap, MapPin, Trash2, ShieldCheck, Search, Filter } from 'lucide-react';
import './ViewInstructors.css';

const ViewInstructors = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [instructors, setInstructors] = useState([]);

    useEffect(() => {
        fetchInstructors();
    }, []);

    const fetchInstructors = async () => {
        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/instructors');
            const data = await res.json();

            if (Array.isArray(data)) {
                const mapped = data.map(ins => ({
                    ...ins,
                    approvedDate: ins.approved_date
                }));
                setInstructors(mapped);
            } else {
                console.error('API Error:', data);
                setInstructors([]);
            }
        } catch (err) {
            console.error('Error fetching instructors:', err);
            setInstructors([]);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('WARNING: Revoking instructor access will remove their credentials. Proceed?')) {
            try {
                const res = await fetch(`https://spacescope-1v1p.onrender.com/api/instructors/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    fetchInstructors();
                }
            } catch (err) {
                console.error('Error deleting instructor:', err);
            }
        }
    };

    const filteredInstructors = instructors.filter(ins =>
        ins.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ins.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="view-instructors-view">
            <div className="view-header">
                <div>
                    <h1>Personnel Management</h1>
                    <p>Monitoring {instructors.length} active verified instructors</p>
                </div>

                <div className="view-actions">
                    <div className="search-bar glass-panel">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="instructor-grid">
                {filteredInstructors.map(ins => (
                    <div key={ins.id} className="instructor-card glass-panel">
                        <div className="card-bg-glow"></div>

                        <div className="card-main">
                            <div className="instructor-avatar">
                                <img src={ins.image} alt={ins.name} />
                                <div className="verified-seal">
                                    <ShieldCheck size={14} />
                                </div>
                            </div>

                            <div className="instructor-info">
                                <h3 className="ins-name">{ins.name}</h3>
                                <div className="ins-role">
                                    <GraduationCap size={14} />
                                    <span>{ins.role}</span>
                                </div>
                                <div className="ins-detail">
                                    <Mail size={14} />
                                    <span>{ins.email}</span>
                                </div>
                                <div className="ins-detail">
                                    <MapPin size={14} />
                                    <span>{ins.location}</span>
                                </div>
                                <div className="ins-tag">{ins.specialization}</div>
                            </div>
                        </div>

                        <div className="card-footer">
                            <span className="approved-date">Approved: {ins.approvedDate}</span>
                            <button
                                className="delete-ins-btn"
                                onClick={() => handleDelete(ins.id)}
                                title="Revoke Access"
                            >
                                <Trash2 size={16} />
                                <span>Delete Access</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredInstructors.length === 0 && (
                <div className="empty-state">
                    <Search size={48} />
                    <p>No instructors found matching your criteria</p>
                </div>
            )}
        </div>
    );
};

export default ViewInstructors;

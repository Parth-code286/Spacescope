import React, { useState, useEffect } from 'react';
import {
    FileText,
    CheckCircle,
    AlertTriangle,
    ZoomIn,
    ZoomOut,
    ShieldCheck,
    UserCheck,
    XOctagon,
    RefreshCw,
    Download
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import './InstructorVerification.css';

const InstructorVerification = ({ isEmbedded = false, applicantData = null, onAction = null }) => {
    const [activeTab, setActiveTab] = useState('resume');
    const [isOcrProcessing, setIsOcrProcessing] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [adminNote, setAdminNote] = useState('');
    const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, approved, rejected, requested
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisLogs, setAnalysisLogs] = useState([]);
    const [trustScore, setTrustScore] = useState(0);
    const [checklistState, setChecklistState] = useState({
        kyc: 'pending',
        phd: 'pending',
        background: 'pending'
    });

    // Mock/Dynamic Instructor Data
    const instructorData = applicantData ? {
        id: applicantData.id,
        name: applicantData.fullName,
        applicantId: `INST-${applicantData.id.toString().slice(-4)}`,
        submittedAt: new Date(applicantData.appliedAt).toLocaleString(),
        aiScore: 92, // Simulated AI Score for new applicants
        email: applicantData.email,
        specialization: applicantData.specialization,
        bio: applicantData.bio
    } : {
        id: 'MOCK-1',
        name: "Dr. Elena Vance",
        applicantId: "INST-2026-X92",
        submittedAt: "2026-01-23 09:42 AM",
        aiScore: 94,
        email: "evance@astro.edu",
        specialization: "Quantum Singularity"
    };

    // Documents State
    const documents = {
        resume: {
            id: 'resume',
            label: applicantData ? `CV: ${applicantData.resume?.substring(0, 15)}...` : 'CV / Resume',
            status: 'verified',
            url: (applicantData?.resume?.startsWith('data:')) ? applicantData.resume : '/assets/admin/resume.png',
            confidence: 98,
            issues: []
        },
        certificate: {
            id: 'certificate',
            label: applicantData ? `PhD: ${applicantData.certificate?.substring(0, 15)}...` : 'PhD Astrophysics',
            status: 'verified',
            url: (applicantData?.certificate?.startsWith('data:')) ? applicantData.certificate : '/assets/admin/certificate.png',
            confidence: 96,
            issues: []
        },
        identity: {
            id: 'identity',
            label: applicantData ? `ID: ${applicantData.idCard?.substring(0, 15)}...` : 'Govt. ID',
            status: 'verified',
            url: (applicantData?.idCard?.startsWith('data:')) ? applicantData.idCard : '/assets/admin/id_card.png',
            confidence: 92,
            issues: []
        }
    };

    // AI Analysis Simulation Engine
    useEffect(() => {
        if (!applicantData) return;

        const performAnalysis = async () => {
            setIsAnalyzing(true);
            setIsOcrProcessing(true);
            setAnalysisLogs([]);

            const addLog = (msg, delay, color = null) => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        setAnalysisLogs(prev => [...prev, {
                            time: new Date().toLocaleTimeString().split(' ')[0],
                            msg,
                            color
                        }]);
                        resolve();
                    }, delay);
                });
            };

            // INITIAL SCAN
            await addLog(`Initializing scanner for ${activeTab.toUpperCase()}...`, 500);
            await addLog(`Extracting metadata hash...`, 800);

            let newChecklist = { ...checklistState };
            let scoreBoost = 0;

            if (activeTab === 'resume') {
                await addLog(`Scanning for ${instructorData.name} credentials...`, 1000);
                // Simulate keyword matching
                const hasName = instructorData.name.length > 5;
                const hasSpecialty = instructorData.specialization.length > 3;

                if (hasName) {
                    await addLog(`PASSED: Identity string "${instructorData.name}" located.`, 600, 'text-green-400');
                    newChecklist.kyc = 'verified';
                    scoreBoost += 30;
                }
                if (hasSpecialty) {
                    await addLog(`ANALYZING: Professional field "${instructorData.specialization}"...`, 800);
                    await addLog(`VERIFIED: Peer-reviewed history matches Interstellar database.`, 1000, 'text-green-400');
                    newChecklist.background = 'verified';
                    scoreBoost += 35;
                }
            } else if (activeTab === 'certificate') {
                await addLog(`Verifying digital seal for PhD Doctorate...`, 1200);
                await addLog(`Contacting University of Neo-Terra archives...`, 1500);
                await addLog(`SUCCESS: Academic credentials authenticated.`, 1000, 'text-green-400');
                newChecklist.phd = 'verified';
                scoreBoost += 30;
            } else if (activeTab === 'identity') {
                await addLog(`Scanning biometric data from Govt ID...`, 1000);
                await addLog(`Neural hash matching in progress...`, 1200);
                await addLog(`CONFIRMED: Identity ID matches applicant node.`, 800, 'text-green-400');
                newChecklist.kyc = 'verified';
                scoreBoost += 35;
            }

            setChecklistState(newChecklist);
            setTrustScore(prev => Math.min(98, prev + scoreBoost));
            setIsAnalyzing(false);
            setIsOcrProcessing(false);
        };

        performAnalysis();
    }, [activeTab, applicantData]);

    const handleZoom = (delta) => {
        setZoomLevel(prev => Math.min(Math.max(prev + delta, 0.5), 2));
    };

    const handleAction = async (status) => {
        const dbStatus = status.toUpperCase() === 'APPROVED' ? 'APPROVED' : status.toUpperCase() === 'REJECTED' ? 'REJECTED' : 'REQUESTED';

        try {
            const res = await fetch('https://spacescope-1v1p.onrender.com/api/verify-instructor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: applicantData.id,
                    status: dbStatus,
                    adminNote: adminNote
                })
            });

            if (res.ok) {
                setVerificationStatus(status);
                if (onAction) onAction(status, applicantData);
            }
        } catch (err) {
            console.error('Error verifying instructor:', err);
        }
    };

    const handleBack = () => {
        if (onAction) onAction('back');
    };

    if (verificationStatus !== 'pending') {
        return (
            <div className="verification-success-overlay glass-panel">
                <div className="success-content">
                    {verificationStatus === 'approved' ? (
                        <>
                            <UserCheck size={64} className="text-green-400" />
                            <h2>Instructor Approved</h2>
                            <p>{instructorData.name} has been added to the active roster.</p>
                        </>
                    ) : verificationStatus === 'rejected' ? (
                        <>
                            <XOctagon size={64} className="text-red-400" />
                            <h2>Application Rejected</h2>
                            <p>The applicant has been notified of the decision.</p>
                        </>
                    ) : (
                        <>
                            <RefreshCw size={64} className="text-yellow-400" />
                            <h2>Re-upload Requested</h2>
                            <p>Instructor has been asked to provide clearer documentation.</p>
                        </>
                    )}
                    <button className="btn btn-confirm" onClick={handleBack}>
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`verification-container ${isEmbedded ? 'embedded' : ''}`}>
            {!isEmbedded && <Navbar />}

            {/* Header */}
            <header className="verification-header">
                <div className="header-title">
                    <h1>Instructor Verification Console</h1>
                    <p>Applicant: {instructorData.name} | ID: {instructorData.applicantId}</p>
                </div>
                <div className="trust-badge">
                    <ShieldCheck size={16} />
                    <span>AI-Assisted + Human-Verified</span>
                </div>
            </header>

            <div className="verification-grid">

                {/* LEFT: Documents Panel */}
                <div className="documents-panel">
                    {/* Document Tabs */}
                    <div className="doc-tabs">
                        {Object.values(documents).map(doc => (
                            <div
                                key={doc.id}
                                className={`doc-tab ${activeTab === doc.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(doc.id)}
                            >
                                <FileText size={18} className={activeTab === doc.id ? 'text-indigo-400' : 'text-slate-400'} />
                                <div className="doc-info">
                                    <h4>{doc.label}</h4>
                                    <span>{doc.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Document Preview */}
                    <div className="doc-preview-area">
                        {isOcrProcessing ? (
                            <div className="ocr-loading">
                                <div className="scan-line"></div>
                                <p>Running Optical Character Recognition...</p>
                            </div>
                        ) : (
                            <div className="preview-container">
                                <img
                                    src={documents[activeTab].url}
                                    alt="Document Preview"
                                    className="doc-preview-image"
                                    style={{ transform: `scale(${zoomLevel})` }}
                                />

                                {/* Uploaded Filename Overlay */}
                                <div className="filename-overlay">
                                    <FileText size={12} />
                                    <span>{documents[activeTab].label}</span>
                                </div>

                                {/* Simulated Highlights */}
                                {activeTab === 'resume' && (
                                    <>
                                        <div className="ocr-highlight" style={{ top: '10%', left: '10%', width: '40%', height: '5%' }} title="Name Recognized"></div>
                                        <div className="ocr-highlight" style={{ top: '22%', left: '10%', width: '30%', height: '4%' }} title="PhD Verified"></div>
                                    </>
                                )}

                                <div className="zoom-controls">
                                    <button className="zoom-btn" onClick={() => handleZoom(-0.1)}><ZoomOut size={18} /></button>
                                    <span>{Math.round(zoomLevel * 100)}%</span>
                                    <button className="zoom-btn" onClick={() => handleZoom(0.1)}><ZoomIn size={18} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Verification Results */}
                <div className="verification-results-panel">

                    {/* AI Score Card */}
                    <div className="score-card">
                        <div className="score-ring">
                            <svg width="80" height="80" className="score-svg">
                                <circle cx="40" cy="40" r="36" className="score-circle-bg" />
                                <circle
                                    cx="40" cy="40" r="36"
                                    className="score-circle-progress"
                                    style={{ strokeDashoffset: 251 - (251 * instructorData.aiScore) / 100 }}
                                />
                            </svg>
                            <span className="score-value">{trustScore}%</span>
                        </div>
                        <div className="score-details">
                            <h3>AI Trust Score</h3>
                            <p>Global space-identity match: {trustScore > 80 ? 'HIGH CONFIDENCE' : 'ANALYZING'}</p>
                            <div className="ai-analysis-log glass-panel">
                                {analysisLogs.map((log, i) => (
                                    <div key={i} className={`log-entry ${log.color || ''}`}>
                                        <span className="log-time">{log.time}</span>
                                        <span className="log-msg">{log.msg}</span>
                                    </div>
                                ))}
                                {isAnalyzing && <div className="log-entry pulse">Scanning...</div>}
                            </div>
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className="checklist-card">
                        <h3>Verification Checklist</h3>

                        <div className="checklist-item">
                            <div className="check-label">
                                <CheckCircle size={16} className={checklistState.kyc === 'verified' ? 'text-green-400' : 'text-slate-500'} />
                                <span>Identity Verification (KYC)</span>
                            </div>
                            <span className={`status-badge ${checklistState.kyc}`}>{checklistState.kyc.toUpperCase()}</span>
                        </div>

                        <div className="checklist-item">
                            <div className="check-label">
                                <CheckCircle size={16} className={checklistState.phd === 'verified' ? 'text-green-400' : 'text-slate-500'} />
                                <span>PhD Authenticity Check</span>
                            </div>
                            <span className={`status-badge ${checklistState.phd}`}>{checklistState.phd.toUpperCase()}</span>
                        </div>

                        <div className="checklist-item">
                            <div className="check-label">
                                <CheckCircle size={16} className={checklistState.background === 'verified' ? 'text-green-400' : 'text-slate-500'} />
                                <span>Professional Background</span>
                            </div>
                            <span className={`status-badge ${checklistState.background}`}>{checklistState.background.toUpperCase()}</span>
                        </div>
                    </div>

                    {/* Action Panel */}
                    <div className="action-panel">
                        <textarea
                            className="admin-note"
                            placeholder="Add final review notes..."
                            rows="2"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                        />
                        <div className="action-buttons">
                            <button className="btn btn-reject" onClick={() => handleAction('rejected')}>
                                <XOctagon size={18} />
                                Reject
                            </button>
                            <button className="btn btn-request" onClick={() => handleAction('requested')}>
                                <RefreshCw size={18} />
                                Re-upload
                            </button>
                            <button className="btn btn-approve" onClick={() => handleAction('approved')}>
                                <UserCheck size={18} />
                                Approve
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default InstructorVerification;

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Shield, Radio, Activity, Users, Settings, Share2, MessageSquare, Info, Copy } from 'lucide-react';
import { io } from 'socket.io-client';
import './SpaceScopeMeet.css';

const SOCKET_SERVER = "https://spacescope-1v1p.onrender.com"; // Update with production URL if needed

const SpaceScopeMeet = () => {
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [activeSpeaker, setActiveSpeaker] = useState('LOCAL');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [stream, setStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({}); // { socketId: { stream, name } }
    const [roomId] = useState("MISSION-ALPHA-1"); // Simplified room ID
    const [copySuccess, setCopySuccess] = useState(false);
    const [showUplinkSettings, setShowUplinkSettings] = useState(false);
    const [uplinkUrl, setUplinkUrl] = useState("https://spacescope-1v1p.onrender.com");
    const [isSynced, setIsSynced] = useState(false);

    const socketRef = useRef();
    const videoRef = useRef();
    const peersRef = useRef({});
    const streamRef = useRef();

    // Mock participants
    // Mock participants (Classroom Style)
    const participants = [
        { id: 0, name: "Prof. Sarah Chen", role: "Instructor", status: "HOST", avatar: "/assets/avatars/commander.jpg" },
        { id: 1, name: "Cadet Aris Thorne", role: "Student (Bio-Science)", status: "ONLINE", avatar: "/assets/avatars/bio.jpg" },
        { id: 2, name: "Cadet Leo Vance", role: "Student (Engineering)", status: "ONLINE", avatar: "/assets/avatars/mech.jpg" },
        { id: 3, name: "Cadet Elena Rossi", role: "Student (Navigation)", status: "ONLINE", avatar: "/assets/avatars/nav.jpg" },
    ];

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto-detect Uplink from URL (for friends joining)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedUplink = params.get('uplink');
        if (sharedUplink) {
            console.log("Found shared uplink:", sharedUplink);
            setUplinkUrl(sharedUplink);
        }
    }, []);

    const connectToUplink = (serverUrl) => {
        if (socketRef.current) socketRef.current.disconnect();

        console.log(`📡 Attempting Uplink to: ${serverUrl}`);

        // Add headers to bypass LocalTunnel/Ngrok warning pages
        const socket = io(serverUrl, {
            extraHeaders: {
                "ngrok-skip-browser-warning": "true",
                "Bypass-Tunnel-Reminder": "true",
                "User-Agent": "SpaceScope-Client"
            },
            transports: ['websocket', 'polling'], // Prioritize websocket
            reconnectionAttempts: 5
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("✅ UPLINK ESTABLISHED to", serverUrl);
            setIsSynced(true);
            socket.emit('join-room', roomId);
        });

        socket.on('connect_error', (err) => {
            console.error("❌ UPLINK ERROR:", err.message);
            // Don't auto-disconnect here, let it retry
        });

        socket.on('disconnect', () => {
            setIsSynced(false);
        });

        socket.on('user-joined', socketId => {
            console.log("User joined:", socketId);
            if (streamRef.current) createPeer(socketId, streamRef.current);
        });

        socket.on('offer', async ({ sender, sdps }) => {
            const peer = addPeer(sender, streamRef.current);
            await peer.setRemoteDescription(new RTCSessionDescription(sdps));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('answer', { target: sender, sdps: answer });
        });

        socket.on('answer', async ({ sender, sdps }) => {
            const peer = peersRef.current[sender];
            if (peer) await peer.setRemoteDescription(new RTCSessionDescription(sdps));
        });

        socket.on('ice-candidate', ({ sender, candidate }) => {
            const peer = peersRef.current[sender];
            if (peer) peer.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on('user-left', socketId => {
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close();
                delete peersRef.current[socketId];
            }
            setRemoteStreams(prev => {
                const next = { ...prev };
                delete next[socketId];
                return next;
            });
        });
    };

    // 1. Initialize Camera & Socket
    useEffect(() => {
        const startMeet = async () => {
            try {
                // Get Media
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(mediaStream);
                streamRef.current = mediaStream;
                if (videoRef.current) videoRef.current.srcObject = mediaStream;

                // Initialize Socket via Uplink
                connectToUplink(uplinkUrl);
            } catch (err) {
                console.error("Meet init error:", err);
            }
        };

        startMeet();

        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [uplinkUrl]); // Reconnect if uplinkUrl changes

    const createPeer = async (socketId, localStream) => {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        peersRef.current[socketId] = peer;
        localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

        peer.onicecandidate = (e) => {
            if (e.candidate) {
                socketRef.current.emit('ice-candidate', { target: socketId, candidate: e.candidate });
            }
        };

        peer.ontrack = (e) => {
            setRemoteStreams(prev => ({
                ...prev,
                [socketId]: { stream: e.streams[0], name: `Explorer-${socketId.slice(0, 4)}` }
            }));
        };

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current.emit('offer', { target: socketId, sdps: offer });
    };

    const addPeer = (socketId, localStream) => {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        peersRef.current[socketId] = peer;
        localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

        peer.onicecandidate = (e) => {
            if (e.candidate) {
                socketRef.current.emit('ice-candidate', { target: socketId, candidate: e.candidate });
            }
        };

        peer.ontrack = (e) => {
            setRemoteStreams(prev => ({
                ...prev,
                [socketId]: { stream: e.streams[0], name: `Explorer-${socketId.slice(0, 4)}` }
            }));
        };

        return peer;
    };

    // Toggle tracks
    useEffect(() => {
        if (stream) {
            stream.getVideoTracks().forEach(track => (track.enabled = isVideoOn));
            stream.getAudioTracks().forEach(track => (track.enabled = isMicOn));
        }
    }, [isVideoOn, isMicOn, stream]);

    const copyInvite = () => {
        const inviteUrl = new URL(window.location.href);
        inviteUrl.searchParams.set('uplink', uplinkUrl);
        navigator.clipboard.writeText(inviteUrl.toString());
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <div className="meet-container">
            {/* BACKGROUND ELEMENTS */}
            <div className="cosmic-bg">
                <div className="stars"></div>
                <div className="nebula-glow"></div>
            </div>

            {/* TOP HEADER: CLASSROOM INFO */}
            <header className="meet-header glass-panel">
                <div className="mission-id">
                    <Radio size={18} className="pulse text-cyan-400" />
                    <div className="id-text">
                        <span className="label">LIVE SESSION ACTIVE</span>
                        <span className="value">ORBITAL ACADEMY: ASTRO-PHYSICS 101</span>
                    </div>
                </div>
                <div className="meet-timer font-mono">
                    {currentTime.toLocaleTimeString([], { hour12: false })}
                </div>
                <div className="security-status">
                    <Shield size={18} className="text-green-400" />
                    <span>SECURE CLASSROOM</span>
                </div>
            </header>

            {/* MAIN CONTENT: VIDEO GRID & ORBIT */}
            <main className="meet-main">
                <div className="briefing-stage">
                    {/* ACTIVE SPEAKER / COMMANDER VIEW */}
                    <div className="commander-view glass-panel">
                        <div className="video-placeholder">
                            <div className="hologram-effect"></div>

                            {activeSpeaker === 'LOCAL' ? (
                                <div className="local-video-container">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className={`speaker-video ${!isVideoOn ? 'hidden' : ''}`}
                                    />
                                    {!isVideoOn && (
                                        <div className="camera-off-msg">
                                            <VideoOff size={64} className="text-red-500 mb-4" />
                                            <h3>Visual Transmission Disabled</h3>
                                        </div>
                                    )}
                                    <div className="speaker-overlay">
                                        <div className="speaker-info">
                                            <span className="role">Primary Instructor</span>
                                            <h3>You (Professor)</h3>
                                        </div>
                                        <div className="bitrate-stats">
                                            <span>Class Signal: Excellent</span>
                                            <div className="signal-bars">
                                                <div className="bar active"></div>
                                                <div className="bar active"></div>
                                                <div className="bar active"></div>
                                                <div className="bar active"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="speaker-overlay">
                                        <div className="speaker-info">
                                            <span className="role">Student / Cadet</span>
                                            <h3>{remoteStreams[activeSpeaker]?.name || "Connecting..."}</h3>
                                        </div>
                                        <div className="bitrate-stats">
                                            <span>Connection: Stable</span>
                                            <div className="signal-bars">
                                                <div className="bar active"></div>
                                                <div className="bar active"></div>
                                                <div className="bar active"></div>
                                                <div className="bar"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <RemoteVideo stream={remoteStreams[activeSpeaker]?.stream} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* SIDE PARTICIPANTS: ORBITAL TILES */}
                    <div className="orbital-participants">
                        {/* Add Local User to tiles if not active */}
                        {activeSpeaker !== 'LOCAL' && (
                            <div className="participant-tile glass-panel active-highlight" onClick={() => setActiveSpeaker('LOCAL')}>
                                <div className="mini-video">
                                    <video
                                        ref={(el) => { if (el) el.srcObject = stream; }}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="mini-stream"
                                    />
                                    <div className="tile-overlay">
                                        <span>You (Lead)</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {Object.entries(remoteStreams).map(([socketId, data]) => (
                            activeSpeaker !== socketId && (
                                <div key={socketId} className="participant-tile glass-panel remote-active" onClick={() => setActiveSpeaker(socketId)}>
                                    <div className="mini-video">
                                        <RemoteVideo stream={data.stream} isMini />
                                        <div className="tile-overlay">
                                            <span>{data.name}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        ))}

                        {/* Filler Mocks if empty */}
                        {Object.keys(remoteStreams).length === 0 && participants.slice(1).map(p => (
                            <div key={p.id} className="participant-tile glass-panel mock-disabled">
                                <div className="mini-video">
                                    <img src={`https://images.unsplash.com/photo-${1500000000000 + p.id * 1000000}?auto=format&fit=crop&q=80&w=300`} alt={p.name} />
                                    <div className="tile-overlay">
                                        <span>{p.name} (Simulated)</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CONTEXT PANEL: CLASSROOM GOALS */}
                <aside className="context-panel glass-panel">
                    <div className="panel-header">
                        <Activity size={18} className="text-cyan-400" />
                        <h3>CLASSROOM MODULES</h3>
                    </div>
                    <div className="event-list">
                        <div className="event-item info">
                            <div className="event-icon">📚</div>
                            <div className="event-info">
                                <h4>Current Topic</h4>
                                <p>Solar Flair Dynamics & Magnetosphere Interaction.</p>
                            </div>
                        </div>
                        <div className="event-item warning">
                            <div className="event-icon">📝</div>
                            <div className="event-info">
                                <h4>Assignment Due</h4>
                                <p>Calculate trajectory for ISS intercept. Due: 1400 hours.</p>
                            </div>
                        </div>
                        <div className="event-item secure">
                            <div className="event-icon">💡</div>
                            <div className="event-info">
                                <h4>Pop Quiz Pending</h4>
                                <p>Prepare for a simulation drill in 10 minutes.</p>
                            </div>
                        </div>
                    </div>
                    <div className="telemetry-grid">
                        <div className="tel-box">
                            <span className="label">ATTENDANCE</span>
                            <span className="value text-cyan-400">100%</span>
                        </div>
                        <div className="tel-box">
                            <span className="label">RESOURCE LINK</span>
                            <span className="value text-green-400">ACTIVE</span>
                        </div>
                    </div>
                </aside>
            </main>

            {/* MEETING CONTROLS: FLOATING HUD */}
            <footer className="meet-controls">
                <div className="controls-group glass-panel">
                    <button className={`control-btn ${!isMicOn ? 'muted' : ''}`} onClick={() => setIsMicOn(!isMicOn)}>
                        {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
                    </button>
                    <button className={`control-btn ${!isVideoOn ? 'muted' : ''}`} onClick={() => setIsVideoOn(!isVideoOn)}>
                        {isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
                    </button>
                    <button className="control-btn leave-btn" title="Abort Mission">
                        <PhoneOff size={22} />
                    </button>
                </div>

                <div className="controls-group secondary glass-panel">
                    <button className="control-btn" title="Raise Hand">✋</button>
                    <button className={`control-btn ${copySuccess ? 'text-green-400' : ''}`} onClick={copyInvite} title="Copy Class Invite">
                        {copySuccess ? <Radio size={20} /> : <Copy size={20} />}
                    </button>
                    <button className="control-btn"><Share2 size={20} /></button>
                    <button className="control-btn"><MessageSquare size={20} /></button>
                    <button className={`control-btn ${!isSynced ? 'text-red-400' : 'text-green-400'}`} onClick={() => setShowUplinkSettings(true)} title="Satellite Uplink Settings">
                        <Settings size={20} />
                    </button>
                </div>
            </footer>

            {/* UPLINK SETTINGS MODAL */}
            {showUplinkSettings && (
                <div className="modal-overlay">
                    <div className="uplink-modal glass-panel">
                        <h2>SATELLITE UPLINK CONFIG</h2>
                        <p>To invite friends remotely, enter your Backend Tunnel URL below.</p>

                        <div className="uplink-form">
                            <label>UPLINK ADDRESS (TUNNEL)</label>
                            <input
                                type="text"
                                value={uplinkUrl}
                                onChange={(e) => setUplinkUrl(e.target.value)}
                                placeholder="https://xxxx-xxxx.loca.lt"
                                className="cinematic-input"
                            />
                            <div className="uplink-stats">
                                <span>Status: {isSynced ? '📡 SYNCED' : '⚠️ DISCONNECTED'}</span>
                            </div>
                            <div className="modal-actions">
                                <button className="modal-btn secondary" onClick={() => setShowUplinkSettings(false)}>CANCEL</button>
                                <button className="modal-btn primary" onClick={() => {
                                    connectToUplink(uplinkUrl);
                                    setShowUplinkSettings(false);
                                }}>ESTABLISH LINK</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const RemoteVideo = ({ stream, isMini }) => {
    const videoRef = useRef();

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            className={isMini ? "mini-stream" : "speaker-video"}
            style={isMini ? {} : { transform: 'none' }}
        />
    );
};

export default SpaceScopeMeet;

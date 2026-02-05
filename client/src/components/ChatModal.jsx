import React, { useState, useEffect, useRef } from 'react';
import { Send, X, User, Shield } from 'lucide-react';
import { io } from 'socket.io-client';
import './ChatModal.css';

const socket = io('https://spacescope-1v1p.onrender.com');

const ChatModal = ({ instructor, onClose }) => {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'System', text: `You are now connected with ${instructor.name}. Ask your questions!`, timestamp: new Date(), isSystem: true }
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const roomId = `chat_${instructor.id}`;

    useEffect(() => {
        socket.emit('join_room', roomId);

        socket.on('receive_message', (data) => {
            setMessages(prev => [...prev, data]);
        });

        return () => {
            socket.off('receive_message');
        };
    }, [roomId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessage = {
            roomId,
            sender: 'Student',
            text: input,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socket.emit('send_message', newMessage);
        setMessages(prev => [...prev, newMessage]);
        setInput('');

        // Simulate Instructor Response for Demo
        if (input.toLowerCase().includes('hello') || input.toLowerCase().includes('hi')) {
            setTimeout(() => {
                const response = {
                    roomId,
                    sender: instructor.name,
                    text: `Hello! I'm here to help you with ${instructor.specialization}. What's on your mind?`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isInstructor: true
                };
                setMessages(prev => [...prev, response]);
            }, 1000);
        }
    };

    return (
        <div className="chat-modal-overlay">
            <div className="chat-modal glass-panel">
                <div className="chat-header">
                    <div className="chat-instructor-info">
                        <div className="chat-avatar">
                            <img src={instructor.image} alt={instructor.name} />
                        </div>
                        <div>
                            <h4>{instructor.name}</h4>
                            <p>{instructor.status === 'IN_SESSION' ? '🔴 In Session' : '🟢 Online'}</p>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="chat-messages">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message-wrapper ${msg.isSystem ? 'system' : msg.sender === 'Student' ? 'outgoing' : 'incoming'}`}>
                            {!msg.isSystem && (
                                <div className="message-info">
                                    <span className="sender-name">{msg.sender}</span>
                                    <span className="timestamp">{msg.timestamp}</span>
                                </div>
                            )}
                            <div className="message-bubble">
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button type="submit" className="btn-send" disabled={!input.trim()}>
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatModal;

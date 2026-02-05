import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import notificationService from '../../services/notificationService';
import io from 'socket.io-client';
import './NotificationBell.css';

const socket = io('https://spacescope-1v1p.onrender.com');

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const panelRef = useRef(null);

    // Fetch notifications on mount
    useEffect(() => {
        fetchNotifications();

        // Socket listener for real-time notifications
        socket.on('new_notification', (notification) => {
            console.log('📡 Real-time notification received:', notification);

            // Update counts and lists immediately
            setNotifications(prev => [notification, ...prev].slice(0, 20));
            setUnreadCount(prev => prev + 1);

            // Trigger desktop notification
            notificationService.showNotification(notification.title, {
                body: notification.message,
                tag: 'spacescope-' + notification.id,
                data: { link: notification.link }
            });
        });

        // Poll for new notifications every 30 seconds as fallback
        const interval = setInterval(fetchNotifications, 30000);

        return () => {
            socket.off('new_notification');
            clearInterval(interval);
        };
    }, []);

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/notifications?limit=20');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const handleMarkAsRead = async (notificationIds) => {
        try {
            const response = await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds })
            });

            if (response.ok) {
                fetchNotifications();
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    };

    const handleMarkAllAsRead = () => {
        const unreadIds = notifications
            .filter(n => !n.is_read)
            .map(n => n.id);

        if (unreadIds.length > 0) {
            handleMarkAsRead(unreadIds);
        }
    };

    return (
        <div className="notification-bell-container" ref={panelRef}>
            <button
                className="notification-bell-button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <NotificationPanel
                    notifications={notifications}
                    onClose={() => setIsOpen(false)}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onRefresh={fetchNotifications}
                />
            )}
        </div>
    );
};

export default NotificationBell;

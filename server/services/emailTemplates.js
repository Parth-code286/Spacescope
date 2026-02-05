/**
 * Enhanced Email Templates for SpaceScope Notifications
 */

const baseStyles = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #ffffff !important; background-color: #0d1117; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; padding: 0; background-color: #161b22; border-radius: 16px; border: 1px solid #30363d; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { text-align: center; padding: 40px 20px; background: linear-gradient(180deg, #0d1117 0%, #161b22 100%); border-bottom: 2px solid #30363d; }
    .header h1 { color: #58a6ff; margin: 10px 0 0; font-size: 28px; letter-spacing: 2px; text-transform: uppercase; }
    .header p { color: #ffffff !important; opacity: 0.9; }
    .logo { font-size: 48px; }
    
    .content { padding: 40px; color: #ffffff !important; }
    .content p, .content li, .content span, .content div { color: #ffffff !important; }
    .section-title { color: #58a6ff; font-size: 20px; border-bottom: 2px solid #30363d; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold; }
    
    /* Detailed Content Modules */
    .module { background: #0d1117; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #58a6ff; }
    .module p { color: #ffffff !important; margin: 0; }
    .calendar-event { border-bottom: 1px dashed #30363d; padding: 10px 0; display: flex; justify-content: space-between; }
    .calendar-event:last-child { border-bottom: none; }
    .event-date { font-weight: bold; color: #ffffff !important; min-width: 100px; }
    .event-info { color: #ffffff !important; opacity: 0.8; }
    
    .educational-tip { font-style: italic; background: rgba(56, 189, 248, 0.1); padding: 15px; border-radius: 8px; margin: 15px 0; color: #7dd3fc !important; border-left: 2px solid #38bdf8; }
    .educational-tip strong { color: #ffffff !important; }
    
    .footer { text-align: center; padding: 30px 20px; background: #0d1117; font-size: 13px; color: #cbd5e1 !important; border-top: 1px solid #30363d; }
    .button { display: inline-block; padding: 14px 28px; background: #1f6feb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 10px; text-align: center; }
    .footer a { color: #58a6ff; text-decoration: none; font-weight: 500; }
    
    .alert-banner { padding: 12px 20px; text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #ffffff !important; }
    .banner-planning { background: #238636; }
    .banner-educational { background: #8957e5; }
`;

const layout = (title, bannerText, bannerClass, content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>${baseStyles}</style>
</head>
<body>
    <div style="padding: 20px 0; background-color: #0d1117;">
        <div class="container">
            <div class="alert-banner ${bannerClass}">${bannerText}</div>
            <div class="header">
                <div class="logo">🌌</div>
                <h1>SpaceScope</h1>
            </div>
            <div class="content">
                <h2 style="color: #f0f6fc; margin-top: 0; font-size: 24px;">${title}</h2>
                ${content}
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} SpaceScope Astrometrics Center</p>
                <p>This is a Planning & Educational update requested via your SpaceScope terminal.</p>
                <p><a href="{{unsubscribe_url}}">Unsubscribe</a> • <a href="{{preferences_url}}">Terminal Settings</a></p>
            </div>
        </div>
    </div>
</body>
</html>
`;

const templates = {
    welcome: (data) => layout(
        'Welcome to the Command Center',
        'System Initialization',
        'banner-planning',
        `
        <p>Your subscription to SpaceScope Intelligence is now active. You have been cleared to receive deep-space planning and educational briefings.</p>
        
        <div class="section-title">📡 Subscribed Intelligence Feeds</div>
        <ul style="color: #f0f6fc; padding-left: 20px;">
            ${Object.entries(data.preferences || {})
            .filter(([_, enabled]) => enabled)
            .map(([key, _]) => `<li style="margin-bottom: 8px;">${key.charAt(0).toUpperCase() + key.slice(1)} Analysis & Forecasts</li>`)
            .join('')}
        </ul>
        
        <div class="educational-tip">
            <strong>Pro Tip:</strong> Urgent, real-time alerts (like immediate solar flares or asteroid sightings) will be sent directly to your Desktop terminal for zero-latency response.
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <a href="https://spacescope-4q7k0htjv-parths-projects-267acbe7.vercel.app/dashboard" class="button">Access Main Terminal</a>
        </div>
        `
    ),

    planning: (data) => layout(
        data.title,
        'Mission Planning Briefing',
        'banner-planning',
        `
        <div class="module">
            <p style="margin-top: 0;">${data.message}</p>
        </div>

        ${data.calendar ? `
            <div class="section-title">📅 Upcoming Celestial Events</div>
            <div class="module" style="border-left-color: #238636;">
                ${data.calendar.map(event => `
                    <div class="calendar-event">
                        <span class="event-date">${event.date}</span>
                        <span class="event-info">${event.event}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        ${data.summary ? `
            <div class="section-title">📊 Intelligence Summary</div>
            <div class="module">
                <p style="margin: 0; font-size: 15px; color: #c9d1d9;">${data.summary}</p>
            </div>
        ` : ''}

        <div style="text-align: center;">
            <a href="${data.link || 'https://spacescope-4q7k0htjv-parths-projects-267acbe7.vercel.app/mission-control'}" class="button">View Interactive Calendar</a>
        </div>
        `
    ),

    educational: (data) => layout(
        data.title,
        'Academy Briefing',
        'banner-educational',
        `
        <div class="module">
            <p style="margin-top: 0;">${data.message}</p>
        </div>

        <div class="section-title">🎓 Deep Dive</div>
        <div class="module" style="background: #161b22; border-left-color: #8957e5;">
            <p style="margin: 0; line-height: 1.8;">${data.detailedContent || 'Expand your knowledge of the cosmos with our latest research and observational findings.'}</p>
        </div>

        <div class="educational-tip">
            <strong>Did you know?</strong> ${data.funFact || 'The speed of light is approximately 299,792 kilometers per second!'}
        </div>

        <div style="text-align: center;">
            <a href="${data.link || 'https://spacescope-4q7k0htjv-parths-projects-267acbe7.vercel.app/academy'}" class="button">Study at the Academy</a>
        </div>
        `
    ),

    notification: (notification) => {
        // Generic template for simple notifications
        return layout(
            notification.title,
            'System Notification',
            notification.type === 'urgent' ? 'banner-planning' : 'banner-educational',
            `<p>${notification.message}</p>
            ${notification.link ? `<a href="https://spacescope-4q7k0htjv-parths-projects-267acbe7.vercel.app${notification.link}" class="button">Launch Module</a>` : ''}`
        );
    }
};

module.exports = templates;

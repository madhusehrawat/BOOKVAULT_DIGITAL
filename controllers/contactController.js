const { sendMail } = require('../utils/mailer'); // Adjust path as needed


// Render the contact page
exports.getContact = (req, res) => {
    res.render('contact', { 
        user: req.user || null,
        title: 'Contact Us | BookVault' 
    });
};



exports.postContact = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // 1. Validation
        if (!name || !email || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please fill all required fields.' 
            });
        }

        // 2. Format the Email Content
        const emailContent = `
            <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #2563eb;">New Support Ticket</h2>
                <p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
                <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
                <hr style="border: 0; border-top: 1px solid #eee;" />
                <p style="white-space: pre-wrap;">${message}</p>
            </div>
        `;

        // 3. Send via Gmail API
        await sendMail({
    to: process.env.SUPPORT_EMAIL, 
    subject: `Contact: ${subject}`,
    replyTo: email, // This 'email' comes from req.body
    html: `<p>${message}</p>`
});

        res.status(200).json({ 
            success: true, 
            message: 'Your message has been sent to the BookVault team!' 
        });

    } catch (err) {
        console.error("Contact Form Error:", err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send message. Please try again later.' 
        });
    }
};
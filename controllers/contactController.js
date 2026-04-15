const { sendMail } = require('../utils/mailer');

exports.getContact = (req, res) => {
    res.render('contact', { 
        user: req.user || null,
        title: 'Contact Us | BookVault' 
    });
};

exports.postContact = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        if (!name || !email || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please fill all required fields.' 
            });
        }

        const emailContent = `
            <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #2563eb;">New Support Ticket</h2>
                <p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
                <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
                <hr style="border: 0; border-top: 1px solid #eee;" />
                <p style="white-space: pre-wrap;">${message}</p>
            </div>
        `;

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

const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const sendMail = async ({ to, subject, html ,replyTo}) => {
    const oauth2Client = new OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        "https://developers.google.com/oauthplayground"
    );

    // DEBUG: Add this line to check if the token is actually there
    console.log("Checking Token:", process.env.GMAIL_REFRESH_TOKEN ? "Token Found ✅" : "Token Missing ❌");

    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    try {
       const { token } = await oauth2Client.getAccessToken();
        if (!token) throw new Error("Failed to generate access token");

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // 4. Create the email content
        const str = [
            `To: ${to}`,
            `From: BookVault <${process.env.GMAIL_USER_EMAIL}>`,
            `Subject: ${subject}`,
            `Reply-To: ${replyTo || to}`, // Allows you to reply directly to users
            `Content-Type: text/html; charset=utf-8`,
            `MIME-Version: 1.0`,
            ``,
            html
        ].join('\n');
        

        // 5. Encode the email in Base64URL (Standard for Gmail API)
        const encodedMail = Buffer.from(str)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // 6. Send it!
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMail
            }
        });

        console.log(`✅ OTP sent successfully to ${to} via Gmail API`);
    } catch (err) {
        console.error("❌ GMAIL API ERROR:", err);
        throw err;
    }
};

module.exports = { sendMail };
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4,
    auth: {
        user: 'ncnujoinupadmin@gmail.com',
        pass: 'oabrqgtshscfjrvo'
    },
    tls: {
        rejectUnauthorized: false
    }
});

const mailOptions = {
    from: 'JoinUp Support <ncnujoinupadmin@gmail.com>',
    to: 'ncnujoinupadmin@gmail.com', // Test by sending to itself
    subject: 'SMTP Test',
    text: 'If you receive this, SMTP is working.'
};

console.log('Attempting to send test email...');
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('Error sending email:', error);
        process.exit(1);
    } else {
        console.log('Email sent successfully:', info.response);
        process.exit(0);
    }
});

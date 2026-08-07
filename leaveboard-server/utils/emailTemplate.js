export const getPasswordResetTemplate = (userName, resetLink, expirationHours) => {
  const logoUrl = process.env.EMAIL_LOGO_URL || 'https://digiflex.digithaigroup.com/src/assets/Logo_no_text.png';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: #1f3c88; color: white; padding: 30px 20px; text-align: center; }
        .header img { max-width: 100px; height: auto; margin-bottom: 15px; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px 20px; }
        .content p { margin: 0 0 15px; }
        .button { display: inline-block; background: #1f3c88; color: white; padding: 14px 28px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .link-box { background: #f0f0f0; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #666; margin: 15px 0; }
        .footer { background: #f9f9f9; padding: 20px; text-align: left; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; }
        .footer p { margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="DigiFlex Logo" />
          <h1>DigiFlex</h1>
          <p>Password Reset Request</p>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>You have requested to reset your password. Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; background: #1f3c88; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600;">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <div class="link-box">${resetLink}</div>
          <p>This link will expire in <strong>${expirationHours} hour(s)</strong>.</p>
          <p style="color: #666; font-size: 13px;">If you did not request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>The DigiFlex Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
};
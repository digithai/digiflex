export const getPasswordResetTemplate = (userName, resetLink, expirationHours) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1f3c88; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
        .button { display: inline-block; background: #1f3c88; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Password Reset Request</h2>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>You have requested to reset your password. Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; background: #1f3c88; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetLink}</p>
          <p>This link will expire in ${expirationHours} hour(s).</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>Best regards,<br>The DigiFlex Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
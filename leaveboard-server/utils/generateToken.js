import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId, tenantId) => {
  let token = jwt.sign({ userId, tenantId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  return token;
};

export const generateRefreshToken = (userId, tenantId) => {
  return jwt.sign({ userId, tenantId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
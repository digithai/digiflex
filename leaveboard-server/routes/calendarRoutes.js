import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import wfhRequestSchema from '../models/WfhRequest.js';

const router = express.Router();

function getCalendarRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Keep server range aligned with frontend calendar start rule.
  const start = today.getDay() === 0
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    : new Date(today);

  // 31-day inclusive window (start day + next 30 days).
  const end = new Date(start);
  end.setDate(start.getDate() + 30);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

router.get('/', protect, async (req, res) => {
 

  try {
    const { start, end } = getCalendarRange();

    const users = await User.find({ tenant: req.user.tenant._id }).select('name email');

    const requests = await wfhRequestSchema.find({
      tenant: req.user.tenant._id,
      status: { $in: ['approved', 'pending'] },
      date: { $gte: start, $lte: end }
    }).populate('user', 'name email role');

    res.json({ users, requests });
  } catch (err) {
    console.error('[CALENDAR] Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

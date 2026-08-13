import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true, 
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// TTL index to automatically delete expired tokens
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

export default PasswordResetToken;
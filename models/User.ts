import mongoose, { Schema, Document, Model } from 'mongoose';

export type AccessStatus = 'active' | 'locked' | 'expired' | 'pending';
export type PassType = 'lifetime' | 'monthly' | 'custom' | null;

export interface IUser extends Document {
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  accessStatus: AccessStatus;
  passType: PassType;
  activatedAt?: Date | null;
  expiresAt?: Date | null;
  notes: string;
  sessionNonce: string;
  guilds: string[];
  roles: Record<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    discordUsername: {
      type: String,
      required: true,
    },
    discordAvatar: {
      type: String,
      default: '',
    },
    accessStatus: {
      type: String,
      enum: ['active', 'locked', 'expired', 'pending'],
      default: 'pending',
      index: true,
    },
    passType: {
      type: String,
      enum: ['lifetime', 'monthly', 'custom', null],
      default: null,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    sessionNonce: {
      type: String,
      default: '',
    },
    guilds: {
      type: [String],
      default: [],
    },
    roles: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compiling model in development hot-reload
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

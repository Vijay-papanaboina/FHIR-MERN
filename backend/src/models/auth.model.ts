import { Schema, model } from 'mongoose';

// ── User ────────────────────────────────────────────────────────
export interface IUser {
    _id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string;
    // Custom fields (via additionalFields)
    role: 'patient' | 'practitioner' | 'admin';
    fhirPatientId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        _id: { type: String },
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        emailVerified: { type: Boolean, default: false },
        image: { type: String },
        role: { type: String, enum: ['patient', 'practitioner', 'admin'], default: 'patient' },
        fhirPatientId: { type: String, default: null },
    },
    { timestamps: true, _id: false }
);

export const User = model<IUser>('user', userSchema);

// ── Session ─────────────────────────────────────────────────────
export interface ISession {
    _id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
    {
        _id: { type: String },
        userId: { type: String, required: true },
        token: { type: String, required: true, unique: true },
        expiresAt: { type: Date, required: true },
        ipAddress: { type: String },
        userAgent: { type: String },
    },
    { timestamps: true, _id: false }
);

export const Session = model<ISession>('session', sessionSchema);

// ── Account ─────────────────────────────────────────────────────
export interface IAccount {
    _id: string;
    userId: string;
    accountId: string;
    providerId: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: Date;
    refreshTokenExpiresAt?: Date;
    scope?: string;
    idToken?: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
    {
        _id: { type: String },
        userId: { type: String, required: true },
        accountId: { type: String, required: true },
        providerId: { type: String, required: true },
        accessToken: { type: String },
        refreshToken: { type: String },
        accessTokenExpiresAt: { type: Date },
        refreshTokenExpiresAt: { type: Date },
        scope: { type: String },
        idToken: { type: String },
        password: { type: String },
    },
    { timestamps: true, _id: false }
);

export const Account = model<IAccount>('account', accountSchema);

// ── Verification ────────────────────────────────────────────────
export interface IVerification {
    _id: string;
    identifier: string;
    value: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const verificationSchema = new Schema<IVerification>(
    {
        _id: { type: String },
        identifier: { type: String, required: true },
        value: { type: String, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true, _id: false }
);

export const Verification = model<IVerification>('verification', verificationSchema);


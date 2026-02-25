import type { Request, Response } from 'express';
import { z } from 'zod';
import { jsend } from '../utils/jsend.js';
import { AppError } from '../utils/AppError.js';
import { searchPatients, getPatient } from '../services/patient.service.js';

// ── Validation schemas ──────────────────────────────────────────
const searchQuerySchema = z.object({
    name: z.string().min(1, 'name query parameter is required').max(256, 'name is too long'),
});

const idParamSchema = z.object({
    id: z.string().regex(/^[A-Za-z0-9\-.]{1,64}$/, 'Invalid Patient ID format'),
});

/**
 * GET /api/patients?name=xxx
 * Search for patients by name.
 */
export const searchPatientsHandler = async (req: Request, res: Response) => {
    const result = searchQuerySchema.safeParse(req.query);

    if (!result.success) {
        throw new AppError(result.error.issues[0]?.message ?? 'Invalid query parameters', 400);
    }

    const patients = await searchPatients(result.data.name);
    res.json(jsend.success(patients));
};

/**
 * GET /api/patients/:id
 * Get a single patient by FHIR ID.
 */
export const getPatientHandler = async (req: Request, res: Response) => {
    const result = idParamSchema.safeParse(req.params);

    if (!result.success) {
        throw new AppError(result.error.issues[0]?.message ?? 'Invalid Patient ID', 400);
    }

    const patient = await getPatient(result.data.id);
    res.json(jsend.success(patient));
};

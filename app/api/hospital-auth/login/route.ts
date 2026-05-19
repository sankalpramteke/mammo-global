import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Hospital from '@/models/Hospital';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const JWT_SECRET       = process.env.JWT_SECRET;
const MAMMO_CLIENT_URI = process.env.MAMMO_CLIENT_URI;

/**
 * Hospital Node Login — two-tier auth strategy:
 *
 * TIER 1 (primary): Cross-DB lookup into mammo_db.doctors
 *   The user enters their mammo-client email + password.
 *
 * TIER 2 (fallback): Legacy hospitalId + password
 *   For hospitals registered directly via the portal.
 */
export async function POST(req: NextRequest) {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body?.password)
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });

    const { email, hospitalId, password } = body;

    // ── TIER 1: Email login via mammo-client credentials ────────────────
    if (email) {
      if (!MAMMO_CLIENT_URI) {
        return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
      }

      let doctorConn: mongoose.Connection | null = null;
      try {
        doctorConn = await mongoose.createConnection(MAMMO_CLIENT_URI).asPromise();

        const DoctorSchema = new mongoose.Schema({
          name:         String,
          email:        { type: String, lowercase: true },
          password:     String,
          hospitalName: String,
        });
        const DoctorModel = doctorConn.models.Doctor || doctorConn.model('Doctor', DoctorSchema);

        const doctor = await DoctorModel.findOne({ email: email.toLowerCase().trim() });
        if (!doctor) {
          return NextResponse.json({
            error: 'Email not found. Use the email you registered with in the DISHA client app.',
          }, { status: 404 });
        }

        const passwordMatch = await bcrypt.compare(password, doctor.password);
        if (!passwordMatch) {
          return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
        }

        // Find or create matching Hospital record in mammo_global
        let hospital = await Hospital.findOne({
          name: { $regex: new RegExp(`^${doctor.hospitalName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        if (!hospital) {
          const autoId = doctor.hospitalName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .slice(0, 30);

          hospital = await Hospital.create({
            name:               doctor.hospitalName,
            hospitalId:         autoId,
            location:           '',
            status:             'offline',
            totalScans:         0,
            benignCount:        0,
            malignantCount:     0,
            roundsParticipated: 0,
          });
        }

        const token = jwt.sign(
          { hospitalId: hospital.hospitalId, name: hospital.name, id: hospital._id },
          JWT_SECRET,
          { expiresIn: '8h' }
        );

        return NextResponse.json({
          token,
          loginMethod: 'mammo-client-credentials',
          hospital: {
            id:                 hospital._id,
            hospitalId:         hospital.hospitalId,
            name:               hospital.name,
            location:           hospital.location,
            totalScans:         hospital.totalScans,
            benignCount:        hospital.benignCount,
            malignantCount:     hospital.malignantCount,
            roundsParticipated: hospital.roundsParticipated,
          },
        });

      } catch (crossDbErr) {
        console.error('Cross-DB login error:', crossDbErr instanceof Error ? crossDbErr.message : 'unknown');
        return NextResponse.json({ error: 'Could not connect to authentication database. Try again.' }, { status: 503 });
      } finally {
        doctorConn?.close();
      }
    }

    // ── TIER 2: Legacy hospitalId + password ────────────────────────────
    if (!hospitalId) {
      return NextResponse.json({ error: 'Provide email or hospital ID' }, { status: 400 });
    }

    // Exact match — no regex to avoid ReDoS
    const hospital = await Hospital.findOne({ hospitalId: hospitalId.trim().toUpperCase() });

    if (!hospital) {
      return NextResponse.json({
        error: 'Hospital not found. Check the ID on the admin dashboard, or use your DISHA client email.',
      }, { status: 404 });
    }

    if (!hospital.password) {
      // First-time login — hash and store the password
      hospital.password = await bcrypt.hash(password, 12);
      await hospital.save();
    } else {
      const valid = await bcrypt.compare(password, hospital.password);
      if (!valid)
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const token = jwt.sign(
      { hospitalId: hospital.hospitalId, name: hospital.name, id: hospital._id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return NextResponse.json({
      token,
      loginMethod: 'hospital-id',
      hospital: {
        id:                 hospital._id,
        hospitalId:         hospital.hospitalId,
        name:               hospital.name,
        location:           hospital.location,
        totalScans:         hospital.totalScans,
        benignCount:        hospital.benignCount,
        malignantCount:     hospital.malignantCount,
        roundsParticipated: hospital.roundsParticipated,
      },
    });

  } catch (error) {
    console.error('Hospital Login Error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

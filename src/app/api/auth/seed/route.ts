import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  try {
    const hashedPassword = await bcrypt.hash('password123', 10)
    const created: string[] = []
    const skipped: string[] = []

    // Helper: create user if email doesn't exist
    async function ensureUser(data: {
      uid: string
      name: string
      email: string
      role: string
      facultyType?: string
      departmentId?: string
      specialization?: string
      contractType?: string
      maxUnits?: number
      status: string
    }) {
      const existing = await db.user.findUnique({ where: { email: data.email } })
      if (existing) {
        skipped.push(data.email)
        return existing
      }
      const user = await db.user.create({
        data: { ...data, password: hashedPassword, maxUnits: data.maxUnits ?? 0 },
      })
      created.push(data.email)
      return user
    }

    // Look up departments for role users that need them
    const csDept = await db.department.findFirst({ where: { code: 'CS' } })
    const baDept = await db.department.findFirst({ where: { code: 'BA' } })

    // 1. Admin
    await ensureUser({
      uid: 'ADMIN001',
      name: 'System Administrator',
      email: 'admin@quacktrack.com',
      role: 'admin',
      status: 'active',
      maxUnits: 0,
    })

    // 2. Department Dean (CS)
    await ensureUser({
      uid: 'DEAN-CS',
      name: 'Dr. Angelo Villanueva',
      email: 'dean.cs@quacktrack.com',
      role: 'department_dean',
      facultyType: 'executive',
      departmentId: csDept?.id,
      specialization: '["Computer Science","Artificial Intelligence"]',
      contractType: 'full_time',
      maxUnits: 18,
      status: 'active',
    })

    // 3. Program Head (BSCS)
    await ensureUser({
      uid: 'PH-BSCS',
      name: 'Prof. Patricia Reyes',
      email: 'ph.bscs@quacktrack.com',
      role: 'program_head',
      facultyType: 'executive',
      departmentId: csDept?.id,
      specialization: '["Computer Science","Data Science"]',
      contractType: 'full_time',
      maxUnits: 18,
      status: 'active',
    })

    // 4. Human Resource
    await ensureUser({
      uid: 'HR-001',
      name: 'Maria Clara Santos',
      email: 'hr@quacktrack.com',
      role: 'human_resource',
      departmentId: baDept?.id,
      status: 'active',
      maxUnits: 0,
    })

    // 5. Registrar
    await ensureUser({
      uid: 'REG-001',
      name: 'Juan Dela Cruz',
      email: 'registrar@quacktrack.com',
      role: 'registrar',
      status: 'active',
      maxUnits: 0,
    })

    // 6. Faculty (demo)
    await ensureUser({
      uid: 'FAC-DEMO',
      name: 'Prof. Demo Faculty',
      email: 'faculty@quacktrack.com',
      role: 'faculty',
      facultyType: 'regular',
      departmentId: csDept?.id,
      specialization: '["Computer Science","Software Engineering"]',
      contractType: 'full_time',
      maxUnits: 21,
      status: 'active',
    })

    const message = created.length > 0
      ? `Created ${created.length} user(s): ${created.join(', ')}`
      : 'All demo users already exist.'

    return NextResponse.json(
      { message, created, skipped },
      { status: created.length > 0 ? 201 : 200 },
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to seed demo users' },
      { status: 500 },
    )
  }
}

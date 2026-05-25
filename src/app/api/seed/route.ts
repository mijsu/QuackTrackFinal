import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * POST /api/seed — Seeds the database with comprehensive PTC data
 * Query params:
 *   ?reset=true — Wipes existing data before seeding
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  try {
    const url = new URL(request.url)
    const forceReset = url.searchParams.get('reset') === 'true'

    if (forceReset) {
      console.log('🗑️ Force reset requested — wiping all data...')
      // Delete in dependency order
      await db.conflict.deleteMany()
      await db.schedule.deleteMany()
      await db.scheduleResponse.deleteMany()
      await db.scheduleLog.deleteMany()
      await db.auditLog.deleteMany()
      await db.notification.deleteMany()
      await db.announcement.deleteMany()
      await db.facultyPreference.deleteMany()
      await db.scheduleVersion.deleteMany()
      await db.generationSession.deleteMany()
      await db.generationConfig.deleteMany()
      await db.section.deleteMany()
      await db.subject.deleteMany()
      await db.user.deleteMany()
      await db.program.deleteMany()
      await db.department.deleteMany()
      console.log('✅ All data wiped')
    } else {
      const existingDepartments = await db.department.count()
      if (existingDepartments > 0) {
        return NextResponse.json(
          { error: 'Database already has data. Use ?reset=true to force re-seed.' },
          { status: 400 }
        )
      }
    }

    const hashedFacultyPassword = await bcrypt.hash('faculty123', 10)
    const hashedAdminPassword = await bcrypt.hash('password123', 10)
    const summary: Record<string, number> = {}

    // ═══════════════════════════════════════════════════════════════════
    // 1. DEPARTMENTS (7 PTC departments)
    // ═══════════════════════════════════════════════════════════════════
    const departments = await Promise.all([
      db.department.create({ data: { name: 'Arts & Sciences', code: 'AS', college: 'College of Arts & Sciences' } }),
      db.department.create({ data: { name: 'Business Administration', code: 'BA', college: 'College of Business' } }),
      db.department.create({ data: { name: 'Computer Studies', code: 'CS', college: 'College of Computer Studies' } }),
      db.department.create({ data: { name: 'Education', code: 'ED', college: 'College of Education' } }),
      db.department.create({ data: { name: 'Engineering', code: 'EN', college: 'College of Engineering' } }),
      db.department.create({ data: { name: 'Hospitality Management', code: 'HM', college: 'College of Hospitality' } }),
      db.department.create({ data: { name: 'Office Administration', code: 'OA', college: 'College of Business' } }),
    ])
    summary.departments = departments.length

    // ═══════════════════════════════════════════════════════════════════
    // 2. PROGRAMS (9 PTC programs)
    // ═══════════════════════════════════════════════════════════════════
    const programs = await Promise.all([
      db.program.create({ data: { name: 'Bachelor of Arts in English', code: 'AB English', description: 'English program', departmentId: departments[0].id } }),
      db.program.create({ data: { name: 'Bachelor of Science in Business Administration', code: 'BSBA', description: 'Business program', departmentId: departments[1].id } }),
      db.program.create({ data: { name: 'Bachelor of Science in Computer Science', code: 'BSCS', description: 'Computer science program', departmentId: departments[2].id } }),
      db.program.create({ data: { name: 'Bachelor of Science in Information Technology', code: 'BSIT', description: 'IT program', departmentId: departments[2].id } }),
      db.program.create({ data: { name: 'Bachelor of Secondary Education', code: 'BSED', description: 'Education program', departmentId: departments[3].id } }),
      db.program.create({ data: { name: 'Bachelor of Science in Civil Engineering', code: 'BSCE', description: 'Civil engineering program', departmentId: departments[4].id } }),
      db.program.create({ data: { name: 'Bachelor of Science in Electrical Engineering', code: 'BSEE', description: 'Electrical engineering program', departmentId: departments[4].id } }),
      db.program.create({ data: { name: 'Bachelor of Science in Hospitality Management', code: 'BSHM', description: 'Hospitality program', departmentId: departments[5].id } }),
      db.program.create({ data: { name: 'Bachelor of Science in Office Administration', code: 'BSOA-COA', description: 'Office administration program', departmentId: departments[6].id } }),
    ])
    summary.programs = programs.length

    // ═══════════════════════════════════════════════════════════════════
    // 3. SUBJECTS (comprehensive, multiple year levels & semesters)
    // Using "1st" / "2nd" / "3rd" / "summer" format to match the application's semester values
    // Using JSON arrays for requiredSpecialization
    // ═══════════════════════════════════════════════════════════════════
    const subjectsData = [
      // ─── AB English (AS) ───
      { subjectCode: 'AS 101', subjectName: 'English Composition', units: 3, programId: programs[0].id, departmentId: departments[0].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["English Literature"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'AS 102', subjectName: 'Introduction to Literature', units: 3, programId: programs[0].id, departmentId: departments[0].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["English Literature"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'AS 103', subjectName: 'Philippine Literature', units: 3, programId: programs[0].id, departmentId: departments[0].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Philippine Studies"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'AS 104', subjectName: 'Linguistics', units: 3, programId: programs[0].id, departmentId: departments[0].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Linguistics"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'AS 105', subjectName: 'Speech Communication', units: 3, programId: programs[0].id, departmentId: departments[0].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Communication"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'AS 201', subjectName: 'Advanced Composition', units: 3, programId: programs[0].id, departmentId: departments[0].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["English Literature"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'AS 202', subjectName: 'World Literature', units: 3, programId: programs[0].id, departmentId: departments[0].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["English Literature"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'AS 301', subjectName: 'Literary Criticism', units: 3, programId: programs[0].id, departmentId: departments[0].id, subjectType: 'lecture', yearLevel: 3, semester: '1st', requiredSpecialization: '["English Literature"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'AS 401', subjectName: 'Thesis Writing', units: 3, programId: programs[0].id, departmentId: departments[0].id, subjectType: 'lecture', yearLevel: 4, semester: '1st', requiredSpecialization: '["English Literature"]', lectureHours: 3, labHours: 0 },

      // ─── BSBA (BA) ───
      { subjectCode: 'BA 101', subjectName: 'Principles of Management', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Business Administration"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 102', subjectName: 'Business Mathematics', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Business Administration"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 103', subjectName: 'Accounting Principles', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Accounting"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 104', subjectName: 'Business Communication', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Communication"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 105', subjectName: 'Microeconomics', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Economics"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 201', subjectName: 'Marketing Principles', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Marketing"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 202', subjectName: 'Business Statistics', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Statistics"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 203', subjectName: 'Human Resource Management', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Human Resources"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 204', subjectName: 'Business Law', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Corporate Law"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 301', subjectName: 'Financial Management', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 3, semester: '1st', requiredSpecialization: '["Finance"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 302', subjectName: 'Operations Management', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 3, semester: '1st', requiredSpecialization: '["Business Administration"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 401', subjectName: 'Strategic Management', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 4, semester: '1st', requiredSpecialization: '["Business Administration"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'BA 402', subjectName: 'Business Research', units: 3, programId: programs[1].id, departmentId: departments[1].id, subjectType: 'lecture', yearLevel: 4, semester: '1st', requiredSpecialization: '["Business Administration"]', lectureHours: 3, labHours: 0 },

      // ─── BSCS (CS) ───
      { subjectCode: 'CS 101', subjectName: 'Introduction to Computing', units: 3, programId: programs[2].id, departmentId: departments[2].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Computer Science"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'CS 102', subjectName: 'Computer Programming I', units: 3, programId: programs[2].id, departmentId: departments[2].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Computer Science"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'CS 103', subjectName: 'Discrete Mathematics', units: 3, programId: programs[2].id, departmentId: departments[2].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Mathematics"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'CS 104', subjectName: 'Digital Logic Design', units: 3, programId: programs[2].id, departmentId: departments[2].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Computer Engineering"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'CS 105', subjectName: 'Computer Programming I Lab', units: 1, programId: programs[2].id, departmentId: departments[2].id, subjectType: 'lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Computer Science"]', lectureHours: 0, labHours: 3 },
      { subjectCode: 'CS 201', subjectName: 'Data Structures & Algorithms', units: 3, programId: programs[2].id, departmentId: departments[2].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Computer Science"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'CS 202', subjectName: 'Object-Oriented Programming', units: 3, programId: programs[2].id, departmentId: departments[2].id, subjectType: 'lecture_and_lab', yearLevel: 2, semester: '1st', requiredSpecialization: '["Computer Science"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'CS 301', subjectName: 'Database Management Systems', units: 3, programId: programs[2].id, departmentId: departments[2].id, subjectType: 'lecture_and_lab', yearLevel: 3, semester: '1st', requiredSpecialization: '["Computer Science"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'CS 302', subjectName: 'Software Engineering', units: 3, programId: programs[2].id, departmentId: departments[2].id, subjectType: 'lecture', yearLevel: 3, semester: '1st', requiredSpecialization: '["Software Engineering"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'CS 401', subjectName: 'Capstone Project I', units: 3, programId: programs[2].id, departmentId: departments[2].id, subjectType: 'lecture', yearLevel: 4, semester: '1st', requiredSpecialization: '["Computer Science"]', lectureHours: 3, labHours: 0 },

      // ─── BSIT (CS) ───
      { subjectCode: 'IT 101', subjectName: 'Web Development Fundamentals', units: 3, programId: programs[3].id, departmentId: departments[2].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Information Technology"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'IT 102', subjectName: 'Computer Systems Architecture', units: 3, programId: programs[3].id, departmentId: departments[2].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Information Technology"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'IT 103', subjectName: 'Introduction to Programming', units: 3, programId: programs[3].id, departmentId: departments[2].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Computer Science"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'IT 104', subjectName: 'Networking Fundamentals', units: 3, programId: programs[3].id, departmentId: departments[2].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Networking"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'IT 201', subjectName: 'Systems Administration', units: 3, programId: programs[3].id, departmentId: departments[2].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Information Technology"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'IT 301', subjectName: 'Network Security', units: 3, programId: programs[3].id, departmentId: departments[2].id, subjectType: 'lecture_and_lab', yearLevel: 3, semester: '1st', requiredSpecialization: '["Cybersecurity"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'IT 401', subjectName: 'IT Capstone Project', units: 3, programId: programs[3].id, departmentId: departments[2].id, subjectType: 'lecture', yearLevel: 4, semester: '1st', requiredSpecialization: '["Information Technology"]', lectureHours: 3, labHours: 0 },

      // ─── BSED (ED) ───
      { subjectCode: 'ED 101', subjectName: 'Foundations of Education', units: 3, programId: programs[4].id, departmentId: departments[3].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Education"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'ED 102', subjectName: 'Child & Adolescent Development', units: 3, programId: programs[4].id, departmentId: departments[3].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Psychology"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'ED 103', subjectName: 'Principles of Teaching', units: 3, programId: programs[4].id, departmentId: departments[3].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Education"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'ED 104', subjectName: 'Educational Technology', units: 3, programId: programs[4].id, departmentId: departments[3].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Education"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'ED 105', subjectName: 'Curriculum Development', units: 3, programId: programs[4].id, departmentId: departments[3].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Education"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'ED 201', subjectName: 'Assessment of Learning', units: 3, programId: programs[4].id, departmentId: departments[3].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Education"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'ED 202', subjectName: 'Educational Psychology', units: 3, programId: programs[4].id, departmentId: departments[3].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Psychology"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'ED 203', subjectName: 'Classroom Management', units: 3, programId: programs[4].id, departmentId: departments[3].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Education"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'ED 204', subjectName: 'Research in Education', units: 3, programId: programs[4].id, departmentId: departments[3].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Education"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'ED 301', subjectName: 'Teaching Strategies', units: 3, programId: programs[4].id, departmentId: departments[3].id, subjectType: 'lecture', yearLevel: 3, semester: '1st', requiredSpecialization: '["Education"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'ED 401', subjectName: 'Practice Teaching', units: 3, programId: programs[4].id, departmentId: departments[3].id, subjectType: 'lecture', yearLevel: 4, semester: '1st', requiredSpecialization: '["Education"]', lectureHours: 3, labHours: 0 },

      // ─── BSCE (EN) ───
      { subjectCode: 'CE 101', subjectName: 'Engineering Mathematics', units: 3, programId: programs[5].id, departmentId: departments[4].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Civil Engineering"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'CE 102', subjectName: 'Engineering Drawing', units: 3, programId: programs[5].id, departmentId: departments[4].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Civil Engineering"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'CE 103', subjectName: 'Statics of Rigid Bodies', units: 3, programId: programs[5].id, departmentId: departments[4].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Civil Engineering"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'CE 104', subjectName: 'Engineering Materials', units: 3, programId: programs[5].id, departmentId: departments[4].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Civil Engineering"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'CE 105', subjectName: 'Surveying', units: 3, programId: programs[5].id, departmentId: departments[4].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Civil Engineering"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'CE 201', subjectName: 'Dynamics of Rigid Bodies', units: 3, programId: programs[5].id, departmentId: departments[4].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Civil Engineering"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'CE 301', subjectName: 'Structural Analysis', units: 3, programId: programs[5].id, departmentId: departments[4].id, subjectType: 'lecture', yearLevel: 3, semester: '1st', requiredSpecialization: '["Civil Engineering"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'CE 401', subjectName: 'CE Design Project', units: 3, programId: programs[5].id, departmentId: departments[4].id, subjectType: 'lecture', yearLevel: 4, semester: '1st', requiredSpecialization: '["Civil Engineering"]', lectureHours: 3, labHours: 0 },

      // ─── BSEE (EN) ───
      { subjectCode: 'EE 101', subjectName: 'Basic Electrical Engineering', units: 3, programId: programs[6].id, departmentId: departments[4].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Electrical Engineering"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'EE 102', subjectName: 'Engineering Physics', units: 3, programId: programs[6].id, departmentId: departments[4].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Electrical Engineering"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'EE 103', subjectName: 'Circuit Analysis', units: 3, programId: programs[6].id, departmentId: departments[4].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Electrical Engineering"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'EE 104', subjectName: 'Computer Programming for EE', units: 3, programId: programs[6].id, departmentId: departments[4].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Electrical Engineering"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'EE 105', subjectName: 'Electrical Safety', units: 3, programId: programs[6].id, departmentId: departments[4].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Electrical Engineering"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'EE 201', subjectName: 'Electronics I', units: 3, programId: programs[6].id, departmentId: departments[4].id, subjectType: 'lecture_and_lab', yearLevel: 2, semester: '1st', requiredSpecialization: '["Electrical Engineering"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'EE 301', subjectName: 'Power Systems', units: 3, programId: programs[6].id, departmentId: departments[4].id, subjectType: 'lecture', yearLevel: 3, semester: '1st', requiredSpecialization: '["Electrical Engineering"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'EE 401', subjectName: 'EE Design Project', units: 3, programId: programs[6].id, departmentId: departments[4].id, subjectType: 'lecture', yearLevel: 4, semester: '1st', requiredSpecialization: '["Electrical Engineering"]', lectureHours: 3, labHours: 0 },

      // ─── BSHM (HM) ───
      { subjectCode: 'HM 101', subjectName: 'Introduction to Hospitality', units: 3, programId: programs[7].id, departmentId: departments[5].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Hospitality Management"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'HM 102', subjectName: 'Food Safety & Sanitation', units: 3, programId: programs[7].id, departmentId: departments[5].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Hospitality Management"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'HM 103', subjectName: 'Basic Culinary Arts', units: 3, programId: programs[7].id, departmentId: departments[5].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Culinary Arts"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'HM 104', subjectName: 'Housekeeping Management', units: 3, programId: programs[7].id, departmentId: departments[5].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Hospitality Management"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'HM 201', subjectName: 'Front Office Operations', units: 3, programId: programs[7].id, departmentId: departments[5].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Hospitality Management"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'HM 301', subjectName: 'Resort & Recreation Management', units: 3, programId: programs[7].id, departmentId: departments[5].id, subjectType: 'lecture', yearLevel: 3, semester: '1st', requiredSpecialization: '["Hospitality Management"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'HM 401', subjectName: 'HM Practicum', units: 3, programId: programs[7].id, departmentId: departments[5].id, subjectType: 'lecture', yearLevel: 4, semester: '1st', requiredSpecialization: '["Hospitality Management"]', lectureHours: 3, labHours: 0 },

      // ─── BSOA-COA (OA) ───
      { subjectCode: 'OA 101', subjectName: 'Office Procedures', units: 3, programId: programs[8].id, departmentId: departments[6].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Office Administration"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'OA 102', subjectName: 'Business Correspondence', units: 3, programId: programs[8].id, departmentId: departments[6].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Office Administration"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'OA 103', subjectName: 'Keyboarding & Document Processing', units: 3, programId: programs[8].id, departmentId: departments[6].id, subjectType: 'lecture_and_lab', yearLevel: 1, semester: '1st', requiredSpecialization: '["Office Administration"]', lectureHours: 2, labHours: 3 },
      { subjectCode: 'OA 104', subjectName: 'Records Management', units: 3, programId: programs[8].id, departmentId: departments[6].id, subjectType: 'lecture', yearLevel: 1, semester: '1st', requiredSpecialization: '["Office Administration"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'OA 201', subjectName: 'Office Management', units: 3, programId: programs[8].id, departmentId: departments[6].id, subjectType: 'lecture', yearLevel: 2, semester: '1st', requiredSpecialization: '["Office Administration"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'OA 301', subjectName: 'Administrative Office Systems', units: 3, programId: programs[8].id, departmentId: departments[6].id, subjectType: 'lecture', yearLevel: 3, semester: '1st', requiredSpecialization: '["Office Administration"]', lectureHours: 3, labHours: 0 },
      { subjectCode: 'OA 401', subjectName: 'OA Practicum', units: 3, programId: programs[8].id, departmentId: departments[6].id, subjectType: 'lecture', yearLevel: 4, semester: '1st', requiredSpecialization: '["Office Administration"]', lectureHours: 3, labHours: 0 },
    ]
    const subjects = await Promise.all(subjectsData.map(s => db.subject.create({ data: s })))
    summary.subjects = subjects.length

    // ═══════════════════════════════════════════════════════════════════
    // 4. ADMIN + FACULTY (50+)
    // Specializations stored as JSON arrays to match production format
    // ═══════════════════════════════════════════════════════════════════
    const admin = await db.user.create({
      data: {
        uid: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@quacktrack.com',
        password: hashedAdminPassword,
        role: 'admin',
        status: 'active',
        maxUnits: 0,
      },
    })

    // ═══════════════════════════════════════════════════════════════════
    // 4b. ROLE-BASED USERS (for testing RBAC)
    // ═══════════════════════════════════════════════════════════════════
    const roleUsers = await Promise.all([
      db.user.create({
        data: {
          uid: 'DEAN-CS',
          name: 'Dr. Angelo Villanueva',
          email: 'dean.cs@quacktrack.com',
          password: hashedAdminPassword,
          role: 'department_dean',
          facultyType: 'executive',
          departmentId: departments[2].id,
          specialization: '["Computer Science","Artificial Intelligence"]',
          contractType: 'full_time',
          maxUnits: 18,
          status: 'active',
        },
      }),
      db.user.create({
        data: {
          uid: 'PH-BSCS',
          name: 'Prof. Patricia Reyes',
          email: 'ph.bscs@quacktrack.com',
          password: hashedAdminPassword,
          role: 'program_head',
          facultyType: 'executive',
          departmentId: departments[2].id,
          specialization: '["Computer Science","Data Science"]',
          contractType: 'full_time',
          maxUnits: 18,
          status: 'active',
        },
      }),
      db.user.create({
        data: {
          uid: 'HR-001',
          name: 'Maria Clara Santos',
          email: 'hr@quacktrack.com',
          password: hashedAdminPassword,
          role: 'human_resource',
          departmentId: departments[1].id,
          status: 'active',
          maxUnits: 0,
        },
      }),
      db.user.create({
        data: {
          uid: 'REG-001',
          name: 'Juan Dela Cruz',
          email: 'registrar@quacktrack.com',
          password: hashedAdminPassword,
          role: 'registrar',
          status: 'active',
          maxUnits: 0,
        },
      }),
      db.user.create({
        data: {
          uid: 'FAC-DEMO',
          name: 'Prof. Demo Faculty',
          email: 'faculty@quacktrack.com',
          password: hashedAdminPassword,
          role: 'faculty',
          facultyType: 'regular',
          departmentId: departments[2].id,
          specialization: '["Computer Science","Software Engineering"]',
          contractType: 'full_time',
          maxUnits: 21,
          status: 'active',
        },
      }),
    ])

    const facultyData = [
      // ─── AS Department (8) ───
      { uid: 'fac-001', name: 'Prof. Maria Santos', email: 'santos.maria@ptc.edu.ph', role: 'department_dean', facultyType: 'executive', departmentId: departments[0].id, specialization: '["English Literature","Linguistics"]', contractType: 'full_time', maxUnits: 18 },
      { uid: 'fac-002', name: 'Prof. Jose Rizal Jr.', email: 'rizal.jose@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[0].id, specialization: '["English Literature","Philippine Studies"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-003', name: 'Prof. Ana Cruz', email: 'cruz.ana@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[0].id, specialization: '["Linguistics","Communication"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-004', name: 'Prof. Carmen Reyes', email: 'reyes.carmen@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[0].id, specialization: '["Philippine Studies","History"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-005', name: 'Prof. Luis Garcia', email: 'garcia.luis@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[0].id, specialization: '["English Literature","Creative Writing"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-006', name: 'Prof. Rosa Villanueva', email: 'villanueva.rosa@ptc.edu.ph', role: 'faculty', facultyType: 'executive', departmentId: departments[0].id, specialization: '["Communication","Journalism"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-007', name: 'Prof. Eduardo Mendoza', email: 'mendoza.eduardo@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[0].id, specialization: '["Philosophy","Logic"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-008', name: 'Prof. Isabel Torres', email: 'torres.isabel@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[0].id, specialization: '["Linguistics","English Literature"]', contractType: 'part_time', maxUnits: 18 },

      // ─── BA Department (7) ───
      { uid: 'fac-009', name: 'Prof. Roberto Aquino', email: 'aquino.roberto@ptc.edu.ph', role: 'department_dean', facultyType: 'executive', departmentId: departments[1].id, specialization: '["Business Administration","Marketing"]', contractType: 'full_time', maxUnits: 18 },
      { uid: 'fac-010', name: 'Prof. Cristina Mendoza', email: 'mendoza.cristina@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[1].id, specialization: '["Accounting","Finance"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-011', name: 'Prof. Felipe Ramos', email: 'ramos.felipe@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[1].id, specialization: '["Economics","Statistics"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-012', name: 'Prof. Grace Lim', email: 'lim.grace@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[1].id, specialization: '["Corporate Law","Compliance"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-013', name: 'Prof. Daniel Castillo', email: 'castillo.daniel@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[1].id, specialization: '["Human Resources","Organizational Behavior"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-014', name: 'Prof. Elena Navarro', email: 'navarro.elena@ptc.edu.ph', role: 'faculty', facultyType: 'executive', departmentId: departments[1].id, specialization: '["Marketing","Digital Marketing"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-015', name: 'Prof. Antonio Cruz', email: 'cruz.antonio@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[1].id, specialization: '["Finance","Banking"]', contractType: 'part_time', maxUnits: 18 },

      // ─── CS Department (8) ───
      { uid: 'fac-016', name: 'Prof. Angelo Villanueva', email: 'villanueva.angelo@ptc.edu.ph', role: 'department_dean', facultyType: 'executive', departmentId: departments[2].id, specialization: '["Computer Science","Artificial Intelligence"]', contractType: 'full_time', maxUnits: 18 },
      { uid: 'fac-017', name: 'Prof. Patricia Reyes', email: 'reyes.patricia@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[2].id, specialization: '["Computer Science","Data Science"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-018', name: 'Prof. Ricardo Santos', email: 'santos.ricardo@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[2].id, specialization: '["Information Technology","Networking"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-019', name: 'Prof. Lourdes Garcia', email: 'garcia.lourdes@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[2].id, specialization: '["Information Technology","Web Development"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-020', name: 'Prof. Marco Aquino', email: 'aquino.marco@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[2].id, specialization: '["Computer Science","Software Engineering"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-021', name: 'Prof. Carla Mendoza', email: 'mendoza.carla@ptc.edu.ph', role: 'faculty', facultyType: 'executive', departmentId: departments[2].id, specialization: '["Cybersecurity","Network Security"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-022', name: 'Prof. Kevin Ramos', email: 'ramos.kevin@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[2].id, specialization: '["Computer Engineering","Embedded Systems"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-023', name: 'Prof. Michelle Torres', email: 'torres.michelle@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[2].id, specialization: '["Mathematics","Discrete Mathematics"]', contractType: 'part_time', maxUnits: 18 },

      // ─── ED Department (7) ───
      { uid: 'fac-024', name: 'Prof. Remedios Ponce', email: 'ponce.remedios@ptc.edu.ph', role: 'department_dean', facultyType: 'executive', departmentId: departments[3].id, specialization: '["Education","Curriculum Development"]', contractType: 'full_time', maxUnits: 18 },
      { uid: 'fac-025', name: 'Prof. Loreta Bautista', email: 'bautista.loreta@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[3].id, specialization: '["Education","Language Teaching"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-026', name: 'Prof. Augusto Fernandez', email: 'fernandez.augusto@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[3].id, specialization: '["Psychology","Educational Psychology"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-027', name: 'Prof. Perlita Magno', email: 'magno.perlita@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[3].id, specialization: '["Education","Special Education"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-028', name: 'Prof. Cesar Rivera', email: 'rivera.cesar@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[3].id, specialization: '["Education","Assessment"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-029', name: 'Prof. Lina Ocampo', email: 'ocampo.lina@ptc.edu.ph', role: 'faculty', facultyType: 'executive', departmentId: departments[3].id, specialization: '["TESOL","Language Teaching"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-030', name: 'Prof. Renato Dizon', email: 'dizon.renato@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[3].id, specialization: '["Education","Social Studies"]', contractType: 'part_time', maxUnits: 18 },

      // ─── EN Department (8) ───
      { uid: 'fac-031', name: 'Prof. Ferdinand Lopez', email: 'lopez.ferdinand@ptc.edu.ph', role: 'department_dean', facultyType: 'executive', departmentId: departments[4].id, specialization: '["Civil Engineering","Structural Engineering"]', contractType: 'full_time', maxUnits: 18 },
      { uid: 'fac-032', name: 'Prof. Esperanza Reyes', email: 'reyes.esperanza@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[4].id, specialization: '["Electrical Engineering","Power Systems"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-033', name: 'Prof. Arturo Santos', email: 'santos.arturo@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[4].id, specialization: '["Civil Engineering","Geotechnical Engineering"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-034', name: 'Prof. Milagros Cruz', email: 'cruz.milagros@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[4].id, specialization: '["Electrical Engineering","Renewable Energy"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-035', name: 'Prof. Rodrigo Ramos', email: 'ramos.rodrigo@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[4].id, specialization: '["Civil Engineering","Construction Management"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-036', name: 'Prof. Erlinda Garcia', email: 'garcia.erlinda@ptc.edu.ph', role: 'faculty', facultyType: 'executive', departmentId: departments[4].id, specialization: '["Electrical Engineering","Control Systems"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-037', name: 'Prof. Mario Aquino', email: 'aquino.mario@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[4].id, specialization: '["Civil Engineering","Transportation Engineering"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-038', name: 'Prof. Vivian Mendoza', email: 'mendoza.vivian@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[4].id, specialization: '["Solar Engineering","Renewable Energy"]', contractType: 'part_time', maxUnits: 18 },

      // ─── HM Department (7) ───
      { uid: 'fac-039', name: 'Prof. Gloria Magbanua', email: 'magbanua.gloria@ptc.edu.ph', role: 'department_dean', facultyType: 'executive', departmentId: departments[5].id, specialization: '["Hospitality Management","Tourism"]', contractType: 'full_time', maxUnits: 18 },
      { uid: 'fac-040', name: 'Prof. Benjamin Torres', email: 'torres.benjamin@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[5].id, specialization: '["Culinary Arts","Food Science"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-041', name: 'Prof. Remedios Villanueva', email: 'villanueva.remedios@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[5].id, specialization: '["Hospitality Management","Hotel Operations"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-042', name: 'Prof. Ernesto Reyes', email: 'reyes.ernesto@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[5].id, specialization: '["Tourism","Event Management"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-043', name: 'Prof. Corazon Cruz', email: 'cruz.corazon@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[5].id, specialization: '["Culinary Arts","Pastry & Baking"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-044', name: 'Prof. Alfredo Santos', email: 'santos.alfredo@ptc.edu.ph', role: 'faculty', facultyType: 'executive', departmentId: departments[5].id, specialization: '["Hospitality Management","Restaurant Management"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-045', name: 'Prof. Rosario Aquino', email: 'aquino.rosario@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[5].id, specialization: '["Housekeeping","Front Office"]', contractType: 'part_time', maxUnits: 18 },

      // ─── OA Department (7) ───
      { uid: 'fac-046', name: 'Prof. Armando Ponce', email: 'ponce.armando@ptc.edu.ph', role: 'department_dean', facultyType: 'executive', departmentId: departments[6].id, specialization: '["Office Administration","Records Management"]', contractType: 'full_time', maxUnits: 18 },
      { uid: 'fac-047', name: 'Prof. Teresita Rivera', email: 'rivera.teresita@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[6].id, specialization: '["Office Administration","Business Correspondence"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-048', name: 'Prof. Danilo Garcia', email: 'garcia.danilo@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[6].id, specialization: '["Office Administration","Stenography"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-049', name: 'Prof. Josefina Mendoza', email: 'mendoza.josefina@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[6].id, specialization: '["Office Administration","Document Processing"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-050', name: 'Prof. Ricardo Lim', email: 'lim.ricardo@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[6].id, specialization: '["Office Administration","Filing Systems"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-051', name: 'Prof. Norma Bautista', email: 'bautista.norma@ptc.edu.ph', role: 'faculty', facultyType: 'executive', departmentId: departments[6].id, specialization: '["Office Administration","Administrative Systems"]', contractType: 'full_time', maxUnits: 21 },
      { uid: 'fac-052', name: 'Prof. Alejandro Ramos', email: 'ramos.alejandro@ptc.edu.ph', role: 'faculty', facultyType: 'regular', departmentId: departments[6].id, specialization: '["Office Administration","Human Relations"]', contractType: 'part_time', maxUnits: 18 },
    ]

    const faculty = await Promise.all(
      facultyData.map(f =>
        db.user.create({
          data: { ...f, password: hashedFacultyPassword, status: 'active', phone: null },
        })
      )
    )
    summary.faculty = faculty.length + 1 + roleUsers.length // +1 for admin, +role users

    // ═══════════════════════════════════════════════════════════════════
    // 5. SECTIONS (comprehensive, multiple year levels)
    // Using "1st" semester format for sections
    // ═══════════════════════════════════════════════════════════════════
    const sectionsData = [
      // AB English
      { sectionName: 'AB English 1-1', yearLevel: 1, semester: '1st', programId: programs[0].id, departmentId: departments[0].id, population: 35 },
      { sectionName: 'AB English 2-1', yearLevel: 2, semester: '1st', programId: programs[0].id, departmentId: departments[0].id, population: 30 },
      { sectionName: 'AB English 3-1', yearLevel: 3, semester: '1st', programId: programs[0].id, departmentId: departments[0].id, population: 28 },
      { sectionName: 'AB English 4-1', yearLevel: 4, semester: '1st', programId: programs[0].id, departmentId: departments[0].id, population: 25 },

      // BSBA
      { sectionName: 'BSBA 1-1', yearLevel: 1, semester: '1st', programId: programs[1].id, departmentId: departments[1].id, population: 40 },
      { sectionName: 'BSBA 1-2', yearLevel: 1, semester: '1st', programId: programs[1].id, departmentId: departments[1].id, population: 38 },
      { sectionName: 'BSBA 2-1', yearLevel: 2, semester: '1st', programId: programs[1].id, departmentId: departments[1].id, population: 36 },
      { sectionName: 'BSBA 3-1', yearLevel: 3, semester: '1st', programId: programs[1].id, departmentId: departments[1].id, population: 32 },
      { sectionName: 'BSBA 4-1', yearLevel: 4, semester: '1st', programId: programs[1].id, departmentId: departments[1].id, population: 28 },
      { sectionName: 'BSBA Executive 1-1', yearLevel: 1, semester: '1st', programId: programs[1].id, departmentId: departments[1].id, population: 25 },

      // BSCS
      { sectionName: 'BSCS 1-1', yearLevel: 1, semester: '1st', programId: programs[2].id, departmentId: departments[2].id, population: 35 },
      { sectionName: 'BSCS 1-2', yearLevel: 1, semester: '1st', programId: programs[2].id, departmentId: departments[2].id, population: 33 },
      { sectionName: 'BSCS 2-1', yearLevel: 2, semester: '1st', programId: programs[2].id, departmentId: departments[2].id, population: 30 },
      { sectionName: 'BSCS 3-1', yearLevel: 3, semester: '1st', programId: programs[2].id, departmentId: departments[2].id, population: 28 },
      { sectionName: 'BSCS 4-1', yearLevel: 4, semester: '1st', programId: programs[2].id, departmentId: departments[2].id, population: 25 },

      // BSIT
      { sectionName: 'BSIT 1-1', yearLevel: 1, semester: '1st', programId: programs[3].id, departmentId: departments[2].id, population: 40 },
      { sectionName: 'BSIT 1-2', yearLevel: 1, semester: '1st', programId: programs[3].id, departmentId: departments[2].id, population: 38 },
      { sectionName: 'BSIT 2-1', yearLevel: 2, semester: '1st', programId: programs[3].id, departmentId: departments[2].id, population: 35 },
      { sectionName: 'BSIT 3-1', yearLevel: 3, semester: '1st', programId: programs[3].id, departmentId: departments[2].id, population: 30 },
      { sectionName: 'BSIT 4-1', yearLevel: 4, semester: '1st', programId: programs[3].id, departmentId: departments[2].id, population: 25 },

      // BSED
      { sectionName: 'BSED 1-1', yearLevel: 1, semester: '1st', programId: programs[4].id, departmentId: departments[3].id, population: 38 },
      { sectionName: 'BSED 1-2', yearLevel: 1, semester: '1st', programId: programs[4].id, departmentId: departments[3].id, population: 36 },
      { sectionName: 'BSED 2-1', yearLevel: 2, semester: '1st', programId: programs[4].id, departmentId: departments[3].id, population: 32 },
      { sectionName: 'BSED 3-1', yearLevel: 3, semester: '1st', programId: programs[4].id, departmentId: departments[3].id, population: 28 },
      { sectionName: 'BSED 4-1', yearLevel: 4, semester: '1st', programId: programs[4].id, departmentId: departments[3].id, population: 25 },

      // BSCE
      { sectionName: 'BSCE 1-1', yearLevel: 1, semester: '1st', programId: programs[5].id, departmentId: departments[4].id, population: 35 },
      { sectionName: 'BSCE 2-1', yearLevel: 2, semester: '1st', programId: programs[5].id, departmentId: departments[4].id, population: 30 },
      { sectionName: 'BSCE 3-1', yearLevel: 3, semester: '1st', programId: programs[5].id, departmentId: departments[4].id, population: 28 },
      { sectionName: 'BSCE 4-1', yearLevel: 4, semester: '1st', programId: programs[5].id, departmentId: departments[4].id, population: 25 },

      // BSEE
      { sectionName: 'BSEE 1-1', yearLevel: 1, semester: '1st', programId: programs[6].id, departmentId: departments[4].id, population: 30 },
      { sectionName: 'BSEE 2-1', yearLevel: 2, semester: '1st', programId: programs[6].id, departmentId: departments[4].id, population: 28 },
      { sectionName: 'BSEE 3-1', yearLevel: 3, semester: '1st', programId: programs[6].id, departmentId: departments[4].id, population: 25 },
      { sectionName: 'BSEE 4-1', yearLevel: 4, semester: '1st', programId: programs[6].id, departmentId: departments[4].id, population: 22 },

      // BSHM
      { sectionName: 'BSHM 1-1', yearLevel: 1, semester: '1st', programId: programs[7].id, departmentId: departments[5].id, population: 38 },
      { sectionName: 'BSHM 1-2', yearLevel: 1, semester: '1st', programId: programs[7].id, departmentId: departments[5].id, population: 36 },
      { sectionName: 'BSHM 2-1', yearLevel: 2, semester: '1st', programId: programs[7].id, departmentId: departments[5].id, population: 32 },
      { sectionName: 'BSHM 3-1', yearLevel: 3, semester: '1st', programId: programs[7].id, departmentId: departments[5].id, population: 28 },
      { sectionName: 'BSHM 4-1', yearLevel: 4, semester: '1st', programId: programs[7].id, departmentId: departments[5].id, population: 25 },

      // BSOA-COA
      { sectionName: 'BSOA 1-1', yearLevel: 1, semester: '1st', programId: programs[8].id, departmentId: departments[6].id, population: 40 },
      { sectionName: 'BSOA 1-2', yearLevel: 1, semester: '1st', programId: programs[8].id, departmentId: departments[6].id, population: 38 },
      { sectionName: 'BSOA 2-1', yearLevel: 2, semester: '1st', programId: programs[8].id, departmentId: departments[6].id, population: 35 },
      { sectionName: 'BSOA 3-1', yearLevel: 3, semester: '1st', programId: programs[8].id, departmentId: departments[6].id, population: 30 },
      { sectionName: 'BSOA 4-1', yearLevel: 4, semester: '1st', programId: programs[8].id, departmentId: departments[6].id, population: 25 },
    ]
    const sections = await Promise.all(sectionsData.map(s => db.section.create({ data: s })))
    summary.sections = sections.length

    // ═══════════════════════════════════════════════════════════════════
    // 6. FACULTY PREFERENCES
    // ═══════════════════════════════════════════════════════════════════
    const preferencesData = [
      { facultyId: faculty[0].id, preferredDays: 'Mon,Wed,Fri', preferredTimeStart: '07:30', preferredTimeEnd: '12:00', unavailableDays: 'Sat', maxUnitsOverride: 15, semester: '1st', academicYear: '2025-2026' },
      { facultyId: faculty[1].id, preferredDays: 'Tue,Thu', preferredTimeStart: '07:30', preferredTimeEnd: '17:30', unavailableDays: 'Sat', semester: '1st', academicYear: '2025-2026' },
      { facultyId: faculty[2].id, preferredDays: 'Mon,Wed,Fri', preferredTimeStart: '09:00', preferredTimeEnd: '16:00', unavailableDays: 'Sat', semester: '1st', academicYear: '2025-2026' },
      { facultyId: faculty[8].id, preferredDays: 'Mon,Tue,Wed,Thu,Fri', preferredTimeStart: '07:30', preferredTimeEnd: '12:00', unavailableTimeSlots: JSON.stringify([{ day: 'Mon', start: '13:00', end: '17:30' }]), semester: '1st', academicYear: '2025-2026' },
      { facultyId: faculty[9].id, preferredDays: 'Tue,Thu', preferredTimeStart: '07:30', preferredTimeEnd: '17:30', semester: '1st', academicYear: '2025-2026' },
      { facultyId: faculty[15].id, preferredDays: 'Mon,Wed,Fri', preferredTimeStart: '07:30', preferredTimeEnd: '14:30', unavailableDays: 'Sat', semester: '1st', academicYear: '2025-2026' },
      { facultyId: faculty[16].id, preferredDays: 'Tue,Thu', preferredTimeStart: '09:00', preferredTimeEnd: '17:30', semester: '1st', academicYear: '2025-2026' },
      { facultyId: faculty[23].id, preferredDays: 'Mon,Wed,Fri', preferredTimeStart: '07:30', preferredTimeEnd: '12:00', unavailableDays: 'Sat', semester: '1st', academicYear: '2025-2026' },
      { facultyId: faculty[30].id, preferredDays: 'Mon,Wed', preferredTimeStart: '07:30', preferredTimeEnd: '17:30', semester: '1st', academicYear: '2025-2026' },
      { facultyId: faculty[38].id, preferredDays: 'Tue,Thu,Fri', preferredTimeStart: '07:30', preferredTimeEnd: '16:00', semester: '1st', academicYear: '2025-2026' },
      { facultyId: faculty[45].id, preferredDays: 'Mon,Wed,Fri', preferredTimeStart: '09:00', preferredTimeEnd: '17:30', semester: '1st', academicYear: '2025-2026' },
    ]
    await Promise.all(preferencesData.map(p => db.facultyPreference.create({ data: p })))
    summary.preferences = preferencesData.length

    // ═══════════════════════════════════════════════════════════════════
    // 7. GENERATION CONFIG
    // ═══════════════════════════════════════════════════════════════════
    const genConfig = await db.generationConfig.create({
      data: {
        name: 'Default Schedule Configuration',
        description: 'Standard configuration for schedule generation',
        config: JSON.stringify({
          maxFacultyHoursPerDay: 6,
          minBreakBetweenClasses: 30,
          preferredSlotDuration: 90,
          allowSaturdayClasses: true,
          maxConsecutiveClasses: 3,
          roomUtilizationTarget: 0,
          facultyWorkloadTarget: 0.75,
        }),
        isDefault: true,
      },
    })

    // ═══════════════════════════════════════════════════════════════════
    // 8. SCHEDULE VERSION (draft)
    // ═══════════════════════════════════════════════════════════════════
    const scheduleVersion = await db.scheduleVersion.create({
      data: {
        name: '1st Semester 2025-2026 - Draft',
        description: 'Initial draft schedule for first semester',
        semester: '1st',
        academicYear: '2025-2026',
        status: 'draft',
      },
    })

    // ═══════════════════════════════════════════════════════════════════
    // 9. NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════
    const notificationsData = [
      { userId: admin.id, title: 'Welcome to QuackTrackV2', message: 'The scheduling platform has been set up. You can now start managing schedules.', type: 'success' },
      { userId: admin.id, title: 'Schedule Draft Ready', message: 'A draft schedule for 1st Semester 2025-2026 has been created. Please review it.', type: 'info' },
      { userId: faculty[0].id, title: 'Department Head Access', message: 'You have been granted department head access for Arts & Sciences.', type: 'success' },
      { userId: faculty[8].id, title: 'Department Head Access', message: 'You have been granted department head access for Business Administration.', type: 'success' },
      { userId: faculty[15].id, title: 'Department Head Access', message: 'You have been granted department head access for Computer Studies.', type: 'success' },
      { userId: faculty[23].id, title: 'Department Head Access', message: 'You have been granted department head access for Education.', type: 'success' },
      { userId: faculty[30].id, title: 'Department Head Access', message: 'You have been granted department head access for Engineering.', type: 'success' },
      { userId: faculty[38].id, title: 'Department Head Access', message: 'You have been granted department head access for Hospitality Management.', type: 'success' },
      { userId: faculty[45].id, title: 'Department Head Access', message: 'You have been granted department head access for Office Administration.', type: 'success' },
      { userId: faculty[1].id, title: 'Preference Reminder', message: 'Please update your scheduling preferences for the upcoming semester.', type: 'warning' },
    ]
    await Promise.all(notificationsData.map(n => db.notification.create({ data: n })))
    summary.notifications = notificationsData.length

    // ═══════════════════════════════════════════════════════════════════
    // 10. ANNOUNCEMENTS
    // ═══════════════════════════════════════════════════════════════════
    const announcementsData = [
      { title: 'Schedule Generation Now Available', content: 'The automated schedule generation feature is now available for the 1st Semester 2025-2026. Department heads can now initiate schedule generation for their respective departments.', priority: 'high', isActive: true, authorId: admin.id },
      { title: 'Faculty Preference Submission Deadline', content: 'All faculty members are required to submit their scheduling preferences by June 15, 2025. Please use the preferences form in your dashboard.', priority: 'urgent', isActive: true, authorId: admin.id, expiresAt: new Date('2025-06-16') },
      { title: 'System Maintenance Notice', content: 'QuackTrackV2 will undergo scheduled maintenance on June 20, 2025, from 10:00 PM to 2:00 AM. Please save your work before this time.', priority: 'normal', isActive: true, authorId: admin.id },
      { title: 'Welcome to QuackTrackV2!', content: 'Welcome to the new university scheduling platform. This system will help streamline the schedule creation process and reduce conflicts. Please explore the features and report any issues.', priority: 'normal', isActive: true, authorId: admin.id },
    ]
    await Promise.all(announcementsData.map(a => db.announcement.create({ data: a })))
    summary.announcements = announcementsData.length

    // ═══════════════════════════════════════════════════════════════════
    // 11. AUDIT LOGS
    // ═══════════════════════════════════════════════════════════════════
    const auditLogsData = [
      { userId: admin.id, action: 'system_setup', entity: 'System', details: 'Initial system setup and data seeding completed' },
      { userId: admin.id, action: 'create', entity: 'ScheduleVersion', entityId: scheduleVersion.id, details: 'Created draft schedule version for 1st Semester 2025-2026' },
      { userId: admin.id, action: 'create', entity: 'GenerationConfig', entityId: genConfig.id, details: 'Created default generation configuration' },
    ]
    await Promise.all(auditLogsData.map(l => db.auditLog.create({ data: l })))
    summary.auditLogs = auditLogsData.length

    console.log('✅ Database seeded successfully:', summary)

    return NextResponse.json({
      message: 'Database seeded successfully',
      summary,
      credentials: {
        admin: { email: 'admin@quacktrack.com', password: 'password123' },
        faculty: { password: 'faculty123', note: 'All faculty accounts use this password' },
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

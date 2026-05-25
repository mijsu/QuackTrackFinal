import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const version = await db.scheduleVersion.findUnique({
      where: { id },
      include: {
        schedules: {
          include: {
            subject: { select: { id: true, subjectCode: true, subjectName: true, units: true, subjectType: true, defaultDurationHours: true, lectureHours: true, labHours: true } },
            faculty: { select: { id: true, name: true, uid: true, maxUnits: true, department: { select: { name: true, code: true } } } },
          },
        },
      },
    })

    if (!version) {
      return NextResponse.json({ error: 'Schedule version not found' }, { status: 404 })
    }

    // Helper: calculate hours from startTime/endTime strings
    function calcHours(startTime: string, endTime: string): number {
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = endTime.split(':').map(Number)
      return (eh * 60 + em - (sh * 60 + sm)) / 60
    }

    // Aggregate per faculty
    const facultyMap = new Map<string, {
      id: string
      name: string
      uid: string
      maxUnits: number
      assignedUnits: number
      assignmentCount: number
      totalHours: number
      lectureHours: number
      labHours: number
      subjectCount: number
      subjects: { subjectCode: string; subjectName: string; units: number; subjectType: string; defaultDurationHours: number }[]
      department: { name: string; code: string } | null
    }>()

    for (const schedule of version.schedules) {
      const fid = schedule.faculty.id
      const existing = facultyMap.get(fid)
      const units = schedule.subject.units
      // Calculate actual hours from schedule times
      const slotHours = calcHours(schedule.startTime, schedule.endTime)
      const isLab = schedule.subject.subjectType === 'lab'

      if (existing) {
        existing.assignedUnits += units
        existing.assignmentCount += 1
        existing.totalHours += slotHours
        existing.lectureHours += isLab ? 0 : slotHours
        existing.labHours += isLab ? slotHours : 0
        // Track unique subjects
        if (!existing.subjects.some(s => s.subjectCode === schedule.subject.subjectCode)) {
          existing.subjects.push(schedule.subject)
          existing.subjectCount = existing.subjects.length
        }
      } else {
        facultyMap.set(fid, {
          id: schedule.faculty.id,
          name: schedule.faculty.name,
          uid: schedule.faculty.uid,
          maxUnits: schedule.faculty.maxUnits,
          assignedUnits: units,
          assignmentCount: 1,
          totalHours: slotHours,
          lectureHours: isLab ? 0 : slotHours,
          labHours: isLab ? slotHours : 0,
          subjectCount: 1,
          subjects: [schedule.subject],
          department: schedule.faculty.department,
        })
      }
    }

    // Convert to array and sort by load (highest first)
    const facultyLoads = Array.from(facultyMap.values())
      .sort((a, b) => b.assignedUnits - a.assignedUnits)

    // Compute distribution summary
    const totalFaculty = facultyLoads.length
    const totalAssignedUnits = facultyLoads.reduce((sum, f) => sum + f.assignedUnits, 0)
    const totalAssignments = facultyLoads.reduce((sum, f) => sum + f.assignmentCount, 0)
    const totalHours = facultyLoads.reduce((sum, f) => sum + f.totalHours, 0)
    const totalLectureHours = facultyLoads.reduce((sum, f) => sum + f.lectureHours, 0)
    const totalLabHours = facultyLoads.reduce((sum, f) => sum + f.labHours, 0)
    const overloadedCount = facultyLoads.filter(f => f.maxUnits > 0 && f.assignedUnits >= f.maxUnits).length
    const heavyCount = facultyLoads.filter(f => f.maxUnits > 0 && f.assignedUnits >= f.maxUnits * 0.75 && f.assignedUnits < f.maxUnits).length
    const normalCount = facultyLoads.filter(f => f.maxUnits > 0 && f.assignedUnits < f.maxUnits * 0.75).length
    const unassignedCount = Math.max(0, (version.schedules.length > 0 ? (await db.user.count({ where: { role: 'faculty', status: 'active' } })) : 0) - totalFaculty)
    const avgLoad = totalFaculty > 0 ? Math.round((totalAssignedUnits / totalFaculty) * 10) / 10 : 0
    const avgUtilization = facultyLoads.length > 0
      ? Math.round((facultyLoads.reduce((sum, f) => sum + (f.maxUnits > 0 ? (f.assignedUnits / f.maxUnits) * 100 : 0), 0) / facultyLoads.length) * 10) / 10
      : 0

    return NextResponse.json({
      faculty: facultyLoads.map(f => ({
        ...f,
        totalHours: Math.round(f.totalHours * 10) / 10,
        lectureHours: Math.round(f.lectureHours * 10) / 10,
        labHours: Math.round(f.labHours * 10) / 10,
      })),
      summary: {
        totalFaculty,
        totalAssignedUnits,
        totalAssignments,
        totalHours: Math.round(totalHours * 10) / 10,
        totalLectureHours: Math.round(totalLectureHours * 10) / 10,
        totalLabHours: Math.round(totalLabHours * 10) / 10,
        overloadedCount,
        heavyCount,
        normalCount,
        unassignedCount,
        avgLoad,
        avgUtilization,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch faculty load data' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { generateSchedules } from '@/lib/scheduling'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { semester, academicYear, departmentId, configId, classType } = body

    if (!semester || !academicYear) {
      return NextResponse.json(
        { error: 'Semester and academicYear are required' },
        { status: 400 }
      )
    }

    const result = await generateSchedules({
      semester,
      academicYear,
      departmentId,
      configId,
      classType,
    })

    const statusCode = result.status === 'failed' ? 422 : 200
    return NextResponse.json(result, { status: statusCode })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Schedule generation failed' },
      { status: 500 }
    )
  }
}

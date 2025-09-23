import { PrismaClient, Role, RoutingVersionStatus } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create departments (one per stage)
  const departmentNames = [
    'Kitting',
    'Lamination', 
    'Hull Rigging',
    'Deck Rigging',
    'Capping',
    'Engine Hang',
    'Final Rigging',
    'Water Test',
    'QA',
    'Cleaning',
    'Shipping'
  ]

  console.log('Creating departments...')
  const departments = await Promise.all(
    departmentNames.map(name =>
      prisma.department.create({
        data: { name }
      })
    )
  )

  console.log('Creating work centers...')
  const workCenters = await Promise.all(
    departments.map(dept =>
      prisma.workCenter.create({
        data: {
          name: dept.name,
          departmentId: dept.id
        }
      })
    )
  )

  console.log('Creating stations...')
  const stationCodes = [
    'KIT-1', 'LAM-1', 'HRIG-1', 'DRIG-1', 'CAP-1', 
    'ENG-1', 'FRIG-1', 'WTEST-1', 'QA-1', 'CLEAN-1', 'SHIP-1'
  ]
  
  const stations = await Promise.all(
    workCenters.map((wc, index) =>
      prisma.station.create({
        data: {
          code: stationCodes[index],
          name: `${wc.name} Station 1`,
          workCenterId: wc.id
        }
      })
    )
  )

  console.log('Creating users...')
  const riggingDept = departments.find(d => d.name === 'Hull Rigging')!
  
  await prisma.user.createMany({
    data: [
      {
        email: 'admin@cri.local',
        passwordHash: await hashPassword('Admin123!'),
        role: Role.ADMIN
      },
      {
        email: 'supervisor@cri.local',
        passwordHash: await hashPassword('Supervisor123!'),
        role: Role.SUPERVISOR,
        departmentId: riggingDept.id
      },
      {
        email: 'operator@cri.local',
        passwordHash: await hashPassword('Operator123!'),
        role: Role.OPERATOR,
        departmentId: riggingDept.id
      }
    ]
  })

  console.log('Creating routing version...')
  const routingVersion = await prisma.routingVersion.create({
    data: {
      model: 'LX24',
      trim: 'Base',
      featuresJson: {},
      version: 1,
      status: RoutingVersionStatus.RELEASED,
      releasedAt: new Date()
    }
  })

  console.log('Creating routing stages...')
  const standardTimes = [
    120, 240, 180, 150, 90, 120, 180, 60, 90, 60, 30
  ] // minutes converted to seconds
  
  const routingStages = await Promise.all(
    workCenters.map((wc, index) =>
      prisma.routingStage.create({
        data: {
          routingVersionId: routingVersion.id,
          sequence: index + 1,
          code: departmentNames[index].toUpperCase().replace(' ', '_'),
          name: departmentNames[index],
          enabled: true,
          workCenterId: wc.id,
          standardStageSeconds: standardTimes[index] * 60
        }
      })
    )
  )

  console.log('Creating test work order...')
  const specSnapshot = {
    model: 'LX24',
    trim: 'Base',
    features: {},
    routingVersionId: routingVersion.id,
    stages: routingStages.map(rs => ({
      code: rs.code,
      name: rs.name,
      sequence: rs.sequence
    }))
  }

  await prisma.workOrder.create({
    data: {
      number: 'WO-1001',
      hullId: 'HULL-TEST-001',
      productSku: 'LX24-BASE',
      qty: 1,
      routingVersionId: routingVersion.id,
      specSnapshot
    }
  })

  console.log('Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '@new-szn/db'

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i !== -1 ? process.argv[i + 1] : undefined
}

async function main() {
  const email = arg('--email')
  const name = arg('--name')
  const password = arg('--password')

  if (!email || !name || !password) {
    console.error(
      'Usage: npx tsx apps/api/src/scripts/create-admin.ts --email <email> --name "<name>" --password <password>'
    )
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    console.error(`User with email "${email}" already exists.`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { email, name, role: 'ADMIN', passwordHash, isActive: true },
  })

  console.log(`Admin created: ${user.name} (${user.email})`)
  console.log(`ID: ${user.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.user.findUnique({where:{email:"admin@newsznagency.com"}})
  .then(u => console.log(JSON.stringify(u, (k, v) => k === 'passwordHash' ? '***' : v, 2)))
  .catch(e => console.error(e))
  .finally(() => p.$disconnect())

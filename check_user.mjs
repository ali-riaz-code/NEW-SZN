import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })
const p = new PrismaClient()
p.user.findUnique({where:{email:"admin@newsznagency.com"}, select:{id:true,email:true,name:true,role:true,isActive:true,passwordHash:true}})
  .then(u => console.log(JSON.stringify(u, null, 2)))
  .catch(e => console.error(e.message))
  .finally(() => p.$disconnect())

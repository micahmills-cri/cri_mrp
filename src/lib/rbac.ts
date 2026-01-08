import { Role } from '@prisma/client'
import { JWTPayload } from './auth'

export function hasRole(user: JWTPayload, role: Role): boolean {
  return user.role === role
}

export function isAdmin(user: JWTPayload): boolean {
  return user.role === Role.ADMIN
}

export function isSupervisor(user: JWTPayload): boolean {
  return user.role === Role.SUPERVISOR
}

export function isOperator(user: JWTPayload): boolean {
  return user.role === Role.OPERATOR
}

export function canAccessOperatorConsole(user: JWTPayload): boolean {
  return user.role === Role.OPERATOR || user.role === Role.SUPERVISOR || user.role === Role.ADMIN
}

export function canAccessSupervisorDashboard(user: JWTPayload): boolean {
  return user.role === Role.SUPERVISOR || user.role === Role.ADMIN
}

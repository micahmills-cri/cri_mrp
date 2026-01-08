import { describe, it, expect } from 'vitest'
import {
  isAdmin,
  isSupervisor,
  isOperator,
  canAccessOperatorConsole,
  canAccessSupervisorDashboard,
  hasRole,
} from '../rbac'
import { Role } from '@prisma/client'
import type { JwtPayload } from '../auth'

describe('RBAC', () => {
  const adminUser: JwtPayload = {
    userId: '1',
    role: Role.ADMIN,
    departmentId: 'dept-1',
  }

  const supervisorUser: JwtPayload = {
    userId: '2',
    role: Role.SUPERVISOR,
    departmentId: 'dept-1',
  }

  const operatorUser: JwtPayload = {
    userId: '3',
    role: Role.OPERATOR,
    departmentId: 'dept-1',
  }

  describe('Role Checking', () => {
    it('should identify admin correctly', () => {
      expect(isAdmin(adminUser)).toBe(true)
      expect(isAdmin(supervisorUser)).toBe(false)
      expect(isAdmin(operatorUser)).toBe(false)
    })

    it('should identify supervisor correctly', () => {
      expect(isSupervisor(adminUser)).toBe(false)
      expect(isSupervisor(supervisorUser)).toBe(true)
      expect(isSupervisor(operatorUser)).toBe(false)
    })

    it('should identify operator correctly', () => {
      expect(isOperator(adminUser)).toBe(false)
      expect(isOperator(supervisorUser)).toBe(false)
      expect(isOperator(operatorUser)).toBe(true)
    })

    it('should check specific roles', () => {
      expect(hasRole(adminUser, Role.ADMIN)).toBe(true)
      expect(hasRole(adminUser, Role.SUPERVISOR)).toBe(false)
      expect(hasRole(supervisorUser, Role.SUPERVISOR)).toBe(true)
      expect(hasRole(operatorUser, Role.OPERATOR)).toBe(true)
    })
  })

  describe('Access Control', () => {
    it('should allow correct roles to access operator console', () => {
      expect(canAccessOperatorConsole(adminUser)).toBe(true)
      expect(canAccessOperatorConsole(supervisorUser)).toBe(true)
      expect(canAccessOperatorConsole(operatorUser)).toBe(true)
    })

    it('should allow correct roles to access supervisor dashboard', () => {
      expect(canAccessSupervisorDashboard(adminUser)).toBe(true)
      expect(canAccessSupervisorDashboard(supervisorUser)).toBe(true)
      expect(canAccessSupervisorDashboard(operatorUser)).toBe(false)
    })
  })
})

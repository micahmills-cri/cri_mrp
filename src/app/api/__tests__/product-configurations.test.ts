import { NextRequest } from 'next/server'
import { describe, beforeEach, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'

const {
  getUserFromRequestMock,
  listSectionsMock,
  upsertSectionMock,
  upsertComponentMock,
  upsertOptionMock,
} = vi.hoisted(() => ({
  getUserFromRequestMock: vi.fn(),
  listSectionsMock: vi.fn(),
  upsertSectionMock: vi.fn(),
  upsertComponentMock: vi.fn(),
  upsertOptionMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getUserFromRequest: getUserFromRequestMock,
}))

vi.mock('@/server/product-config/productConfigurations', () => ({
  listProductConfigurationSections: listSectionsMock,
  upsertProductConfigurationSection: upsertSectionMock,
  upsertProductConfigurationComponent: upsertComponentMock,
  upsertProductConfigurationOption: upsertOptionMock,
}))

import { GET as listRoute } from '../product-configurations/[modelId]/route'
import { POST as createSection } from '../product-configurations/sections/route'
import { POST as createComponent } from '../product-configurations/components/route'
import { POST as createOption } from '../product-configurations/options/route'

function buildRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('Product configuration routes', () => {
  beforeEach(() => {
    getUserFromRequestMock.mockReset()
    listSectionsMock.mockReset()
    upsertSectionMock.mockReset()
    upsertComponentMock.mockReset()
    upsertOptionMock.mockReset()
  })

  describe('GET /api/product-configurations/[modelId]', () => {
    it('returns configuration sections for supervisors', async () => {
      getUserFromRequestMock.mockReturnValue({ userId: 'u1', role: 'SUPERVISOR' })
      listSectionsMock.mockResolvedValue([{ id: 'section-1', name: 'Electrical', components: [] }])

      const response = await listRoute(
        buildRequest('GET', 'https://example.com/api/product-configurations/model-1?trimId=trim-1'),
        { params: { modelId: 'model-1' } }
      )

      expect(response.status).toBe(200)
      const payload = await response.json()
      expect(payload).toEqual({
        ok: true,
        data: [{ id: 'section-1', name: 'Electrical', components: [] }],
      })
      expect(listSectionsMock).toHaveBeenCalledWith({ modelId: 'model-1', trimId: 'trim-1' })
    })

    it('returns 400 when query validation fails', async () => {
      getUserFromRequestMock.mockReturnValue({ userId: 'u1', role: 'ADMIN' })

      const response = await listRoute(
        buildRequest('GET', 'https://example.com/api/product-configurations/model-1?trimId='),
        { params: { modelId: 'model-1' } }
      )

      expect(response.status).toBe(400)
      const payload = await response.json()
      expect(payload.ok).toBe(false)
      expect(payload.error).toBe('Invalid query parameters')
      expect(listSectionsMock).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/product-configurations/sections', () => {
    it('creates a section for admins', async () => {
      getUserFromRequestMock.mockReturnValue({ userId: 'u1', role: 'ADMIN' })
      upsertSectionMock.mockResolvedValue({ id: 'section-1', name: 'Electrical' })

      const response = await createSection(
        buildRequest('POST', 'https://example.com/api/product-configurations/sections', {
          productModelId: 'model-1',
          code: 'ELEC',
          name: 'Electrical',
          sortOrder: 1,
          isRequired: true,
        })
      )

      expect(response.status).toBe(200)
      const payload = await response.json()
      expect(payload).toEqual({ ok: true, data: { id: 'section-1', name: 'Electrical' } })
      expect(upsertSectionMock).toHaveBeenCalledWith({
        productModelId: 'model-1',
        code: 'ELEC',
        name: 'Electrical',
        sortOrder: 1,
        isRequired: true,
      })
    })

    it('returns 400 when validation fails', async () => {
      getUserFromRequestMock.mockReturnValue({ userId: 'u1', role: 'ADMIN' })
      upsertSectionMock.mockRejectedValue(
        new ZodError([
          {
            code: 'custom',
            path: ['code'],
            message: 'Required',
          },
        ])
      )

      const response = await createSection(
        buildRequest('POST', 'https://example.com/api/product-configurations/sections', {})
      )

      expect(response.status).toBe(400)
      const payload = await response.json()
      expect(payload.ok).toBe(false)
      expect(payload.error).toBe('Invalid request body')
    })
  })

  describe('POST /api/product-configurations/components', () => {
    it('creates a component for admins', async () => {
      getUserFromRequestMock.mockReturnValue({ userId: 'u1', role: 'ADMIN' })
      upsertComponentMock.mockResolvedValue({ id: 'component-1', name: 'Battery' })

      const response = await createComponent(
        buildRequest('POST', 'https://example.com/api/product-configurations/components', {
          sectionId: 'section-1',
          code: 'BAT',
          name: 'Battery',
          isRequired: true,
          allowMultiple: false,
          sortOrder: 1,
        })
      )

      expect(response.status).toBe(200)
      const payload = await response.json()
      expect(payload).toEqual({ ok: true, data: { id: 'component-1', name: 'Battery' } })
      expect(upsertComponentMock).toHaveBeenCalledWith({
        sectionId: 'section-1',
        code: 'BAT',
        name: 'Battery',
        isRequired: true,
        allowMultiple: false,
        sortOrder: 1,
      })
    })

    it('returns 400 when validation fails', async () => {
      getUserFromRequestMock.mockReturnValue({ userId: 'u1', role: 'ADMIN' })
      upsertComponentMock.mockRejectedValue(
        new ZodError([
          {
            code: 'custom',
            path: ['sectionId'],
            message: 'Required',
          },
        ])
      )

      const response = await createComponent(
        buildRequest('POST', 'https://example.com/api/product-configurations/components', {})
      )

      expect(response.status).toBe(400)
      const payload = await response.json()
      expect(payload.ok).toBe(false)
      expect(payload.error).toBe('Invalid request body')
    })
  })

  describe('POST /api/product-configurations/options', () => {
    it('creates an option for admins', async () => {
      getUserFromRequestMock.mockReturnValue({ userId: 'u1', role: 'ADMIN' })
      upsertOptionMock.mockResolvedValue({ id: 'option-1', name: 'AGM Battery' })

      const response = await createOption(
        buildRequest('POST', 'https://example.com/api/product-configurations/options', {
          componentId: 'component-1',
          code: 'AGM',
          name: 'AGM Battery',
          isActive: true,
          sortOrder: 1,
        })
      )

      expect(response.status).toBe(200)
      const payload = await response.json()
      expect(payload).toEqual({ ok: true, data: { id: 'option-1', name: 'AGM Battery' } })
      expect(upsertOptionMock).toHaveBeenCalledWith({
        componentId: 'component-1',
        code: 'AGM',
        name: 'AGM Battery',
        isActive: true,
        sortOrder: 1,
      })
    })

    it('returns 400 when validation fails', async () => {
      getUserFromRequestMock.mockReturnValue({ userId: 'u1', role: 'ADMIN' })
      upsertOptionMock.mockRejectedValue(
        new ZodError([
          {
            code: 'custom',
            path: ['componentId'],
            message: 'Required',
          },
        ])
      )

      const response = await createOption(
        buildRequest('POST', 'https://example.com/api/product-configurations/options', {})
      )

      expect(response.status).toBe(400)
      const payload = await response.json()
      expect(payload.ok).toBe(false)
      expect(payload.error).toBe('Invalid request body')
    })
  })
})

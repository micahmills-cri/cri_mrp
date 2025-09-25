"use client"
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export default function TestCardsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Enterprise Card Component Test</h1>
        
        {/* Basic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This is a default card with standard styling and 16px spacing.</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card has more prominent shadow for better visual hierarchy.</p>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Outlined Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card uses outline styling instead of shadow.</p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card interactive>
            <CardHeader>
              <CardTitle>Interactive Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card is clickable and has hover effects.</p>
            </CardContent>
          </Card>

          <Card disabled>
            <CardHeader>
              <CardTitle>Disabled Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card is disabled and non-interactive.</p>
            </CardContent>
          </Card>
        </div>

        {/* Card with Footer */}
        <Card variant="elevated" className="max-w-md">
          <CardHeader divider>
            <CardTitle>Manufacturing Work Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium text-slate-700">Work Order:</span>
              <span className="ml-2 text-slate-900">WO-2025-001</span>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-700">Status:</span>
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                In Progress
              </span>
            </div>
          </CardContent>
          <CardFooter divider>
            <Button variant="secondary" size="sm">View Details</Button>
            <Button variant="primary" size="sm">Update Status</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
"use client"
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card'
import { StatsCard, StatsGrid } from '../../components/ui/StatsCard'
import { Button } from '../../components/ui/Button'

export default function TestCardsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Enterprise Card Component Test</h1>
        
        {/* Stats Cards for Manufacturing Metrics */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Manufacturing KPI Dashboard</h2>
          <StatsGrid 
            columns={4}
            stats={[
              {
                value: "127",
                label: "Work Orders",
                subtitle: "Active this week",
                variant: "default",
                trend: { value: "+8%", direction: "up", label: "vs last week" },
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                )
              },
              {
                value: "94.2%",
                label: "Efficiency Rate",
                subtitle: "Production efficiency",
                variant: "success",
                trend: { value: "+2.1%", direction: "up", label: "this month" },
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                )
              },
              {
                value: "3.2h",
                label: "Avg Cycle Time",
                subtitle: "Per work order",
                variant: "warning",
                trend: { value: "+12m", direction: "down", label: "from target" },
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              },
              {
                value: "2",
                label: "Equipment Issues",
                subtitle: "Requiring attention",
                variant: "danger",
                trend: { value: "0", direction: "neutral", label: "no change" },
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )
              }
            ]}
          />
        </div>
        
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
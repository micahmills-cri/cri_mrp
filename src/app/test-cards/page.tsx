"use client"
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card'
import { StatsCard, StatsGrid } from '../../components/ui/StatsCard'
import { StatusCard, StatusGrid, StatusSummary } from '../../components/ui/StatusCard'
import { DataCard, DataGrid, QuickData } from '../../components/ui/DataCard'
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

        {/* Equipment Status Monitoring */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Equipment Status Monitoring</h2>
          <StatusGrid 
            columns={3}
            statuses={[
              {
                name: "CNC Machine #3",
                status: "operational",
                description: "Running hull fabrication cycle",
                location: "Assembly Bay A",
                lastUpdated: "2 minutes ago",
                details: [
                  { label: "Current Job", value: "WO-2025-001" },
                  { label: "Progress", value: "78%" },
                  { label: "Cycle Time", value: "2.3 hrs" }
                ]
              },
              {
                name: "Hydraulic Press #1",
                status: "warning",
                description: "Temperature slightly elevated",
                location: "Forming Section",
                lastUpdated: "5 minutes ago",
                details: [
                  { label: "Temperature", value: "195°F" },
                  { label: "Max Temp", value: "200°F" },
                  { label: "Operating Hours", value: "47.2" }
                ]
              },
              {
                name: "Paint Booth #2",
                status: "maintenance",
                description: "Scheduled maintenance in progress",
                location: "Finishing Bay",
                lastUpdated: "15 minutes ago",
                details: [
                  { label: "Maintenance Type", value: "Filter Change" },
                  { label: "Expected Completion", value: "2:30 PM" },
                  { label: "Next Service", value: "30 days" }
                ]
              },
              {
                name: "Quality Scanner",
                status: "error",
                description: "Calibration failed - requires attention",
                location: "QC Station #4",
                lastUpdated: "1 hour ago",
                details: [
                  { label: "Error Code", value: "CAL-001" },
                  { label: "Last Successful", value: "Yesterday" },
                  { label: "Priority", value: "High" }
                ]
              },
              {
                name: "Fiber Cutter #5",
                status: "offline",
                description: "Powered down for blade replacement",
                location: "Material Prep",
                lastUpdated: "3 hours ago",
                details: [
                  { label: "Reason", value: "Blade Replacement" },
                  { label: "Estimated Return", value: "Tomorrow 8 AM" },
                  { label: "Backup Unit", value: "Active" }
                ]
              },
              {
                name: "3D Printer #A",
                status: "pending",
                description: "Awaiting material delivery",
                location: "Prototyping Lab",
                lastUpdated: "30 minutes ago",
                details: [
                  { label: "Material Needed", value: "Carbon Fiber" },
                  { label: "Delivery ETA", value: "4:00 PM" },
                  { label: "Queue Position", value: "2nd" }
                ]
              }
            ]}
          />
        </div>

        {/* Status Summary Dashboard */}
        <div className="mb-12">
          <StatusSummary
            title="Factory Equipment Overview"
            statusCounts={[
              { status: 'operational', count: 12, label: 'Operational' },
              { status: 'warning', count: 3, label: 'Warning' },
              { status: 'maintenance', count: 2, label: 'Maintenance' },
              { status: 'error', count: 1, label: 'Error' },
              { status: 'offline', count: 2, label: 'Offline' },
              { status: 'pending', count: 1, label: 'Pending' }
            ]}
          />
        </div>

        {/* Work Order Data Cards */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Work Order Management</h2>
          <DataGrid 
            columns={2}
            dataCards={[
              {
                title: "WO-2025-001",
                subtitle: "Sport Fishing Boat - 32ft",
                priority: "high",
                progress: {
                  percentage: 67,
                  label: "Production Progress",
                  currentStep: "Hull Assembly",
                  currentStepNumber: 4,
                  totalSteps: 6
                },
                sections: [
                  {
                    title: "Order Details",
                    fields: [
                      { label: "Product", value: "Sport Fisher 32", highlight: true },
                      { label: "Hull ID", value: "SF32-2025-001" },
                      { label: "Quantity", value: "1" },
                      { label: "Customer", value: "Marina Bay Yacht Club" }
                    ],
                    divider: true
                  },
                  {
                    title: "Current Status",
                    fields: [
                      { label: "Current Stage", value: "Hull Assembly", variant: "info" },
                      { label: "Assigned Station", value: "Assembly Bay A" },
                      { label: "Operator", value: "John Smith" },
                      { label: "Started", value: "2 hours ago" }
                    ],
                    divider: true
                  },
                  {
                    title: "Quality & Performance",
                    fields: [
                      { label: "Quality Score", value: "98.5%", variant: "success" },
                      { label: "On-Time Status", value: "On Track", variant: "success" },
                      { label: "Completion Est.", value: "Dec 15, 2024" }
                    ]
                  }
                ],
                actions: (
                  <>
                    <Button variant="secondary" size="sm">View Details</Button>
                    <Button variant="primary" size="sm">Update Status</Button>
                  </>
                )
              },
              {
                title: "WO-2025-002",
                subtitle: "Center Console - 28ft",
                priority: "urgent",
                progress: {
                  percentage: 23,
                  label: "Production Progress", 
                  currentStep: "Material Preparation",
                  currentStepNumber: 2,
                  totalSteps: 7
                },
                sections: [
                  {
                    title: "Order Details",
                    fields: [
                      { label: "Product", value: "Center Console 28", highlight: true },
                      { label: "Hull ID", value: "CC28-2025-002" },
                      { label: "Quantity", value: "2" },
                      { label: "Customer", value: "Ocean Adventures LLC" }
                    ],
                    divider: true
                  },
                  {
                    title: "Current Status",
                    fields: [
                      { label: "Current Stage", value: "Material Prep", variant: "warning" },
                      { label: "Assigned Station", value: "Material Storage" },
                      { label: "Operator", value: "Sarah Connor" },
                      { label: "Started", value: "45 minutes ago" }
                    ],
                    divider: true
                  },
                  {
                    title: "Issues & Alerts",
                    fields: [
                      { label: "Material Delay", value: "Carbon Fiber", variant: "danger" },
                      { label: "Expected Delivery", value: "Tomorrow 9 AM" },
                      { label: "Impact", value: "2 day delay", variant: "warning" }
                    ]
                  }
                ],
                actions: (
                  <>
                    <Button variant="outline" size="sm">Contact Supplier</Button>
                    <Button variant="primary" size="sm">Escalate Issue</Button>
                  </>
                )
              }
            ]}
          />
        </div>

        {/* Quick Data Examples */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Quick Information Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickData
              title="Today's Production"
              data={{
                "Work Orders Started": 8,
                "Work Orders Completed": 5,
                "Quality Inspections": 12,
                "Material Deliveries": 3
              }}
            />
            <QuickData
              title="Equipment Utilization"
              variant="outlined"
              data={{
                "CNC Machines": "87%",
                "Assembly Stations": "92%",
                "Quality Stations": "68%",
                "Paint Booths": "45%"
              }}
            />
            <QuickData
              title="Inventory Status"
              data={{
                "Carbon Fiber": "Low Stock",
                "Resin": "Adequate",
                "Hardware": "Overstocked",
                "Electronics": "Normal"
              }}
            />
          </div>
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
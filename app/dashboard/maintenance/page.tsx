'use client'

// Maintenance page accessible at /dashboard/maintenance
// Redirecting via router was slow; rendering the component directly is much faster.
import MaintenanceContent from '@/app/dashboard/hrd/maintenance/page'

export default function MaintenanceSeparatePage() {
    // MaintenanceContent already has its own RoleGuard for SUPER_ADMIN and MAINTAINER
    return <MaintenanceContent />
}

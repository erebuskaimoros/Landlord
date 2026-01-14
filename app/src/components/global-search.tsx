'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Building2,
  Building,
  Users,
  FileText,
  DollarSign,
  Search,
  Home,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SearchResult {
  id: string
  type: 'unit' | 'tenant' | 'building' | 'lease' | 'transaction'
  title: string
  subtitle?: string
}

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Units', href: '/units', icon: Building2 },
  { name: 'Buildings', href: '/buildings', icon: Building },
  { name: 'Tenants', href: '/tenants', icon: Users },
  { name: 'Leases', href: '/leases', icon: FileText },
  { name: 'Transactions', href: '/transactions', icon: DollarSign },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const supabase = createClient()

  // Listen for keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Search when query changes
  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true)
      const searchResults: SearchResult[] = []

      try {
        // Search units
        const { data: unitsData } = await supabase
          .from('units')
          .select('id, address, unit_number, status')
          .or(`address.ilike.%${query}%,unit_number.ilike.%${query}%`)
          .limit(5)

        const units = unitsData as { id: string; address: string; unit_number: string | null; status: string }[] | null
        if (units) {
          for (const unit of units) {
            searchResults.push({
              id: unit.id,
              type: 'unit',
              title: unit.unit_number ? `${unit.address} #${unit.unit_number}` : unit.address,
              subtitle: unit.status,
            })
          }
        }

        // Search tenants
        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('id, first_name, last_name, email')
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5)

        const tenants = tenantsData as { id: string; first_name: string; last_name: string; email: string | null }[] | null
        if (tenants) {
          for (const tenant of tenants) {
            searchResults.push({
              id: tenant.id,
              type: 'tenant',
              title: `${tenant.first_name} ${tenant.last_name}`,
              subtitle: tenant.email || undefined,
            })
          }
        }

        // Search buildings
        const { data: buildingsData } = await supabase
          .from('buildings')
          .select('id, name, address')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
          .limit(5)

        const buildings = buildingsData as { id: string; name: string; address: string }[] | null
        if (buildings) {
          for (const building of buildings) {
            searchResults.push({
              id: building.id,
              type: 'building',
              title: building.name,
              subtitle: building.address,
            })
          }
        }

        // Search leases by tenant name
        const { data: leasesData } = await supabase
          .from('leases')
          .select(`
            id,
            rent_amount,
            status,
            tenant:tenants(first_name, last_name),
            unit:units(address)
          `)
          .limit(10)

        type LeaseResult = {
          id: string
          rent_amount: number
          status: string
          tenant: { first_name: string; last_name: string } | null
          unit: { address: string } | null
        }
        const leases = leasesData as LeaseResult[] | null
        if (leases) {
          const lowerQuery = query.toLowerCase()
          // Filter leases where tenant name or unit address matches
          const matchingLeases = leases.filter((lease) => {
            const tenantName = lease.tenant
              ? `${lease.tenant.first_name} ${lease.tenant.last_name}`.toLowerCase()
              : ''
            const unitAddress = lease.unit?.address?.toLowerCase() || ''
            return tenantName.includes(lowerQuery) || unitAddress.includes(lowerQuery)
          }).slice(0, 5)

          for (const lease of matchingLeases) {
            const tenantName = lease.tenant
              ? `${lease.tenant.first_name} ${lease.tenant.last_name}`
              : 'Unknown Tenant'
            searchResults.push({
              id: lease.id,
              type: 'lease',
              title: `${tenantName} - ${lease.unit?.address || 'Unknown Unit'}`,
              subtitle: `$${lease.rent_amount}/mo - ${lease.status}`,
            })
          }
        }

        // Search transactions by description
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select('id, description, actual_amount, type, transaction_date')
          .ilike('description', `%${query}%`)
          .limit(5)

        type TransactionResult = {
          id: string
          description: string
          actual_amount: number
          type: string
          transaction_date: string
        }
        const transactions = transactionsData as TransactionResult[] | null
        if (transactions) {
          for (const tx of transactions) {
            const sign = tx.type === 'income' ? '+' : '-'
            const formattedDate = new Date(tx.transaction_date).toLocaleDateString()
            searchResults.push({
              id: tx.id,
              type: 'transaction',
              title: tx.description,
              subtitle: `${sign}$${tx.actual_amount.toLocaleString()} on ${formattedDate}`,
            })
          }
        }

        setResults(searchResults)
      } catch {
        console.error('Search error')
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [query, supabase])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    router.push(`/${result.type}s/${result.id}`)
  }

  const handleNavigation = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'unit':
        return Building2
      case 'tenant':
        return Users
      case 'building':
        return Building
      case 'lease':
        return FileText
      case 'transaction':
        return DollarSign
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search units, tenants, buildings, leases, transactions..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isSearching && (
            <CommandEmpty>Searching...</CommandEmpty>
          )}
          {!isSearching && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <CommandGroup heading="Search Results">
              {results.map((result) => {
                const Icon = getIcon(result.type)
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.type}-${result.title}`}
                    onSelect={() => handleSelect(result)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}

          {/* Quick Navigation - shown when no query */}
          {!query && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Quick Navigation">
                {navigationItems.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.name}
                    onSelect={() => handleNavigation(item.href)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}

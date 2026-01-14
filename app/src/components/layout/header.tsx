'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, User, Settings, Menu } from 'lucide-react'
import { GlobalSearch } from '@/components/global-search'

interface HeaderProps {
  user: {
    email?: string
    full_name?: string
  } | null
  organization: {
    name: string
  } | null
  onMenuClick?: () => void
}

export function Header({ user, organization, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user?.email?.[0].toUpperCase() || 'U'

  return (
    <header
      className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8"
      role="banner"
    >
      {/* Mobile menu button */}
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-expanded="false"
          aria-controls="mobile-sidebar"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Open sidebar</span>
        </Button>
      )}

      {/* Organization name */}
      <div className="flex flex-1 items-center gap-x-4">
        {organization && (
          <span className="hidden sm:block text-sm font-medium text-gray-900" aria-label={`Current organization: ${organization.name}`}>
            {organization.name}
          </span>
        )}
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-md" role="search" aria-label="Global search">
        <GlobalSearch />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full"
              aria-label={`User menu for ${user?.full_name || user?.email || 'user'}`}
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gray-200 text-gray-600">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                {user?.full_name && (
                  <p className="text-sm font-medium leading-none">{user.full_name}</p>
                )}
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

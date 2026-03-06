import {
  LayoutDashboard,
  LayoutGrid,
  Bot,
  Video,
  Upload,
  Smartphone,
  Handshake,
  Receipt,
  Settings2,
  Shield,
  Database,
  LogOut,
  User,
  FileDown,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { exportDashboardPDF } from '@/lib/exportUtils';

interface AgencySidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAgencySettings?: () => void;
  onSpamBlacklist?: () => void;
  onDatabase?: () => void;
  currentMemberName?: string;
  isAdmin?: boolean;
  onLogout?: () => void;
  pendingTasksCount?: number;
  pendingCreativesCount?: number;
}

const mainNavItems = [
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'tasks', label: 'Tasks', icon: LayoutGrid },
  { value: 'ai', label: 'AI', icon: Bot },
  { value: 'meetings', label: 'Meetings', icon: Video },
  { value: 'creatives', label: 'Creatives', icon: Upload },
  { value: 'funnel', label: 'Funnel', icon: Smartphone },
  { value: 'deals', label: 'Deals', icon: Handshake },
];

export function AgencySidebar({
  activeTab,
  onTabChange,
  onAgencySettings,
  onSpamBlacklist,
  onDatabase,
  currentMemberName,
  isAdmin,
  onLogout,
  pendingTasksCount = 0,
  pendingCreativesCount = 0,
}: AgencySidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="HPA Dashboard">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="font-bold text-sm">HPA</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Capital Raising</span>
                <span className="truncate text-xs text-muted-foreground">Dashboard</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    isActive={activeTab === item.value}
                    onClick={() => onTabChange(item.value)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.value === 'meetings' && pendingTasksCount > 0 && (
                    <SidebarMenuBadge>{pendingTasksCount}</SidebarMenuBadge>
                  )}
                  {item.value === 'creatives' && pendingCreativesCount > 0 && (
                    <SidebarMenuBadge>{pendingCreativesCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeTab === 'billing'}
                    onClick={() => onTabChange('billing')}
                    tooltip="Billing"
                  >
                    <Receipt className="h-4 w-4" />
                    <span>Billing</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={exportDashboardPDF} tooltip="Export PDF">
                  <FileDown className="h-4 w-4" />
                  <span>Export PDF</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {onAgencySettings && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onAgencySettings} tooltip="Settings">
                    <Settings2 className="h-4 w-4" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {onSpamBlacklist && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onSpamBlacklist} tooltip="Spam Blacklist">
                    <Shield className="h-4 w-4" />
                    <span>Spam Blacklist</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {onDatabase && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onDatabase} tooltip="Database">
                    <Database className="h-4 w-4" />
                    <span>Database</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-center p-2 group-data-[collapsible=icon]:p-0">
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
          {currentMemberName && onLogout && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onLogout} tooltip={`Sign out (${currentMemberName})`}>
                <User className="h-4 w-4" />
                <span className="flex-1 truncate">{currentMemberName}</span>
                <LogOut className="h-4 w-4 ml-auto" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

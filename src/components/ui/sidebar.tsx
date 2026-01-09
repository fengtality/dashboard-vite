import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { cn } from '@/lib/utils';

// Sidebar context
interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

// Provider
interface SidebarProviderProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export function SidebarProvider({ children, defaultCollapsed = false }: SidebarProviderProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Main Sidebar
interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Sidebar({ className, children, ...props }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-screen w-64 flex-col bg-sidebar-background border-r border-sidebar-border',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

// Header
interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SidebarHeader({ className, children, ...props }: SidebarHeaderProps) {
  return (
    <div
      className={cn('flex flex-col gap-2 p-4 border-b border-sidebar-border', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Content (scrollable area)
interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SidebarContent({ className, children, ...props }: SidebarContentProps) {
  return (
    <div
      className={cn('flex-1 overflow-y-auto p-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Footer
interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SidebarFooter({ className, children, ...props }: SidebarFooterProps) {
  return (
    <div
      className={cn('p-4 border-t border-sidebar-border', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Group (collapsible section)
interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SidebarGroup({ className, children, ...props }: SidebarGroupProps) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

// Group Label
interface SidebarGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  asChild?: boolean;
}

export function SidebarGroupLabel({
  className,
  children,
  asChild = false,
  ...props
}: SidebarGroupLabelProps) {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      className={cn(
        'flex items-center justify-between px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

// Group Content
interface SidebarGroupContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SidebarGroupContent({ className, children, ...props }: SidebarGroupContentProps) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      {children}
    </div>
  );
}

// Collapsible Group
interface SidebarCollapsibleProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarCollapsible({ children, defaultOpen = true }: SidebarCollapsibleProps) {
  return (
    <CollapsiblePrimitive.Root defaultOpen={defaultOpen} className="mb-4">
      {children}
    </CollapsiblePrimitive.Root>
  );
}

export const SidebarCollapsibleTrigger = CollapsiblePrimitive.Trigger;
export const SidebarCollapsibleContent = CollapsiblePrimitive.Content;

// Menu
interface SidebarMenuProps extends React.HTMLAttributes<HTMLUListElement> {
  children: React.ReactNode;
}

export function SidebarMenu({ className, children, ...props }: SidebarMenuProps) {
  return (
    <ul className={cn('space-y-1', className)} {...props}>
      {children}
    </ul>
  );
}

// Menu Item
interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {
  children: React.ReactNode;
}

export function SidebarMenuItem({ className, children, ...props }: SidebarMenuItemProps) {
  return (
    <li className={cn('', className)} {...props}>
      {children}
    </li>
  );
}

// Menu Button
interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isActive?: boolean;
  asChild?: boolean;
}

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, children, isActive = false, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isActive && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground',
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

// Inset (main content area next to sidebar)
interface SidebarInsetProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function SidebarInset({ className, children, ...props }: SidebarInsetProps) {
  return (
    <main className={cn('flex-1 overflow-auto', className)} {...props}>
      {children}
    </main>
  );
}

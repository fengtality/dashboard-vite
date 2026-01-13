import { ExperimentProvider } from '@/components/experiment/ExperimentProvider';
import { WindowManager } from '@/components/experiment/WindowManager';
import { WindowToolbar } from '@/components/experiment/WindowToolbar';
import { Taskbar } from '@/components/experiment/Taskbar';
import { DesktopIcons } from '@/components/experiment/DesktopIcons';

export default function ExperimentPage() {
  return (
    <ExperimentProvider>
      <div className="flex flex-col h-[calc(100vh-theme(spacing.14)-theme(spacing.10))] -mx-4 md:-mx-6 -mt-4 md:-mt-6 -mb-4 md:-mb-6">
        {/* Top bar with market selector */}
        <WindowToolbar />

        {/* Desktop area with icons and windows */}
        <div className="flex-1 relative bg-muted/30 overflow-hidden">
          <DesktopIcons />
          <WindowManager />
        </div>

        {/* Bottom taskbar with Start menu */}
        <Taskbar />
      </div>
    </ExperimentProvider>
  );
}

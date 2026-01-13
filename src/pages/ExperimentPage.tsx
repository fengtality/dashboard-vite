import { ExperimentProvider } from '@/components/experiment/ExperimentProvider';
import { WindowManager, MinimizedWindowsBar } from '@/components/experiment/WindowManager';
import { WindowToolbar } from '@/components/experiment/WindowToolbar';

export default function ExperimentPage() {
  return (
    <ExperimentProvider>
      <div className="flex flex-col h-[calc(100vh-theme(spacing.14)-theme(spacing.10)-theme(spacing.8))] -mx-4 md:-mx-6 -mt-4 md:-mt-6">
        {/* Menubar */}
        <WindowToolbar />

        {/* Canvas area for windows */}
        <div className="flex-1 relative bg-muted/30 overflow-hidden">
          <WindowManager />
          <MinimizedWindowsBar />
        </div>
      </div>
    </ExperimentProvider>
  );
}

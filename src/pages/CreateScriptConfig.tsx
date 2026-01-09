import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { scripts } from '../api/client';
import type { ScriptConfig } from '../api/client';
import { Loader2, Plus, Trash2, FileCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CreateScriptConfig() {
  const [scriptList, setScriptList] = useState<string[]>([]);
  const [existingConfigs, setExistingConfigs] = useState<ScriptConfig[]>([]);
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [configName, setConfigName] = useState<string>('');
  const [configJson, setConfigJson] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  // Trigger to refresh configs list
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [scriptData, configData] = await Promise.all([
          scripts.list(),
          scripts.listConfigs(),
        ]);
        setScriptList(scriptData);
        setExistingConfigs(configData);
        if (scriptData.length > 0) {
          setSelectedScript(scriptData[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [refreshKey]);

  useEffect(() => {
    async function fetchTemplate() {
      if (!selectedScript) {
        setConfigJson('');
        return;
      }

      setLoadingTemplate(true);
      try {
        const tmpl = await scripts.getConfigTemplate(selectedScript);
        setConfigJson(JSON.stringify(tmpl, null, 2));
      } catch {
        setConfigJson('{}');
      } finally {
        setLoadingTemplate(false);
      }
    }
    fetchTemplate();
  }, [selectedScript]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configName.trim()) {
      setError('Please enter a config name');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const config = JSON.parse(configJson);
      await scripts.createOrUpdateConfig(configName, config);
      toast.success(`Script config "${configName}" created successfully`);
      setConfigName('');
      setRefreshKey(k => k + 1);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create config');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteDialog(configId: string) {
    setConfigToDelete(configId);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!configToDelete) return;

    try {
      await scripts.deleteConfig(configToDelete);
      toast.success(`Config "${configToDelete}" deleted`);
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete config');
    } finally {
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Script Configs</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage configurations for Hummingbot scripts
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/50 rounded-lg p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Existing Configs */}
      {existingConfigs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-foreground mb-4">Existing Configs</h2>
          <div className="space-y-2">
            {existingConfigs.map((config) => (
              <Card key={config.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileCode className="text-primary" size={18} />
                      <div>
                        <span className="text-foreground font-medium">{config.id}</span>
                        {config.script_name && (
                          <span className="ml-2 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                            {config.script_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(config.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Script Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Script Selection</CardTitle>
            <CardDescription>Choose a script to create a configuration for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="script">Script</Label>
              <Select value={selectedScript} onValueChange={setSelectedScript}>
                <SelectTrigger id="script">
                  <SelectValue placeholder="Select script..." />
                </SelectTrigger>
                <SelectContent>
                  {scriptList.map((script) => (
                    <SelectItem key={script} value={script}>
                      {script}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Config Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Config Name</CardTitle>
            <CardDescription>Give your configuration a unique name</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="my_script_config"
            />
          </CardContent>
        </Card>

        {/* Config JSON Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuration (JSON)</CardTitle>
            <CardDescription>Edit the configuration parameters for this script</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTemplate ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : (
              <textarea
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                rows={20}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Loading template..."
              />
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={submitting || !configName.trim() || !configJson}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              Creating...
            </>
          ) : (
            <>
              <Plus className="mr-2" size={18} />
              Create Script Config
            </>
          )}
        </Button>
      </form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Config</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete config "{configToDelete}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

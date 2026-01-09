import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { controllers } from '../api/client';
import { Loader2, Plus } from 'lucide-react';
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

export default function CreateConfig() {
  const [controllerTypes, setControllerTypes] = useState<Record<string, string[]>>({});
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedController, setSelectedController] = useState<string>('');
  const [configName, setConfigName] = useState<string>('');
  const [configJson, setConfigJson] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchControllers() {
      try {
        const data = await controllers.list();
        setControllerTypes(data);
        const types = Object.keys(data);
        if (types.length > 0) {
          setSelectedType(types[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch controllers');
      } finally {
        setLoading(false);
      }
    }
    fetchControllers();
  }, []);

  useEffect(() => {
    if (selectedType && controllerTypes[selectedType]?.length > 0) {
      setSelectedController(controllerTypes[selectedType][0]);
    } else {
      setSelectedController('');
    }
  }, [selectedType, controllerTypes]);

  useEffect(() => {
    async function fetchTemplate() {
      if (!selectedType || !selectedController) {
        setConfigJson('');
        return;
      }

      setLoadingTemplate(true);
      try {
        const tmpl = await controllers.getConfigTemplate(selectedType, selectedController);
        setConfigJson(JSON.stringify(tmpl, null, 2));
      } catch {
        setConfigJson('');
      } finally {
        setLoadingTemplate(false);
      }
    }
    fetchTemplate();
  }, [selectedType, selectedController]);

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
      await controllers.createOrUpdateConfig(configName, config);
      toast.success(`Config "${configName}" created successfully`);
      setConfigName('');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const types = Object.keys(controllerTypes);
  const controllersForType = controllerTypes[selectedType] || [];

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Create Controller Config</h1>
        <p className="text-muted-foreground mt-1">
          Create a new configuration for a trading controller
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/50 rounded-lg p-4 text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Controller Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Controller Selection</CardTitle>
            <CardDescription>Choose the controller type and specific controller</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Controller Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="controller">Controller</Label>
              <Select value={selectedController} onValueChange={setSelectedController}>
                <SelectTrigger id="controller">
                  <SelectValue placeholder="Select controller..." />
                </SelectTrigger>
                <SelectContent>
                  {controllersForType.map((controller) => (
                    <SelectItem key={controller} value={controller}>
                      {controller}
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
              placeholder="my_config_name"
            />
          </CardContent>
        </Card>

        {/* Config JSON Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuration (JSON)</CardTitle>
            <CardDescription>Edit the configuration parameters</CardDescription>
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
              Create Config
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { controllers, scripts } from '@/api/client';
import type { ControllerConfig, ScriptConfig } from '@/api/client';
import {
  Loader2,
  Zap,
  Plus,
  Settings,
  Rocket,
  Trash2,
  ChevronDown,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import * as Collapsible from '@radix-ui/react-collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatStrategyName, formatType } from '@/lib/formatting';

interface TemplateParam {
  default: unknown;
  type: string;
  required: boolean;
}

export default function StrategiesPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [controllerTypes, setControllerTypes] = useState<Record<string, string[]>>({});
  const [scriptsList, setScriptsList] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [configs, setConfigs] = useState<ControllerConfig[]>([]);
  const [scriptConfigs, setScriptConfigs] = useState<ScriptConfig[]>([]);
  const [template, setTemplate] = useState<Record<string, TemplateParam> | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);
  const [configDetails, setConfigDetails] = useState<Record<string, unknown> | null>(null);
  const [loadingConfigDetails, setLoadingConfigDetails] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isScriptType = selectedType === 'script';
  const allTypes = [...Object.keys(controllerTypes), 'script'];
  const strategiesForType = isScriptType ? scriptsList : (controllerTypes[selectedType] || []);

  // Filter configs for selected strategy
  const filteredConfigs = isScriptType
    ? scriptConfigs.filter(c => c.script_name === selectedStrategy)
    : configs.filter(c => c.controller_name === selectedStrategy);

  // Filter template params (exclude id, controller_name, controller_type, script_name)
  const templateParams = template
    ? Object.entries(template).filter(([key]) =>
        !['id', 'controller_name', 'controller_type', 'script_name'].includes(key)
      )
    : [];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [typesData, configsData, scriptsListData, scriptConfigsData] = await Promise.all([
          controllers.list(),
          controllers.listConfigs(),
          scripts.list(),
          scripts.listConfigs(),
        ]);
        setControllerTypes(typesData);
        setConfigs(configsData);
        setScriptsList(scriptsListData);
        setScriptConfigs(scriptConfigsData);

        // Default to generic type and grid_strike strategy
        if (typesData['generic']) {
          setSelectedType('generic');
          if (typesData['generic'].includes('grid_strike')) {
            setSelectedStrategy('grid_strike');
          } else if (typesData['generic'].length > 0) {
            setSelectedStrategy(typesData['generic'][0]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch strategies');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Update strategy when type changes
  useEffect(() => {
    if (strategiesForType.length > 0 && !strategiesForType.includes(selectedStrategy)) {
      setSelectedStrategy(strategiesForType[0]);
    } else if (strategiesForType.length === 0) {
      setSelectedStrategy('');
    }
  }, [selectedType, strategiesForType, selectedStrategy]);

  // Fetch template when strategy changes
  useEffect(() => {
    if (!selectedStrategy || !selectedType) {
      setTemplate(null);
      return;
    }

    async function fetchTemplate() {
      setLoadingTemplate(true);
      try {
        let templateData: Record<string, TemplateParam>;
        if (isScriptType) {
          templateData = await scripts.getConfigTemplate(selectedStrategy) as Record<string, TemplateParam>;
        } else {
          templateData = await controllers.getConfigTemplate(selectedType, selectedStrategy) as Record<string, TemplateParam>;
        }
        setTemplate(templateData);
      } catch {
        setTemplate(null);
      } finally {
        setLoadingTemplate(false);
      }
    }
    fetchTemplate();
  }, [selectedType, selectedStrategy, isScriptType]);

  // Fetch config details when expanded
  async function handleExpandConfig(configId: string) {
    if (expandedConfig === configId) {
      setExpandedConfig(null);
      setConfigDetails(null);
      return;
    }

    setExpandedConfig(configId);
    setLoadingConfigDetails(true);
    try {
      let config: Record<string, unknown>;
      if (isScriptType) {
        config = await scripts.getConfig(configId);
        // Remove id, script_name for display
        const { id, script_name, ...rest } = config;
        setConfigDetails(rest);
      } else {
        config = await controllers.getConfig(configId);
        // Remove id, controller_name, controller_type for display
        const { id, controller_name, controller_type, ...rest } = config;
        setConfigDetails(rest);
      }
    } catch {
      setConfigDetails(null);
    } finally {
      setLoadingConfigDetails(false);
    }
  }

  function handleCreateConfig() {
    if (selectedStrategy === 'grid_strike') {
      navigate('/strategies/grid-strike');
    } else {
      navigate(`/strategies/config?type=${encodeURIComponent(selectedType)}&strategy=${encodeURIComponent(selectedStrategy)}`);
    }
  }

  function handleEditConfig(configId: string) {
    if (selectedStrategy === 'grid_strike') {
      navigate(`/strategies/grid-strike?config=${encodeURIComponent(configId)}`);
    } else {
      navigate(`/strategies/config?type=${encodeURIComponent(selectedType)}&strategy=${encodeURIComponent(selectedStrategy)}&config=${encodeURIComponent(configId)}`);
    }
  }

  function handleDeploy(configId: string) {
    const typeParam = isScriptType ? 'script' : 'controller';
    navigate(`/bots/deploy?type=${typeParam}&strategy=${encodeURIComponent(selectedStrategy)}&config=${encodeURIComponent(configId)}`);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be uploaded again
    event.target.value = '';

    // Extract config name from filename (without extension)
    const configName = file.name.replace(/\.(json|yaml|yml)$/i, '');

    setUploading(true);
    try {
      const content = await file.text();
      let configData: Record<string, unknown>;

      // Parse JSON or YAML
      if (file.name.endsWith('.json')) {
        configData = JSON.parse(content);
      } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        // Simple YAML parsing - for complex YAML, would need a library
        // For now, assume JSON-compatible YAML
        configData = JSON.parse(content);
      } else {
        throw new Error('Unsupported file format. Please use .json or .yaml files.');
      }

      // Set the config id from filename
      configData.id = configName;

      // Validate required fields based on type
      if (isScriptType) {
        if (!configData.script_name) {
          configData.script_name = selectedStrategy;
        }
        // Save script config
        await scripts.createOrUpdateConfig(configName, configData);
        // Refresh configs
        const updatedConfigs = await scripts.listConfigs();
        setScriptConfigs(updatedConfigs);
      } else {
        // Set controller metadata if not present
        if (!configData.controller_name) {
          configData.controller_name = selectedStrategy;
        }
        if (!configData.controller_type) {
          configData.controller_type = selectedType;
        }
        // Save controller config
        await controllers.createOrUpdateConfig(configName, configData);
        // Refresh configs
        const updatedConfigs = await controllers.listConfigs();
        setConfigs(updatedConfigs);
      }

      toast.success(`Config "${configName}" uploaded successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload config');
    } finally {
      setUploading(false);
    }
  }

  function openDeleteDialog(configId: string) {
    setConfigToDelete(configId);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!configToDelete) return;
    try {
      if (isScriptType) {
        await scripts.deleteConfig(configToDelete);
        setScriptConfigs(prev => prev.filter(c => c.id !== configToDelete));
      } else {
        await controllers.deleteConfig(configToDelete);
        setConfigs(prev => prev.filter(c => c.id !== configToDelete));
      }
      toast.success(`Config "${configToDelete}" deleted`);
      if (expandedConfig === configToDelete) {
        setExpandedConfig(null);
        setConfigDetails(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete config');
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

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Strategies</h1>
          <p className="text-muted-foreground mt-1">
            Configure and deploy trading strategies
          </p>
        </div>
      </div>

      {/* Strategy Selector */}
      <div className="pb-4 mb-4 border-b border-border">
        <div className="flex flex-wrap items-end gap-3 md:gap-4">
          <div className="w-36 md:w-48">
            <Label htmlFor="select-type" className="text-xs text-muted-foreground mb-1.5 block">Strategy Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger id="select-type">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {allTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 md:w-56">
            <Label htmlFor="select-strategy" className="text-xs text-muted-foreground mb-1.5 block">Strategy</Label>
            <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
              <SelectTrigger id="select-strategy">
                <SelectValue placeholder="Select strategy..." />
              </SelectTrigger>
              <SelectContent>
                {strategiesForType.map((strategy) => (
                  <SelectItem key={strategy} value={strategy}>
                    {strategy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Selected Strategy Details */}
      {selectedStrategy && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-semibold">{formatStrategyName(selectedStrategy)}</h2>
                <p className="text-sm text-muted-foreground">{selectedType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                <span className="hidden sm:inline ml-1">Upload</span>
              </Button>
              <Button size="sm" onClick={handleCreateConfig}>
                <Plus size={16} />
                <span className="hidden sm:inline ml-1">New Config</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Parameters Table */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-3">
                Parameters
              </div>
              {loadingTemplate ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-muted-foreground" size={20} />
                </div>
              ) : templateParams.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                  No parameters available
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="text-xs">Parameter</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templateParams.map(([key, param]) => (
                        <TableRow key={key} className="border-b border-border last:border-0">
                          <TableCell className="font-mono text-xs py-2">{key}</TableCell>
                          <TableCell className="text-xs py-2 text-muted-foreground">
                            {formatType(param.type)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Configs List */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-3">
                Saved Configurations ({filteredConfigs.length})
              </div>
              {filteredConfigs.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                  No saved configurations
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConfigs.map((config) => (
                    <Collapsible.Root
                      key={config.id}
                      open={expandedConfig === config.id}
                      onOpenChange={() => handleExpandConfig(config.id)}
                    >
                      <div className="border border-border rounded-lg overflow-hidden">
                        <Collapsible.Trigger asChild>
                          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <Settings size={14} className="text-muted-foreground" />
                              <span className="font-medium text-sm">{config.id}</span>
                              {typeof config.trading_pair === 'string' && (
                                <Badge variant="secondary" className="text-xs">
                                  {config.trading_pair}
                                </Badge>
                              )}
                            </div>
                            <ChevronDown
                              size={16}
                              className={cn(
                                'text-muted-foreground transition-transform duration-200',
                                expandedConfig === config.id && 'rotate-180'
                              )}
                            />
                          </div>
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                          <div className="border-t border-border bg-muted/30 p-3">
                            {loadingConfigDetails ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="animate-spin text-muted-foreground" size={16} />
                              </div>
                            ) : configDetails ? (
                              <>
                                <div className="bg-background rounded-lg p-3 font-mono text-xs space-y-1 max-h-48 overflow-auto mb-3">
                                  {(() => {
                                    // Sort config entries by template key order
                                    const templateKeys = template ? Object.keys(template) : [];
                                    const entries = Object.entries(configDetails);
                                    const sortedEntries = entries.sort((a, b) => {
                                      const aIndex = templateKeys.indexOf(a[0]);
                                      const bIndex = templateKeys.indexOf(b[0]);
                                      // Keys in template come first, in template order
                                      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                      if (aIndex !== -1) return -1;
                                      if (bIndex !== -1) return 1;
                                      return 0; // Keep original order for keys not in template
                                    });
                                    return sortedEntries.map(([key, value]) => (
                                      <div key={key}>
                                        <span className="text-muted-foreground">{key}:</span>{' '}
                                        <span className="text-foreground">
                                          {value === null ? 'null' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </span>
                                      </div>
                                    ));
                                  })()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditConfig(config.id)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleDeploy(config.id)}
                                  >
                                    <Rocket size={14} className="mr-1" />
                                    Deploy
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteDialog(config.id)}
                                    className="text-destructive hover:text-destructive ml-auto"
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground text-center py-2">
                                Failed to load config details
                              </div>
                            )}
                          </div>
                        </Collapsible.Content>
                      </div>
                    </Collapsible.Root>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

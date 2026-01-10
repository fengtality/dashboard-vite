import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

interface TemplateParam {
  default: unknown;
  type: string;
  required: boolean;
}

function formatStrategyName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatType(typeStr: string | undefined | null): string {
  if (!typeStr) return 'unknown';
  // Extract just the type name from "<class 'xxx'>" format
  const match = typeStr.match(/<class '([^']+)'>/);
  if (match) {
    const typeName = match[1];
    // Simplify common types
    if (typeName === 'str') return 'string';
    if (typeName === 'bool') return 'boolean';
    if (typeName === 'int') return 'integer';
    if (typeName === 'float' || typeName === 'decimal.Decimal') return 'number';
    // Return last part of dotted names
    return typeName.split('.').pop() || typeName;
  }
  // Handle typing.List[...] format
  if (typeStr.startsWith('typing.')) {
    return typeStr.replace('typing.', '');
  }
  return typeStr;
}

export default function StrategiesPage() {
  const navigate = useNavigate();
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

        // Default to generic type
        if (typesData['generic']) {
          setSelectedType('generic');
          if (typesData['generic'].length > 0) {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Strategies</h1>
        <p className="text-muted-foreground mt-1">
          Configure and deploy trading strategies
        </p>
      </div>

      {/* Strategy Selector */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Strategy</CardTitle>
          <CardDescription>
            Choose a strategy type and name to view its configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="select-type">Strategy Type</Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="select-strategy">Strategy</Label>
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
        </CardContent>
      </Card>

      {/* Selected Strategy Details */}
      {selectedStrategy && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap size={20} className="text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{formatStrategyName(selectedStrategy)}</CardTitle>
                  <CardDescription className="mt-1">
                    {selectedType}
                  </CardDescription>
                </div>
              </div>
              <Button onClick={handleCreateConfig}>
                <Plus size={16} className="mr-1" />
                New Config
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 gap-6">
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
                  <div className="rounded-lg overflow-hidden border border-border/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50 hover:bg-transparent">
                          <TableHead className="text-xs">Parameter</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templateParams.map(([key, param]) => (
                          <TableRow key={key} className="border-b border-border/50 last:border-0">
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
                        <div className="border border-border/50 rounded-lg overflow-hidden">
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
                            <div className="border-t border-border/50 bg-muted/30 p-3">
                              {loadingConfigDetails ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="animate-spin text-muted-foreground" size={16} />
                                </div>
                              ) : configDetails ? (
                                <>
                                  <div className="bg-background rounded-lg p-3 font-mono text-xs space-y-1 max-h-48 overflow-auto mb-3">
                                    {Object.entries(configDetails).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="text-muted-foreground">{key}:</span>{' '}
                                        <span className="text-foreground">
                                          {value === null ? 'null' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </span>
                                      </div>
                                    ))}
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
          </CardContent>
        </Card>
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

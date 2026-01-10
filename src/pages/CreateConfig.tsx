import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { controllers, scripts } from '../api/client';
import type { ControllerConfig, ScriptConfig } from '../api/client';
import { Loader2, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { ConfigModeToggle } from '@/components/config-mode-toggle';
import { ExistingConfigsList } from '@/components/existing-configs-list';
import { SaveConfigCard } from '@/components/save-config-card';

// Generate random config name
const adjectives = [
  'swift', 'bold', 'calm', 'bright', 'quick', 'wild', 'gentle', 'fierce',
  'silent', 'deep', 'warm', 'cool', 'sharp', 'soft', 'steady',
  'rapid', 'smooth', 'light', 'fast', 'keen', 'prime', 'grand', 'noble',
];
const colors = [
  'red', 'blue', 'green', 'gold', 'silver', 'bronze', 'amber', 'jade',
  'ruby', 'coral', 'ivory', 'onyx', 'pearl', 'cyan', 'lime', 'pink',
];
function generateRandomConfigName(controllerName: string): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const name = controllerName.replace(/_/g, '');
  return `${adj}-${color}-${name}`;
}

interface TemplateField {
  default: unknown;
  type: string;
  required?: boolean;
  client_data?: {
    prompt?: string;
    prompt_on_new?: boolean;
  };
}

interface FormField {
  key: string;
  value: string;
  type: string;
  required: boolean;
  prompt?: string;
}

export default function CreateConfig() {
  const navigate = useNavigate();
  const [controllerTypes, setControllerTypes] = useState<Record<string, string[]>>({});
  const [scriptsList, setScriptsList] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>('generic');
  const [selectedController, setSelectedController] = useState<string>('');
  const [configId, setConfigId] = useState<string>('');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [existingConfigs, setExistingConfigs] = useState<ControllerConfig[]>([]);
  const [existingScriptConfigs, setExistingScriptConfigs] = useState<ScriptConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [loading, setLoading] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'save' | 'deploy'>('save');
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check if script type is selected
  const isScriptType = selectedType === 'script';

  // Get generic controllers for Create mode
  const genericControllers = controllerTypes['generic'] || [];

  // Get all strategy types (controller types + script)
  const allTypes = [...Object.keys(controllerTypes), 'script'];

  // Get strategies for selected type
  const strategiesForType = isScriptType ? scriptsList : (controllerTypes[selectedType] || []);

  // Filter existing configs by selected type and strategy
  const filteredConfigs = isScriptType
    ? existingScriptConfigs.filter((c) => {
        if (selectedController && c.script_name !== selectedController) return false;
        return true;
      })
    : existingConfigs.filter((c) => {
        if (selectedType && c.controller_type !== selectedType) return false;
        if (selectedController && c.controller_name !== selectedController) return false;
        return true;
      });

  // Load controller types, scripts, and existing configs
  useEffect(() => {
    async function fetchData() {
      try {
        const [typesData, configsData, scriptsListData, scriptConfigsData] = await Promise.all([
          controllers.list(),
          controllers.listConfigs(),
          scripts.list(),
          scripts.listConfigs(),
        ]);
        setControllerTypes(typesData);
        setExistingConfigs(configsData);
        setScriptsList(scriptsListData);
        setExistingScriptConfigs(scriptConfigsData);

        // Default to generic type
        if (!selectedType && typesData['generic']) {
          setSelectedType('generic');
        }

        // Default to first generic controller in Create mode
        if (mode === 'create' && typesData['generic']?.length > 0 && !selectedController) {
          setSelectedController(typesData['generic'][0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [refreshKey]);

  // Set default strategy when type changes (Edit mode)
  useEffect(() => {
    if (mode === 'edit') {
      if (isScriptType) {
        if (scriptsList.length > 0) {
          if (!selectedController || !scriptsList.includes(selectedController)) {
            setSelectedController(scriptsList[0]);
          }
        } else {
          setSelectedController('');
        }
      } else if (selectedType && controllerTypes[selectedType]?.length > 0) {
        if (!selectedController || !controllerTypes[selectedType].includes(selectedController)) {
          setSelectedController(controllerTypes[selectedType][0]);
        }
      } else {
        setSelectedController('');
      }
    }
  }, [selectedType, controllerTypes, scriptsList, mode, isScriptType]);

  // Fetch template when strategy changes (Create mode only, or when editing)
  useEffect(() => {
    async function fetchTemplate() {
      if (!selectedController) {
        setFormFields([]);
        return;
      }

      setLoadingTemplate(true);
      try {
        let template: Record<string, TemplateField>;
        const skipFields = isScriptType
          ? ['id', 'script_name']
          : ['id', 'controller_name', 'controller_type'];

        if (isScriptType) {
          template = await scripts.getConfigTemplate(selectedController) as Record<string, TemplateField>;
        } else {
          const type = mode === 'create' ? 'generic' : selectedType;
          template = await controllers.getConfigTemplate(type, selectedController) as Record<string, TemplateField>;
        }

        // Convert template to form fields
        const fields: FormField[] = [];
        for (const [key, field] of Object.entries(template)) {
          if (skipFields.includes(key)) continue;

          let defaultValue = '';
          if (field.default !== null && field.default !== undefined) {
            if (typeof field.default === 'object') {
              defaultValue = JSON.stringify(field.default);
            } else {
              defaultValue = String(field.default);
            }
          }

          fields.push({
            key,
            value: defaultValue,
            type: field.type || 'string',
            required: field.required || false,
            prompt: field.client_data?.prompt,
          });
        }

        setFormFields(fields);
        if (!editingConfig) {
          setConfigId(generateRandomConfigName(selectedController));
        }
      } catch {
        setFormFields([]);
      } finally {
        setLoadingTemplate(false);
      }
    }

    // Only fetch template in create mode, or when editing a config
    if (mode === 'create' || editingConfig) {
      fetchTemplate();
    }
  }, [selectedType, selectedController, editingConfig, mode, isScriptType]);

  function resetForm() {
    setEditingConfig(null);
    setConfigId(selectedController ? generateRandomConfigName(selectedController) : '');
    setRefreshKey((k) => k + 1);
  }

  function handleModeChange(newMode: 'create' | 'edit') {
    setMode(newMode);
    if (newMode === 'create') {
      setSelectedType('generic');
      if (genericControllers.length > 0) {
        setSelectedController(genericControllers[0]);
      }
      resetForm();
    } else {
      // Edit mode - keep current selections or default
      setEditingConfig(null);
      setFormFields([]);
    }
  }

  function updateFieldValue(key: string, value: string) {
    setFormFields((prev) => prev.map((f) => f.key === key ? { ...f, value } : f));
  }

  async function loadConfigForEditing(configIdToLoad: string) {
    try {
      let config: Record<string, unknown>;

      if (isScriptType) {
        config = await scripts.getConfig(configIdToLoad);
        setEditingConfig(configIdToLoad);
        setConfigId(configIdToLoad);
        if (config.script_name) {
          setSelectedController(String(config.script_name));
        }
      } else {
        config = await controllers.getConfig(configIdToLoad);
        setEditingConfig(configIdToLoad);
        setConfigId(configIdToLoad);
        if (config.controller_type) {
          setSelectedType(String(config.controller_type));
        }
        if (config.controller_name) {
          setSelectedController(String(config.controller_name));
        }
      }

      // Wait for template to load, then update fields
      setTimeout(() => {
        setFormFields((prev) => prev.map((field) => {
          const configValue = config[field.key];
          if (configValue !== undefined && configValue !== null) {
            const value = typeof configValue === 'object'
              ? JSON.stringify(configValue)
              : String(configValue);
            return { ...field, value };
          }
          return field;
        }));
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    }
  }

  function openDeleteDialog(id: string) {
    setConfigToDelete(id);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!configToDelete) return;
    try {
      if (isScriptType) {
        await scripts.deleteConfig(configToDelete);
      } else {
        await controllers.deleteConfig(configToDelete);
      }
      toast.success(`Config "${configToDelete}" deleted`);
      if (editingConfig === configToDelete) {
        resetForm();
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete config');
    } finally {
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    }
  }

  async function handleSubmit(action: 'save' | 'deploy') {
    if (!configId.trim()) {
      setError('Please enter a config name');
      return;
    }

    setSubmitting(true);
    setSubmittingAction(action);
    setError(null);

    try {
      // Build config object from form fields
      const config: Record<string, unknown> = {
        id: configId,
      };

      if (isScriptType) {
        config.script_name = selectedController;
      } else {
        const type = mode === 'create' ? 'generic' : selectedType;
        config.controller_name = selectedController;
        config.controller_type = type;
      }

      for (const field of formFields) {
        if (field.value === '') {
          config[field.key] = null;
          continue;
        }

        // Try to parse as JSON for objects/arrays, otherwise use string or number
        try {
          if (field.value.startsWith('{') || field.value.startsWith('[')) {
            config[field.key] = JSON.parse(field.value);
          } else if (field.type === 'boolean') {
            config[field.key] = field.value === 'true';
          } else if (field.type === 'integer' || field.type === 'number') {
            config[field.key] = parseFloat(field.value);
          } else {
            config[field.key] = field.value;
          }
        } catch {
          config[field.key] = field.value;
        }
      }

      if (isScriptType) {
        await scripts.createOrUpdateConfig(configId, config);
      } else {
        await controllers.createOrUpdateConfig(configId, config);
      }

      if (editingConfig) {
        toast.success(`Config "${configId}" updated successfully`);
      } else {
        toast.success(`Config "${configId}" created successfully`);
      }

      if (action === 'deploy') {
        const typeParam = isScriptType ? 'script' : 'controller';
        navigate(`/bots/deploy?type=${typeParam}&strategy=${encodeURIComponent(selectedController)}&config=${encodeURIComponent(configId)}`);
      } else {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
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

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <SlidersHorizontal size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Strategy Configs</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Create and manage configurations for trading controllers.
        </p>
      </div>

      {/* Mode Toggle */}
      <ConfigModeToggle mode={mode} onModeChange={handleModeChange} />

      {/* Controller Type & Name Selection */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Strategy</CardTitle>
          <CardDescription>
            {mode === 'create'
              ? 'Choose a strategy type and name to create a new config'
              : 'Select strategy type and name to filter saved configs'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="select-type">Strategy Type</Label>
              <Select
                value={selectedType}
                onValueChange={(v) => {
                  setSelectedType(v);
                  if (mode === 'edit') {
                    setEditingConfig(null);
                  }
                }}
              >
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
              <Label htmlFor="select-controller">Strategy</Label>
              <Select
                value={selectedController}
                onValueChange={(v) => {
                  setSelectedController(v);
                  if (mode === 'edit') {
                    setEditingConfig(null);
                  }
                }}
              >
                <SelectTrigger id="select-controller">
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

      {/* Existing Configs - Only show in Edit mode */}
      {mode === 'edit' && (
        <ExistingConfigsList
          configs={filteredConfigs}
          editingConfig={editingConfig}
          onSelectConfig={loadConfigForEditing}
          onDeleteConfig={openDeleteDialog}
          icon={<SlidersHorizontal size={14} className="text-primary" />}
        />
      )}

      {/* Form - Show in Create mode OR when editing a config */}
      {(mode === 'create' || (mode === 'edit' && editingConfig)) && (
          <form className="max-w-4xl space-y-6">
            {/* Configuration Fields */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Configuration</CardTitle>
                    <CardDescription>Set the controller parameters</CardDescription>
                  </div>
                  {loadingTemplate && (
                    <RefreshCw className="animate-spin text-muted-foreground" size={16} />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {formFields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {loadingTemplate ? 'Loading template...' : 'Select a controller to see configuration fields'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {formFields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={field.key} className="text-sm">
                          {field.key}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {field.type === 'boolean' ? (
                          <div className="flex items-center h-10">
                            <Switch
                              id={field.key}
                              checked={field.value === 'true'}
                              onCheckedChange={(checked) => updateFieldValue(field.key, String(checked))}
                            />
                          </div>
                        ) : (
                          <Input
                            id={field.key}
                            type="text"
                            value={field.value}
                            onChange={(e) => updateFieldValue(field.key, e.target.value)}
                            placeholder={field.prompt || `Enter ${field.key}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Config */}
            <SaveConfigCard
              configId={configId}
              onConfigIdChange={setConfigId}
              isEditing={!!editingConfig}
              isSubmitting={submitting}
              submittingAction={submittingAction}
              error={error}
              onSave={() => handleSubmit('save')}
              onSaveAndDeploy={() => handleSubmit('deploy')}
            />
          </form>
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

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { controllers, scripts } from '../api/hummingbot-api';
import { generateConfigName } from '@/lib/utils';
import { Loader2, SlidersHorizontal, RefreshCw, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { SaveConfigCard } from '@/components/save-config-card';
import { formatStrategyName } from '@/lib/formatting';

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
  const [searchParams] = useSearchParams();

  // Get strategy info from URL params
  const strategyType = searchParams.get('type') || 'generic';
  const strategyName = searchParams.get('strategy') || '';
  const editConfigId = searchParams.get('config');
  const isScriptType = strategyType === 'script';

  const [configId, setConfigId] = useState<string>('');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'save' | 'deploy'>('save');
  const [error, setError] = useState<string | null>(null);

  // Fetch template and config data
  useEffect(() => {
    async function fetchData() {
      if (!strategyName) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadingTemplate(true);
      try {
        // Fetch template
        let template: Record<string, TemplateField>;
        const skipFields = isScriptType
          ? ['id', 'script_name']
          : ['id', 'controller_name', 'controller_type'];

        if (isScriptType) {
          template = await scripts.getConfigTemplate(strategyName) as Record<string, TemplateField>;
        } else {
          template = await controllers.getConfigTemplate(strategyType, strategyName) as Record<string, TemplateField>;
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

        // If editing, load existing config values
        if (editConfigId) {
          setConfigId(editConfigId);
          let config: Record<string, unknown>;

          if (isScriptType) {
            config = await scripts.getConfig(editConfigId);
          } else {
            config = await controllers.getConfig(editConfigId);
          }

          // Update fields with config values
          setFormFields(prev => prev.map((field) => {
            const configValue = config[field.key];
            if (configValue !== undefined && configValue !== null) {
              const value = typeof configValue === 'object'
                ? JSON.stringify(configValue)
                : String(configValue);
              return { ...field, value };
            }
            return field;
          }));
        } else {
          // Generate new config name
          setConfigId(generateConfigName());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load template');
      } finally {
        setLoading(false);
        setLoadingTemplate(false);
      }
    }

    fetchData();
  }, [strategyType, strategyName, editConfigId, isScriptType]);

  function updateFieldValue(key: string, value: string) {
    setFormFields((prev) => prev.map((f) => f.key === key ? { ...f, value } : f));
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
        config.script_name = strategyName;
      } else {
        config.controller_name = strategyName;
        config.controller_type = strategyType;
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

      if (editConfigId) {
        toast.success(`Config "${configId}" updated successfully`);
      } else {
        toast.success(`Config "${configId}" created successfully`);
      }

      if (action === 'deploy') {
        const typeParam = isScriptType ? 'script' : 'controller';
        navigate(`/bots/deploy?type=${typeParam}&strategy=${encodeURIComponent(strategyName)}&config=${encodeURIComponent(configId)}`);
      } else {
        navigate('/strategies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setSubmitting(false);
    }
  }

  if (!strategyName) {
    return (
      <div className="max-w-4xl">
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 text-destructive">
          No strategy specified. Please select a strategy from the Strategies page.
        </div>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/strategies')}>
          <ArrowLeft size={16} className="mr-2" />
          Back to Strategies
        </Button>
      </div>
    );
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
      {/* Page Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/strategies')}>
          <ArrowLeft size={16} className="mr-1" />
          Back to Strategies
        </Button>
        <div className="flex items-center gap-2 mb-2">
          <SlidersHorizontal size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {editConfigId ? 'Edit' : 'Create'} Config
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {editConfigId ? `Editing config "${editConfigId}" for` : 'Creating new config for'}{' '}
          <span className="font-medium text-foreground">{formatStrategyName(strategyName)}</span>
          {' '}({strategyType})
        </p>
      </div>

      <form className="space-y-6">
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
                {loadingTemplate ? 'Loading template...' : 'No configuration fields available'}
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
          isEditing={!!editConfigId}
          isSubmitting={submitting}
          submittingAction={submittingAction}
          error={error}
          onSave={() => handleSubmit('save')}
          onSaveAndDeploy={() => handleSubmit('deploy')}
        />
      </form>
    </div>
  );
}

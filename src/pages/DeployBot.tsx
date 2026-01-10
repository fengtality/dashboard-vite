import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { controllers, scripts, docker, bots } from '../api/client';
import type { ControllerConfig, ScriptConfig } from '../api/client';
import { useAccount } from '@/components/account-provider';
import { Loader2, Rocket, AlertCircle, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as Collapsible from '@radix-ui/react-collapsible';
import { cn } from '@/lib/utils';

export default function DeployBot() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedType = searchParams.get('type') || 'controller';
  const preselectedStrategy = searchParams.get('strategy');
  const preselectedConfig = searchParams.get('config');

  // Strategy type state
  const [selectedType, setSelectedType] = useState<'controller' | 'script'>(
    preselectedType === 'script' ? 'script' : 'controller'
  );

  // Controllers state
  const [controllerConfigs, setControllerConfigs] = useState<ControllerConfig[]>([]);

  // Scripts state
  const [scriptsList, setScriptsList] = useState<string[]>([]);
  const [scriptConfigs, setScriptConfigs] = useState<ScriptConfig[]>([]);

  // Selection state
  const [selectedStrategy, setSelectedStrategy] = useState<string>(preselectedStrategy || '');
  const [selectedConfig, setSelectedConfig] = useState<string>(preselectedConfig || '');

  // Docker images state
  const [imageTags, setImageTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('latest');

  // Common state
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configDetails, setConfigDetails] = useState<Record<string, unknown> | null>(null);
  const [configPreviewOpen, setConfigPreviewOpen] = useState(false);

  const isScriptType = selectedType === 'script';

  // Bot name is auto-generated from selected config
  const botName = selectedConfig ? `${selectedConfig}_bot` : '';

  // Get strategy options based on type
  const strategyOptions = useMemo(() => {
    if (isScriptType) {
      return scriptsList.sort().map(name => ({ value: name, label: name }));
    } else {
      const uniqueControllers = [...new Set(controllerConfigs.map(c => c.controller_name))];
      return uniqueControllers.sort().map(name => ({ value: name, label: name }));
    }
  }, [isScriptType, scriptsList, controllerConfigs]);

  // Get configs filtered by selected strategy
  const configOptions = useMemo(() => {
    if (!selectedStrategy) return [];
    if (isScriptType) {
      return scriptConfigs
        .filter(c => c.script_name === selectedStrategy)
        .map(c => ({ value: c.id, label: c.id }));
    } else {
      return controllerConfigs
        .filter(c => c.controller_name === selectedStrategy)
        .map(c => ({ value: c.id, label: c.id }));
    }
  }, [isScriptType, selectedStrategy, scriptConfigs, controllerConfigs]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [controllerConfigsData, scriptsListData, scriptConfigsData, imagesData] = await Promise.all([
          controllers.listConfigs(),
          scripts.list(),
          scripts.listConfigs(),
          docker.getAvailableImages('hummingbot'),
        ]);
        setControllerConfigs(controllerConfigsData);
        setScriptsList(scriptsListData);
        setScriptConfigs(scriptConfigsData);

        // Extract tags from hummingbot/hummingbot images
        const tags = imagesData
          .filter(img => img.startsWith('hummingbot/hummingbot:'))
          .map(img => img.replace('hummingbot/hummingbot:', ''));
        setImageTags(tags);
        if (tags.length > 0) {
          setSelectedTag(tags[0]);
        }

        // Set preselected values if provided and valid
        if (preselectedStrategy) {
          if (preselectedType === 'script') {
            const hasScript = scriptsListData.includes(preselectedStrategy);
            if (hasScript) {
              setSelectedStrategy(preselectedStrategy);
            }
          } else {
            const hasController = controllerConfigsData.some(c => c.controller_name === preselectedStrategy);
            if (hasController) {
              setSelectedStrategy(preselectedStrategy);
            }
          }
        }
        if (preselectedConfig) {
          if (preselectedType === 'script') {
            const configExists = scriptConfigsData.some(c => c.id === preselectedConfig);
            if (configExists) {
              setSelectedConfig(preselectedConfig);
              // Also set the script from the config if not already set
              if (!preselectedStrategy) {
                const config = scriptConfigsData.find(c => c.id === preselectedConfig);
                if (config) {
                  setSelectedStrategy(config.script_name);
                }
              }
            }
          } else {
            const configExists = controllerConfigsData.some(c => c.id === preselectedConfig);
            if (configExists) {
              setSelectedConfig(preselectedConfig);
              // Also set the controller from the config if not already set
              if (!preselectedStrategy) {
                const config = controllerConfigsData.find(c => c.id === preselectedConfig);
                if (config) {
                  setSelectedStrategy(config.controller_name);
                }
              }
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [preselectedType, preselectedStrategy, preselectedConfig]);

  // Fetch config details when selection changes
  useEffect(() => {
    if (!selectedConfig) {
      setConfigDetails(null);
      return;
    }

    async function fetchConfigDetails() {
      try {
        if (isScriptType) {
          const config = await scripts.getConfig(selectedConfig);
          // Remove id, script_name for display
          const { id, script_name, ...rest } = config;
          setConfigDetails(rest);
        } else {
          const config = await controllers.getConfig(selectedConfig);
          // Remove id, controller_name, controller_type for display
          const { id, controller_name, controller_type, ...rest } = config;
          setConfigDetails(rest);
        }
      } catch {
        setConfigDetails(null);
      }
    }
    fetchConfigDetails();
  }, [selectedConfig, isScriptType]);

  // Clear selections when type changes
  function handleTypeChange(type: 'controller' | 'script') {
    setSelectedType(type);
    setSelectedStrategy('');
    setSelectedConfig('');
    setConfigDetails(null);
  }

  // Clear config when strategy changes (unless it's still valid)
  function handleStrategyChange(strategy: string) {
    setSelectedStrategy(strategy);
    // Check if current config is still valid for new strategy
    let isConfigValid = false;
    if (isScriptType) {
      isConfigValid = scriptConfigs.some(
        c => c.script_name === strategy && c.id === selectedConfig
      );
    } else {
      isConfigValid = controllerConfigs.some(
        c => c.controller_name === strategy && c.id === selectedConfig
      );
    }
    if (!isConfigValid) {
      setSelectedConfig('');
    }
  }

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConfig) {
      setError('Please select a config');
      return;
    }
    if (!account) {
      setError('Please select an account from the header');
      return;
    }

    setDeploying(true);
    setError(null);

    try {
      if (isScriptType) {
        // Deploy using V2 script endpoint
        await bots.deployV2Script({
          instance_name: botName,
          credentials_profile: account,
          script: selectedStrategy,
          script_config: selectedConfig,
          image: `hummingbot/hummingbot:${selectedTag}`,
        });
      } else {
        // Deploy using V2 controllers endpoint
        await bots.deployV2Controllers({
          instance_name: botName,
          credentials_profile: account,
          controllers_config: [selectedConfig],
          image: `hummingbot/hummingbot:${selectedTag}`,
        });
      }

      toast.success(`Bot "${botName}" deployed successfully!`);

      // Navigate to bot detail page
      navigate(`/bots/${encodeURIComponent(botName)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy bot');
    } finally {
      setDeploying(false);
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
        <h1 className="text-2xl font-bold text-foreground">Deploy Bot</h1>
        <p className="text-muted-foreground mt-1">
          Deploy a new trading bot using account <span className="font-medium text-foreground">{account || '(none selected)'}</span>
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!account && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please select an account from the header to deploy a bot.</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleDeploy} className="space-y-6">
        {/* Select Config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Config</CardTitle>
            <CardDescription>Select a strategy type, strategy, and configuration to deploy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={selectedType} onValueChange={(v) => handleTypeChange(v as 'controller' | 'script')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="controller">Controller</SelectItem>
                    <SelectItem value="script">Script</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Strategy</Label>
                <Select value={selectedStrategy} onValueChange={handleStrategyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy..." />
                  </SelectTrigger>
                  <SelectContent>
                    {strategyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Config</Label>
                <Select
                  value={selectedConfig}
                  onValueChange={setSelectedConfig}
                  disabled={!selectedStrategy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedStrategy ? "Select config..." : "Select strategy first..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {configOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Config Details - Collapsible */}
        {configDetails && (
          <Collapsible.Root open={configPreviewOpen} onOpenChange={setConfigPreviewOpen}>
            <Card>
              <Collapsible.Trigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedStrategy} : {selectedConfig}</CardTitle>
                      <CardDescription>{isScriptType ? 'Script Config' : 'Controller Config'}</CardDescription>
                    </div>
                    <ChevronDown
                      size={20}
                      className={cn(
                        'text-muted-foreground transition-transform duration-200',
                        configPreviewOpen && 'rotate-180'
                      )}
                    />
                  </div>
                </CardHeader>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <CardContent className="pt-0">
                  <div className="bg-muted/30 rounded-lg p-3 font-mono text-xs space-y-1">
                    {Object.entries(configDetails).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-muted-foreground">{key}:</span>{' '}
                        {value === null ? 'null' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Collapsible.Content>
            </Card>
          </Collapsible.Root>
        )}

        {/* Docker Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Docker Image</CardTitle>
            <CardDescription>Select the Hummingbot Docker image tag to use</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label>Tag</Label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tag..." />
                </SelectTrigger>
                <SelectContent>
                  {imageTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={deploying || !selectedConfig || !account}
          className="w-full"
          variant="default"
        >
          {deploying ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              Deploying...
            </>
          ) : (
            <>
              <Rocket className="mr-2" size={18} />
              Deploy Bot
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

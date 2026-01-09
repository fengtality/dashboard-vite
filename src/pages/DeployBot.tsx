import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { controllers, scripts, docker, bots } from '../api/client';
import type { ControllerConfig, ScriptConfig } from '../api/client';
import { useAccount } from '@/components/account-provider';
import { Loader2, Rocket, AlertCircle, Zap, FileCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DeploymentType = 'v2-controllers' | 'script';

// Generate random bot name: color + noun
const colors = [
  'red', 'blue', 'green', 'gold', 'silver', 'purple', 'orange', 'teal', 'coral', 'amber',
  'crimson', 'azure', 'emerald', 'ruby', 'jade', 'violet', 'indigo', 'scarlet', 'cobalt', 'bronze',
  'ivory', 'onyx', 'pearl', 'copper', 'steel', 'frost', 'slate', 'sage', 'rose', 'plum',
];
const nouns = [
  'eagle', 'falcon', 'hawk', 'sparrow', 'robin', 'owl', 'raven', 'phoenix', 'heron', 'finch',
  'cardinal', 'jay', 'dove', 'swan', 'crane', 'pelican', 'condor', 'osprey', 'kite', 'vulture',
  'parrot', 'macaw', 'toucan', 'kingfisher', 'woodpecker', 'hummingbird', 'nightingale', 'lark', 'wren', 'thrush',
  'albatross', 'puffin', 'penguin', 'flamingo', 'stork', 'ibis', 'egret', 'oriole', 'tanager', 'warbler',
];
function generateRandomBotName(): string {
  const color = colors[Math.floor(Math.random() * colors.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${color}_${noun}`;
}

export default function DeployBot() {
  const { account } = useAccount();
  const [deploymentType, setDeploymentType] = useState<DeploymentType>('v2-controllers');

  // V2 Controllers state
  const [controllerConfigs, setControllerConfigs] = useState<ControllerConfig[]>([]);
  const [selectedControllerConfigs, setSelectedControllerConfigs] = useState<string[]>([]);

  // Scripts state
  const [scriptList, setScriptList] = useState<string[]>([]);
  const [scriptConfigs, setScriptConfigs] = useState<ScriptConfig[]>([]);
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [selectedScriptConfig, setSelectedScriptConfig] = useState<string>('');

  // Common state
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [botName, setBotName] = useState<string>(generateRandomBotName());
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [controllerConfigsData, scriptListData, scriptConfigsData, imagesData] = await Promise.all([
          controllers.listConfigs(),
          scripts.list(),
          scripts.listConfigs(),
          docker.getAvailableImages('hummingbot'),
        ]);
        setControllerConfigs(controllerConfigsData);
        setScriptList(scriptListData);
        setScriptConfigs(scriptConfigsData);
        setImages(imagesData);

        if (imagesData.length > 0) {
          setSelectedImage(imagesData[0]);
        }
        if (scriptListData.length > 0) {
          setSelectedScript(scriptListData[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function toggleControllerConfig(configId: string) {
    setSelectedControllerConfigs((prev) =>
      prev.includes(configId)
        ? prev.filter((c) => c !== configId)
        : [...prev, configId]
    );
  }

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!botName.trim()) {
      setError('Please enter a bot name');
      return;
    }
    if (!account) {
      setError('Please select an account from the header');
      return;
    }

    if (deploymentType === 'v2-controllers') {
      if (selectedControllerConfigs.length === 0) {
        setError('Please select at least one controller config');
        return;
      }
    } else {
      if (!selectedScript && !selectedScriptConfig) {
        setError('Please select a script or script config');
        return;
      }
    }

    setDeploying(true);
    setError(null);

    try {
      if (deploymentType === 'v2-controllers') {
        await bots.deployV2Controllers({
          instance_name: botName,
          credentials_profile: account,
          controllers_config: selectedControllerConfigs,
          image: selectedImage,
        });
      } else {
        await bots.deployV2Script({
          instance_name: botName,
          credentials_profile: account,
          script: selectedScript || undefined,
          script_config: selectedScriptConfig || undefined,
          image: selectedImage,
        });
      }
      toast.success(`Bot "${botName}" deployed successfully!`);
      setBotName(generateRandomBotName());
      setSelectedControllerConfigs([]);
      setSelectedScriptConfig('');
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
        {/* Deployment Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deployment Type</CardTitle>
            <CardDescription>Choose the type of bot to deploy</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={deploymentType} onValueChange={(v) => setDeploymentType(v as DeploymentType)}>
              <TabsList className="bg-background gap-1 border p-1">
                <TabsTrigger
                  value="v2-controllers"
                  className="gap-2 data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground"
                >
                  <Zap size={16} />
                  Controllers
                </TabsTrigger>
                <TabsTrigger
                  value="script"
                  className="gap-2 data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground"
                >
                  <FileCode size={16} />
                  Scripts
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-sm text-muted-foreground mt-3">
              {deploymentType === 'v2-controllers' ? (
                <>
                  <strong>Controllers:</strong> Deploy a bot with one or more V2 controller strategies like Grid Strike.
                </>
              ) : (
                <>
                  <strong>Scripts:</strong> Deploy a bot with a simple Python script strategy.
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Bot Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bot Name</CardTitle>
            <CardDescription>Enter a unique name for your bot</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="my_trading_bot"
            />
          </CardContent>
        </Card>

        {/* Docker Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Docker Image</CardTitle>
            <CardDescription>Select the Hummingbot Docker image to use</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedImage} onValueChange={setSelectedImage}>
              <SelectTrigger>
                <SelectValue placeholder="Select image..." />
              </SelectTrigger>
              <SelectContent>
                {images.map((image) => (
                  <SelectItem key={image} value={image}>
                    {image}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* V2 Controller Configs */}
        {deploymentType === 'v2-controllers' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Controller Configs</CardTitle>
              <CardDescription>Select one or more V2 controller configurations for your bot</CardDescription>
            </CardHeader>
            <CardContent>
              {controllerConfigs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No V2 controller configs available. Create a controller config first.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {controllerConfigs.map((config) => (
                    <label
                      key={config.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedControllerConfigs.includes(config.id)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-background border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedControllerConfigs.includes(config.id)}
                        onChange={() => toggleControllerConfig(config.id)}
                        className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                      />
                      <div className="flex-1">
                        <span className="text-foreground font-medium">{config.id}</span>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {config.controller_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {config.controller_name}
                          </Badge>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Script Selection */}
        {deploymentType === 'script' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Script</CardTitle>
                <CardDescription>Select a script to run (optional if using a script config)</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedScript} onValueChange={setSelectedScript}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select script..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No script (use config only)</SelectItem>
                    {scriptList.map((script) => (
                      <SelectItem key={script} value={script}>
                        {script}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Script Config</CardTitle>
                <CardDescription>Select a pre-configured script configuration (optional)</CardDescription>
              </CardHeader>
              <CardContent>
                {scriptConfigs.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No script configs available. Create a script config first, or deploy with just a script.
                  </div>
                ) : (
                  <Select value={selectedScriptConfig} onValueChange={setSelectedScriptConfig}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select script config..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No config</SelectItem>
                      {scriptConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          {config.id}
                          {config.script_name && ` (${config.script_name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Selected configs summary */}
        {deploymentType === 'v2-controllers' && selectedControllerConfigs.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">
                Selected {selectedControllerConfigs.length} controller config(s):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedControllerConfigs.map((id) => (
                  <Badge key={id} variant="default">
                    {id}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {deploymentType === 'script' && (selectedScript || selectedScriptConfig) && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Deployment summary:</p>
              <div className="flex flex-wrap gap-2">
                {selectedScript && (
                  <Badge variant="default">
                    Script: {selectedScript}
                  </Badge>
                )}
                {selectedScriptConfig && (
                  <Badge variant="secondary">
                    Config: {selectedScriptConfig}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          type="submit"
          disabled={
            deploying ||
            !botName.trim() ||
            !account ||
            (deploymentType === 'v2-controllers' && selectedControllerConfigs.length === 0) ||
            (deploymentType === 'script' && !selectedScript && !selectedScriptConfig)
          }
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

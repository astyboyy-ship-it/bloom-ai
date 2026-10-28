"use client";

import { useState } from "react";
import { Copy, KeyRound, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PublicApiKey } from "./types";

function copy(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Copied"),
    () => toast.error("Clipboard unavailable"),
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-muted p-4 pr-12 font-mono text-xs leading-relaxed">
        {code}
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 size-7"
        onClick={() => copy(code)}
        aria-label="Copy"
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}

export function ExportPanel({
  workspaceId,
  appUrl,
  agents,
  initialKeys,
  initialWebhookUrl,
  hasWebhookSecret,
}: {
  workspaceId: string;
  appUrl: string;
  agents: string[];
  initialKeys: PublicApiKey[];
  initialWebhookUrl: string | null;
  hasWebhookSecret: boolean;
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl ?? "");
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [secretExists, setSecretExists] = useState(hasWebhookSecret);
  const [savingHook, setSavingHook] = useState(false);

  const gatewayUrl = `${appUrl}/api/gateway`;
  const runUrl = `${appUrl}/api/v1/run`;
  const key = revealed ?? "wfa_live_YOUR_KEY";
  const firstAgent = agents[0] ?? "Agent";

  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not create key");
      setKeys((k) => [json.key, ...k]);
      setRevealed(json.secret);
      setNewKeyName("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/workspaces/${workspaceId}/keys/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Revoke failed");
    setKeys((k) => k.map((x) => (x.id === id ? { ...x, revokedAt: new Date() } : x)));
    toast.success("Key revoked");
  }

  async function saveWebhook(rotate = false) {
    setSavingHook(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim() || null,
          rotateWebhookSecret: rotate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Save failed");
      if (json.webhookSecret) {
        setWebhookSecret(json.webhookSecret);
        setSecretExists(true);
      }
      toast.success("Webhook saved");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingHook(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>
            Call your customized infrastructure from any app. Both endpoints use Bearer API keys
            scoped to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ["Gateway (OpenAI-compatible, per-agent)", gatewayUrl],
            ["Full workflow run", runUrl],
          ].map(([label, url]) => (
            <div key={url} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <div className="flex gap-2">
                <Input readOnly value={url} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(url)} aria-label="Copy">
                  <Copy />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" /> API keys
          </CardTitle>
          <CardDescription>Keys are hashed at rest; the full key is shown once.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g. production-backend)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
            <Button onClick={createKey} disabled={creating}>
              {creating ? <Loader2 className="animate-spin" /> : <Plus />} Generate key
            </Button>
          </div>
          {revealed && (
            <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="text-xs font-medium">Copy this key now — it won&apos;t be shown again.</p>
              <div className="flex gap-2">
                <Input readOnly value={revealed} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(revealed)} aria-label="Copy">
                  <Copy />
                </Button>
              </div>
            </div>
          )}
          <ul className="divide-y rounded-md border">
            {keys.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">No keys yet.</li>
            )}
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{k.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {k.prefix}… · created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt && ` · last used ${new Date(k.lastUsedAt).toLocaleString()}`}
                  </p>
                </div>
                {k.revokedAt ? (
                  <Badge variant="outline">revoked</Badge>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => revoke(k.id)} aria-label="Revoke">
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quickstart</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="gateway">
            <TabsList>
              <TabsTrigger value="gateway">Gateway · cURL</TabsTrigger>
              <TabsTrigger value="run">Workflow run · cURL</TabsTrigger>
              <TabsTrigger value="ts">TypeScript</TabsTrigger>
            </TabsList>
            <TabsContent value="gateway">
              <CodeBlock
                code={`curl ${gatewayUrl} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent": "${firstAgent}",
    "messages": [{ "role": "user", "content": "..." }],
    "stream": false
  }'`}
              />
            </TabsContent>
            <TabsContent value="run">
              <CodeBlock
                code={`curl ${runUrl} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{ "input": "...", "stream": false }'`}
              />
            </TabsContent>
            <TabsContent value="ts">
              <CodeBlock
                code={`const res = await fetch("${runUrl}", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.WFA_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ input: "..." }),
});
const { output, usage, steps } = await res.json();`}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outbound webhook</CardTitle>
          <CardDescription>
            Receives <code>workflow.run.completed</code> events. Verify{" "}
            <code>X-WFA-Signature</code> = <code>v1=HMAC_SHA256(secret, timestamp + &quot;.&quot; + body)</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="https://your-app.com/hooks/workflow"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <Button onClick={() => saveWebhook()} disabled={savingHook}>
              {savingHook && <Loader2 className="animate-spin" />} Save
            </Button>
          </div>
          {secretExists && (
            <Button variant="outline" size="sm" onClick={() => saveWebhook(true)} disabled={savingHook}>
              <RefreshCw /> Rotate signing secret
            </Button>
          )}
          {webhookSecret && (
            <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="text-xs font-medium">Signing secret — shown once.</p>
              <div className="flex gap-2">
                <Input readOnly value={webhookSecret} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(webhookSecret)} aria-label="Copy">
                  <Copy />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

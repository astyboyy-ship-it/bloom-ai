-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('DRAFT', 'ARCHITECTING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentTopology" AS ENUM ('SINGLE_AGENT', 'HIERARCHICAL', 'PIPELINE');

-- CreateEnum
CREATE TYPE "ModelTier" AS ENUM ('FAST', 'BALANCED', 'DEEP');

-- CreateEnum
CREATE TYPE "IngestStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "workflowDescription" TEXT NOT NULL,
    "domain" TEXT,
    "summary" TEXT,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'DRAFT',
    "errorMessage" TEXT,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowConfig" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "topology" "AgentTopology" NOT NULL,
    "topologyRationale" TEXT NOT NULL,
    "orchestratorPrompt" TEXT NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "routingRules" JSONB NOT NULL,
    "toolIntegrations" JSONB NOT NULL,
    "ragStrategy" JSONB NOT NULL,
    "maxTokensPerRequest" INTEGER NOT NULL DEFAULT 4096,
    "monthlyTokenBudget" INTEGER NOT NULL DEFAULT 2000000,
    "rawSpec" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRole" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "responsibility" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "outputSchema" JSONB,
    "tier" "ModelTier" NOT NULL,
    "model" TEXT NOT NULL,
    "fallbackModels" TEXT[],
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "maxTokens" INTEGER NOT NULL DEFAULT 2048,
    "tools" TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VectorStoreReference" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL DEFAULT 1536,
    "chunkStrategy" TEXT NOT NULL,
    "chunkSize" INTEGER NOT NULL,
    "chunkOverlap" INTEGER NOT NULL,
    "status" "IngestStatus" NOT NULL DEFAULT 'PENDING',
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VectorStoreReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "agentRoleId" TEXT,
    "source" TEXT NOT NULL,
    "requestedModel" TEXT NOT NULL,
    "servedModel" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatewayRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_userId_idx" ON "Workspace"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowConfig_workspaceId_key" ON "WorkflowConfig"("workspaceId");

-- CreateIndex
CREATE INDEX "AgentRole_configId_position_idx" ON "AgentRole"("configId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRole_configId_name_key" ON "AgentRole"("configId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "VectorStoreReference_workspaceId_name_key" ON "VectorStoreReference"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "DocumentChunk_storeId_idx" ON "DocumentChunk"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hashedKey_key" ON "ApiKey"("hashedKey");

-- CreateIndex
CREATE INDEX "ApiKey_workspaceId_idx" ON "ApiKey"("workspaceId");

-- CreateIndex
CREATE INDEX "GatewayRequest_workspaceId_createdAt_idx" ON "GatewayRequest"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowConfig" ADD CONSTRAINT "WorkflowConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRole" ADD CONSTRAINT "AgentRole_configId_fkey" FOREIGN KEY ("configId") REFERENCES "WorkflowConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VectorStoreReference" ADD CONSTRAINT "VectorStoreReference_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "VectorStoreReference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayRequest" ADD CONSTRAINT "GatewayRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayRequest" ADD CONSTRAINT "GatewayRequest_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayRequest" ADD CONSTRAINT "GatewayRequest_agentRoleId_fkey" FOREIGN KEY ("agentRoleId") REFERENCES "AgentRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Custom: approximate-nearest-neighbour index for cosine retrieval (not expressible in schema.prisma).
-- If a future `prisma migrate dev` proposes dropping it, create that migration with --create-only and remove the DROP.
CREATE INDEX "DocumentChunk_embedding_hnsw_idx" ON "DocumentChunk" USING hnsw ("embedding" vector_cosine_ops);

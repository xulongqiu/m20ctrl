#!/bin/bash
# setup-claude-memory.sh
# 在项目根目录运行此脚本，快速初始化 Claude Code 记忆管理文件结构

set -e

echo "🚀 初始化 Claude Code 记忆管理文件..."

# 创建 .claude 目录
mkdir -p .claude

# 创建各记忆文件（如已存在则跳过，否则写入模板内容）
TODAY=$(date +"%Y-%m-%d")

write_if_missing() {
  local file=$1
  local content=$2
  if [ -f "$file" ]; then
    echo "  ⏭  已存在，跳过：$file"
  else
    echo "$content" > "$file"
    echo "  ✅ 已创建：$file"
  fi
}

write_if_missing ".claude/progress.md" "# 任务进度 (progress.md)

> 记录当前工作状态。每次完成阶段性工作后更新。
> 格式：\`[YYYY-MM-DD HH:mm] 内容\`

---

## 🎯 当前目标

<!-- 描述这个阶段要完成的总体目标 -->

---

## ✅ 已完成

<!-- 示例：
- [$TODAY 14:30] 完成用户认证模块，使用 JWT + refresh token 方案
- [$TODAY 16:00] 完成 /api/auth 路由，包含 login / logout / refresh 三个端点
-->

---

## 🔄 进行中

<!-- 示例：
- 正在实现用户权限系统（RBAC），已完成 role 表设计，还差中间件和前端集成
-->

---

## 📋 待办

<!-- 示例：
- [ ] 实现邮件验证功能
- [ ] 写单元测试（目标覆盖率 80%）
- [ ] 部署到 staging 环境
-->

---

## 🔁 上下文恢复检查清单

上下文压缩后重新开始时，请依次确认：
- [ ] 已读取 \`.claude/decisions.md\`（了解技术选型背景）
- [ ] 已读取 \`.claude/lessons.md\`（避免重复踩坑）
- [ ] 已读取 \`.claude/env-notes.md\`（确认环境配置）
- [ ] 已了解当前「进行中」任务的断点位置"

write_if_missing ".claude/decisions.md" "# 技术决策日志 (decisions.md)

> 记录重要的架构与技术选型决定，以及做出该决定的原因。
> 格式：\`## [YYYY-MM-DD] 决策标题\`

---

## [$TODAY] 示例：选择 PostgreSQL 而非 MongoDB

**决定**：使用关系型数据库 PostgreSQL

**原因**：
- 业务数据关联性强，需要事务支持
- 团队对 SQL 更熟悉

**放弃的方案**：MongoDB（文档型，灵活但无强事务）

**影响范围**：整个数据层，使用 Prisma ORM

---

*在此之上添加新的决策记录 👆*"

write_if_missing ".claude/lessons.md" "# 经验教训 (lessons.md)

> 记录踩过的坑、用户纠正的错误理解、发现的特殊约定。
> 格式：\`## [YYYY-MM-DD] [类型] 标题\`
> 类型标签：\`[BUG]\` \`[误解]\` \`[约定]\` \`[坑]\` \`[纠正]\`

---

## [$TODAY] [坑] 示例：环境变量必须带端口号

**现象**：连接 Redis 时报 \"connection refused\"

**原因**：REDIS_URL 默认不带端口，但项目跑在非标准端口 6380

**正确做法**：\`REDIS_URL=redis://localhost:6380\`

---

## [$TODAY] [约定] 示例：API 返回格式统一规范

**约定**：所有接口返回 \`{ data, error, meta }\` 结构
- 成功：\`{ data: {...}, error: null, meta: { timestamp } }\`
- 失败：\`{ data: null, error: { code, message }, meta: { timestamp } }\`
- **不要**用旧格式 \`{ success: true, result: ... }\`

---

*在此之上添加新的经验记录 👇*"

write_if_missing ".claude/env-notes.md" "# 环境变量与配置说明 (env-notes.md)

> 记录重要的环境变量、配置文件和部署注意事项。
> 不要在此记录实际的密钥值，只记录说明和注意点。

---

## 环境变量说明

| 变量名 | 用途 | 注意事项 |
|--------|------|---------|
| \`DATABASE_URL\` | 数据库连接 | 本地用 \`.env.local\`，不要提交到 git |
| \`REDIS_URL\` | Redis 连接 | **必须带端口号**，例：\`redis://localhost:6380\` |
| \`JWT_SECRET\` | JWT 签名密钥 | 生产环境至少 64 位随机字符串 |

---

## 配置文件说明

| 文件 | 用途 | 备注 |
|------|------|------|
| \`.env.local\` | 本地开发环境变量 | 不提交 git，从 \`.env.example\` 复制 |
| \`.env.test\` | 测试环境变量 | 使用独立的测试数据库 |

---

## 本地开发环境搭建步骤

\`\`\`bash
# 1. 复制环境变量文件
cp .env.example .env.local

# 2. 安装依赖并启动
npm install && docker-compose up -d

# 3. 执行数据库迁移并启动开发服务器
npx prisma migrate dev && npm run dev
\`\`\`

---

## 部署注意事项

- staging 环境：<!-- 说明 -->
- production 环境：<!-- 说明 -->

*最后更新：$TODAY*"

# 将 .claude/ 加入 .gitignore（可选，根据团队需求决定是否注释掉）
if [ -f ".gitignore" ]; then
  if grep -q "^\.claude/$" .gitignore; then
    echo "  ⏭  .gitignore 中已有 .claude/ 条目"
  else
    echo "" >> .gitignore
    echo "# Claude Code 记忆文件（按需决定是否提交）" >> .gitignore
    echo "# .claude/" >> .gitignore
    echo "  📝 已在 .gitignore 中添加注释条目（默认不忽略，按需取消注释）"
  fi
fi

# 创建 CLAUDE.md（如已存在则跳过）
if [ -f "CLAUDE.md" ]; then
  echo "  ⏭  CLAUDE.md 已存在，跳过"
else
  cat > CLAUDE.md << 'TEMPLATE'
# CLAUDE.md — 项目上下文与记忆规则

> 本文件在每次 Claude Code 会话启动时自动加载。
> 本文件只可更改项目概述，其他章节不可以擅自更改，只能在收到用户明确要求是更改!!!

## 📌 项目概述

- **项目名称**：
- **技 术 栈**：
- **主要功能**：
- **仓库结构**：


## 🧠 自主记忆规则（重要，必须遵守）

**在以下任意情况发生后，你必须主动更新对应的记忆文件，然后再继续工作：**

| 触发条件 | 更新目标文件 |
|---------|------------|
| 完成一个功能模块或子任务 | `.claude/progress.md` |
| 做出架构 / 技术选型决定 | `.claude/decisions.md` |
| 用户纠正了你的理解或做法 | `.claude/lessons.md` |
| 发现 bug 的根本原因 | `.claude/lessons.md` |
| 发现项目特殊约定、禁忌或坑 | `.claude/lessons.md` |
| 新增或变更重要环境变量/配置 | `.claude/env-notes.md` |

> ⚠️ 上下文压缩后，这些文件是你恢复状态的唯一依据。记录要简洁但完整。

---

## 📂 记忆文件索引

| 文件 | 用途 |
|-----|------|
| `.claude/progress.md` | 当前任务进度与待办事项 |
| `.claude/decisions.md` | 技术决策日志 |
| `.claude/lessons.md` | 经验教训、踩坑记录、用户纠正 |
| `.claude/env-notes.md` | 环境变量与配置说明 |

**每次新会话开始时，请先读取以上所有文件，快速恢复上下文。**

---

## 🚫 项目禁忌（Forbidden）

- 不要直接执行pip install 安装python包到系统目录

---

## ⚙️ 常用命令

```bash
# 系统代理
# exportProxy


# 代码同步
# ./sync.sh push user@ip:target

# python ven
# 优先使用项目目录下的.venv, 如果没有则使用~/.venv


```

---

## 👤 用户偏好

- 代码注释语言：无特殊要求一律用英文
- 代码风格/格式: Google Style
- 提交信息风格：Conventional Commits
- 回复风格：简洁直接，不需要解释每一步

---

*最后更新：$(date +"%Y-%m-%d") *
TEMPLATE
  echo "  ✅ 已创建：CLAUDE.md"
fi

echo ""
echo "✨ 完成！文件结构："
echo ""
echo "  CLAUDE.md                ← 项目概述 + 记忆规则（自动加载）"
echo "  .claude/"
echo "  ├── progress.md          ← 任务进度与待办"
echo "  ├── decisions.md         ← 技术决策日志"
echo "  ├── lessons.md           ← 经验教训与踩坑记录"
echo "  └── env-notes.md         ← 环境变量与配置说明"
echo ""
echo "👉 下一步：编辑 CLAUDE.md，填写项目概述和禁忌事项"

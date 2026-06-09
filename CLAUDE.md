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

# Architecture and data flow

```text
local AdRouterCLI
  ├─ local session, tools, approvals, profiles, and display-only sponsor panel
  └─ conversation/tool context
          ↓ TLS
AdRouter hosted gateway
  ├─ authentication, quota, routing, usage, and settlement metadata
  └─ selected model request
          ↓
selected model provider
          ↓
model response → gateway → local CLI
```

Sponsorship selection and rendering stay outside model and tool context. The backend, WebUI, Electron agent, landing page, and infrastructure are external to this repository.

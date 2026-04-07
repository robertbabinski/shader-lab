---
"@basementstudio/shader-lab": minor
---

Support custom shader layers running in effect mode. When `effectMode` is enabled in layer params, the shader receives `inputTexture` (the composited layers below) and skips sRGB-to-linear conversion since the input is already linear.

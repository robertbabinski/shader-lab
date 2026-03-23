import { describe, expect, it } from "bun:test"
import { float } from "three/tsl"
import {
  compileCustomShaderModule,
  formatCustomShaderSource,
} from "@/features/editor/renderer/custom-shader-runtime"

describe("custom shader runtime", () => {
  it("compiles a valid sketch against the injected prelude", async () => {
    const compiled = await compileCustomShaderModule({
      entryExport: "sketch",
      extraScope: { time: float(0) },
      sourceCode: `export const sketch = Fn(() => {
        const uv0 = screenAspectUV(screenSize)
        return technicolorTonemap(
          cosinePalette(uv0.x.add(0.5), vec3(0.1), vec3(0.2), vec3(0.3), vec3(0.4))
        )
      })`,
    })

    const node = compiled.buildNode()

    expect(node).toBeTruthy()
    expect(typeof node.mul).toBe("function")
  })

  it("rejects import statements", async () => {
    await expect(
      compileCustomShaderModule({
        entryExport: "sketch",
        extraScope: { time: float(0) },
        sourceCode: `import { vec3 } from "three/tsl"
export const sketch = Fn(() => vec3(0))`,
      })
    ).rejects.toThrow(
      "Custom shader sketches cannot use import statements. Use the injected prelude helpers instead."
    )
  })

  it("formats valid sketch source", async () => {
    const formatted = await formatCustomShaderSource({
      sourceCode:
        "export const sketch=Fn(()=>{const uv0=screenAspectUV(screenSize);return technicolorTonemap(cosinePalette(uv0.x.add(0.5),vec3(0.1),vec3(0.2),vec3(0.3),vec3(0.4)))})",
    })

    expect(formatted).toContain("export const sketch = Fn(() => {")
    expect(formatted).toContain("const uv0 = screenAspectUV(screenSize);")
  })
})

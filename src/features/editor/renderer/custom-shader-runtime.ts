import type { TSLNode } from "three/tsl"
import * as tsl from "three/tsl"
import * as shaderUtils from "@/features/editor/shaders/tsl/utils"

type CompiledShaderModule = {
  buildNode: () => TSLNode
}

const PRELUDE = {
  ...tsl,
  ...shaderUtils,
}

const TRANSPILED_CACHE = new Map<string, string>()
let typescriptPromise: Promise<typeof import("typescript")> | null = null

function isNodeLike(value: unknown): value is TSLNode {
  return Boolean(
    value &&
      typeof value === "object" &&
      "mul" in value &&
      "add" in value &&
      "sub" in value
  )
}

function formatDiagnostics(
  compiler: typeof import("typescript"),
  diagnostics: readonly import("typescript").Diagnostic[] | undefined
): string | null {
  if (!(diagnostics && diagnostics.length > 0)) {
    return null
  }

  return diagnostics
    .map((diagnostic) =>
      compiler.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    )
    .join("\n\n")
}

function assertImportlessSource(sourceCode: string) {
  if (/^\s*import[\s{*]/m.test(sourceCode)) {
    throw new Error(
      "Custom shader sketches cannot use import statements. Use the injected prelude helpers instead."
    )
  }

  if (/^\s*export\s+\*\s+from\s+/m.test(sourceCode)) {
    throw new Error(
      "Custom shader sketches cannot re-export from other modules."
    )
  }

  if (/^\s*export\s*{[^}]+}\s*from\s+/m.test(sourceCode)) {
    throw new Error(
      "Custom shader sketches cannot re-export from other modules."
    )
  }
}

async function getTypeScript() {
  if (!typescriptPromise) {
    typescriptPromise = import("typescript")
  }

  return typescriptPromise
}

function getScriptKind(
  compiler: typeof import("typescript"),
  fileName: string
): import("typescript").ScriptKind {
  return fileName.endsWith(".tsx")
    ? compiler.ScriptKind.TSX
    : compiler.ScriptKind.TS
}

export async function formatCustomShaderSource({
  fileName,
  sourceCode,
}: {
  fileName?: string
  sourceCode: string
}): Promise<string> {
  const compiler = await getTypeScript()
  const resolvedFileName = fileName ?? "custom-shader.ts"
  const sourceFile = compiler.createSourceFile(
    resolvedFileName,
    sourceCode,
    compiler.ScriptTarget.ES2020,
    true,
    getScriptKind(compiler, resolvedFileName)
  )
  const diagnosticsMessage = formatDiagnostics(
    compiler,
    (
      sourceFile as import("typescript").SourceFile & {
        parseDiagnostics?: readonly import("typescript").Diagnostic[]
      }
    ).parseDiagnostics
  )

  if (diagnosticsMessage) {
    throw new Error(diagnosticsMessage)
  }

  const printer = compiler.createPrinter({
    newLine: compiler.NewLineKind.LineFeed,
  })

  return `${printer.printFile(sourceFile).trim()}\n`
}

export async function compileCustomShaderModule({
  entryExport,
  extraScope,
  fileName,
  force = false,
  sourceCode,
}: {
  entryExport: string
  extraScope?: Record<string, unknown>
  fileName?: string
  force?: boolean
  sourceCode: string
}): Promise<CompiledShaderModule> {
  assertImportlessSource(sourceCode)

  const cacheKey = `${entryExport}\n${fileName ?? ""}\n${sourceCode}`
  let outputText = !force ? (TRANSPILED_CACHE.get(cacheKey) ?? null) : null

  const compiler = await getTypeScript()
  if (!outputText) {
    const transpiled = compiler.transpileModule(sourceCode, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: compiler.JsxEmit.ReactJSX,
        module: compiler.ModuleKind.CommonJS,
        target: compiler.ScriptTarget.ES2020,
      },
      fileName: fileName ?? "custom-shader.ts",
      reportDiagnostics: true,
    })
    const diagnosticsMessage = formatDiagnostics(
      compiler,
      transpiled.diagnostics
    )

    if (diagnosticsMessage) {
      throw new Error(diagnosticsMessage)
    }

    outputText = transpiled.outputText
    TRANSPILED_CACHE.set(cacheKey, outputText)
  }

  const runtimeScope = {
    ...PRELUDE,
    ...(extraScope ?? {}),
  }
  const scopeNames = Object.keys(runtimeScope)
  const scopeValues = scopeNames.map(
    (key) => runtimeScope[key as keyof typeof runtimeScope]
  )
  const module = { exports: {} as Record<string, unknown> }
  const exportsObject = module.exports
  const evaluator = new Function(
    "exports",
    "module",
    ...scopeNames,
    `${outputText}\nreturn module.exports;`
  )

  let resolvedExports: Record<string, unknown>

  try {
    resolvedExports = evaluator(
      exportsObject,
      module,
      ...scopeValues
    ) as Record<string, unknown>
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Custom shader evaluation failed."
    )
  }

  const exported = resolvedExports[entryExport] ?? module.exports[entryExport]

  if (typeof exported !== "function") {
    throw new Error(
      `Expected a named export \`${entryExport}\` that resolves to a TSL sketch function.`
    )
  }

  return {
    buildNode: () => {
      const result = (exported as () => unknown)()

      if (!isNodeLike(result)) {
        throw new Error(
          `The export \`${entryExport}\` did not return a valid TSL node.`
        )
      }

      return result
    },
  }
}

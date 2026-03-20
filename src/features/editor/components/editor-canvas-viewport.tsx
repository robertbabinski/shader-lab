"use client"

import { useEffect } from "react"
import { useEditorRenderer } from "@/features/editor/hooks/use-editor-renderer"
import { useEditorStore } from "@/store/editorStore"

export function EditorCanvasViewport() {
  const { canvasRef, fallbackMessage, isReady, viewportRef } = useEditorRenderer()
  const immersiveCanvas = useEditorStore((state) => state.immersiveCanvas)
  const exitImmersiveCanvas = useEditorStore((state) => state.exitImmersiveCanvas)
  const webgpuStatus = useEditorStore((state) => state.webgpuStatus)

  useEffect(() => {
    if (!immersiveCanvas) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        exitImmersiveCanvas()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [exitImmersiveCanvas, immersiveCanvas])

  return (
    <>
      <div ref={viewportRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
        />
        {immersiveCanvas ? (
          <>
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 z-30 h-full w-8"
              onPointerEnter={exitImmersiveCanvas}
            />
            <div
              aria-hidden="true"
              className="absolute top-0 right-0 z-30 h-full w-8"
              onPointerEnter={exitImmersiveCanvas}
            />
          </>
        ) : null}
      </div>

      {!isReady ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-sm rounded-xl border border-white/10 bg-[rgba(18,18,22,0.55)] px-5 py-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-[24px]">
            <p className="font-mono text-[10px] text-white/35 uppercase tracking-[0.06em]">
              Renderer {webgpuStatus}
            </p>
            <p className="mt-2 text-sm text-white/75">
              {fallbackMessage ?? "Initializing the editor canvas."}
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}

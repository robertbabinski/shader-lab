"use client"

import {
  DotsSixVertical,
  Eye,
  EyeSlash,
  ImageSquare,
  Plus,
  Sparkle,
} from "@phosphor-icons/react"
import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react"
import type { EditorAsset, EditorLayer } from "@/features/editor/types"
import { cn } from "@/shared/lib/cn"
import { GlassPanel } from "@/shared/ui/glass-panel"
import { IconButton } from "@/shared/ui/icon-button"
import { Select } from "@/shared/ui/select"
import { Typography } from "@/shared/ui/typography"
import { useAssetStore } from "@/store/assetStore"
import { useLayerStore } from "@/store/layerStore"
import s from "./layer-sidebar.module.css"

type AddLayerAction = "dithering" | "image"

const addLayerOptions = [
  {
    label: (
      <span className={s.menuButton}>
        <ImageSquare size={14} weight="regular" />
        Image
      </span>
    ),
    value: "image",
  },
  {
    label: (
      <span className={s.menuButton}>
        <Sparkle size={14} weight="regular" />
        Dithering
      </span>
    ),
    value: "dithering",
  },
] as const satisfies readonly { label: ReactNode; value: AddLayerAction }[]

function getLayerSecondaryText(layer: EditorLayer, asset: EditorAsset | null): string {
  if (layer.type === "image" || layer.type === "video" || layer.type === "model") {
    return asset?.fileName ?? "No asset selected"
  }

  return layer.type.replaceAll("-", " ")
}

function getThumbnailClassName(layer: EditorLayer, asset: EditorAsset | null): string {
  if (asset?.kind === "image" || asset?.kind === "video") {
    return cn(s.thumbnail, s.thumbnailImage)
  }

  if (layer.type === "model") {
    return cn(s.thumbnail, s.thumbnailModel)
  }

  return cn(s.thumbnail, s.thumbnailEffect)
}

export function LayerSidebar() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [addLayerSelectKey, setAddLayerSelectKey] = useState(0)
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null)
  const [dropLayerId, setDropLayerId] = useState<string | null>(null)

  const layers = useLayerStore((state) => state.layers)
  const selectedLayerId = useLayerStore((state) => state.selectedLayerId)
  const addLayer = useLayerStore((state) => state.addLayer)
  const reorderLayers = useLayerStore((state) => state.reorderLayers)
  const selectLayer = useLayerStore((state) => state.selectLayer)
  const setLayerAsset = useLayerStore((state) => state.setLayerAsset)
  const setLayerVisibility = useLayerStore((state) => state.setLayerVisibility)
  const assets = useAssetStore((state) => state.assets)
  const loadAsset = useAssetStore((state) => state.loadAsset)

  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  )

  async function handleImageFile(file: File) {
    try {
      const asset = await loadAsset(file)
      const layerId = addLayer("image")
      setLayerAsset(layerId, asset.id)
    } catch {
      // No-op.
    }
  }

  function handleImagePick() {
    fileInputRef.current?.click()
  }

  function handleAddDithering() {
    addLayer("dithering")
  }

  function handleAddLayer(action: AddLayerAction) {
    if (action === "image") {
      handleImagePick()
    } else {
      handleAddDithering()
    }

    setAddLayerSelectKey((current) => current + 1)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    event.currentTarget.value = ""

    if (!file) {
      return
    }

    void handleImageFile(file)
  }

  function commitReorder(targetLayerId: string) {
    if (!draggingLayerId || draggingLayerId === targetLayerId) {
      return
    }

    const fromIndex = layers.findIndex((layer) => layer.id === draggingLayerId)
    const toIndex = layers.findIndex((layer) => layer.id === targetLayerId)

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return
    }

    reorderLayers(fromIndex, toIndex)
  }

  return (
    <aside className={s.root}>
      <input
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />

      <GlassPanel className={s.panel} variant="panel">
        <div className={s.header}>
          <Typography className={s.title} tone="secondary" variant="overline">
            Layers
          </Typography>
          <Select
            key={addLayerSelectKey}
            className={s.addLayerSelect ?? ""}
            iconClassName={s.addLayerIcon ?? ""}
            onValueChange={(value) => handleAddLayer(value as AddLayerAction)}
            options={addLayerOptions}
            placeholder={<Plus size={14} weight="bold" />}
            popupClassName={s.addLayerPopup ?? ""}
            triggerAriaLabel="Add layer"
            triggerClassName={s.addLayerTrigger ?? ""}
            valueClassName={s.addLayerValue ?? ""}
          />
        </div>

        <ul className={s.scrollArea}>
          {layers.map((layer) => {
            const asset = layer.assetId ? (assetsById.get(layer.assetId) ?? null) : null
            const isSelected = selectedLayerId === layer.id
            const isDragging = draggingLayerId === layer.id
            const isDropTarget = dropLayerId === layer.id && draggingLayerId !== layer.id

            return (
              <li
                className={cn(
                  s.row,
                  !layer.locked && s.rowInteractive,
                  isSelected && s.rowSelected,
                  isDragging && s.rowDragging,
                  isDropTarget && s.rowDropTarget,
                )}
                draggable={!layer.locked}
                key={layer.id}
                onDragEnd={() => {
                  setDraggingLayerId(null)
                  setDropLayerId(null)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  if (draggingLayerId && draggingLayerId !== layer.id) {
                    setDropLayerId(layer.id)
                  }
                }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", layer.id)
                  setDraggingLayerId(layer.id)
                  setDropLayerId(layer.id)
                  selectLayer(layer.id)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  commitReorder(layer.id)
                  setDraggingLayerId(null)
                  setDropLayerId(null)
                }}
              >
                <button className={s.rowButton} onClick={() => selectLayer(layer.id)} type="button">
                  <span className={cn(s.handle, layer.locked && s.handleLocked)}>
                    <DotsSixVertical size={14} weight="bold" />
                  </span>

                  <div
                    className={getThumbnailClassName(layer, asset)}
                    style={
                      asset?.kind === "image" || asset?.kind === "video"
                        ? { backgroundImage: `url("${asset.url}")` }
                        : undefined
                    }
                  />

                  <div className={s.labelStack}>
                    <Typography className={s.truncate} variant="label">
                      {layer.name}
                    </Typography>
                    <Typography className={s.truncate} tone="muted" variant="monoXs">
                      {getLayerSecondaryText(layer, asset)}
                    </Typography>
                  </div>
                </button>

                <IconButton
                  aria-label={layer.visible ? "Hide layer" : "Show layer"}
                  onClick={(event) => {
                    event.stopPropagation()
                    setLayerVisibility(layer.id, !layer.visible)
                  }}
                  variant={layer.visible ? "default" : "hover"}
                >
                  {layer.visible ? (
                    <Eye size={14} weight="regular" />
                  ) : (
                    <EyeSlash size={14} weight="regular" />
                  )}
                </IconButton>
              </li>
            )
          })}
        </ul>
      </GlassPanel>
    </aside>
  )
}

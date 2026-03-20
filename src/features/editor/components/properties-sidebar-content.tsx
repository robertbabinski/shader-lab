"use client"

import { AnimatePresence, motion } from "motion/react"
import { useCallback, useMemo } from "react"
import type {
  AnimatedPropertyBinding,
  BlendMode,
  LayerCompositeMode,
  ParameterDefinition,
  ParameterValue,
} from "@/features/editor/types"
import { Select } from "@/shared/ui/select"
import { Slider } from "@/shared/ui/slider"
import { Typography } from "@/shared/ui/typography"
import { useTimelineStore } from "@/store/timelineStore"
import s from "./properties-sidebar.module.css"
import {
  blendModeOptions,
  compositeModeOptions,
  createParamTimelineBinding,
  DEFAULT_PARAM_GROUP,
  formatLayerKind,
  groupVisibleParams,
  hasTrackForBinding,
} from "./properties-sidebar-utils"
import {
  ParameterField,
  renderFieldLabel,
  type TimelineKeyframeControl,
} from "./properties-sidebar-fields"

export function EmptyPropertiesContent() {
  return (
    <div className={s.emptyState}>
      <Typography tone="secondary" variant="overline">
        Properties
      </Typography>
      <Typography variant="body">Select a layer to edit it.</Typography>
      <Typography tone="muted" variant="caption">
        Nothing to edit yet. Create a new layer in the left panel.
      </Typography>
    </div>
  )
}

export function SelectedLayerPropertiesContent({
  blendMode,
  compositeMode,
  definitionName,
  expandedParamGroups,
  hue,
  layerId,
  layerKind,
  layerName,
  layerRuntimeError,
  layerSubtitle,
  onToggleParamGroup,
  onTimelineKeyframe,
  opacity,
  reduceMotion,
  saturation,
  setLayerBlendMode,
  setLayerCompositeMode,
  setLayerHue,
  setLayerOpacity,
  setLayerSaturation,
  timelinePanelOpen,
  updateLayerParam,
  values,
  visibleParams,
}: {
  blendMode: BlendMode
  compositeMode: LayerCompositeMode
  definitionName: string
  expandedParamGroups: Record<string, boolean>
  hue: number
  layerId: string
  layerKind: string
  layerName: string
  layerRuntimeError: string | null
  layerSubtitle: string
  onToggleParamGroup: (groupId: string) => void
  onTimelineKeyframe: (
    binding: AnimatedPropertyBinding,
    layerId: string,
    value: ParameterValue
  ) => void
  opacity: number
  reduceMotion: boolean
  saturation: number
  setLayerBlendMode: (id: string, value: BlendMode) => void
  setLayerCompositeMode: (id: string, value: LayerCompositeMode) => void
  setLayerHue: (id: string, value: number) => void
  setLayerOpacity: (id: string, value: number) => void
  setLayerSaturation: (id: string, value: number) => void
  timelinePanelOpen: boolean
  updateLayerParam: (id: string, key: string, value: ParameterValue) => void
  values: Record<string, ParameterValue>
  visibleParams: ParameterDefinition[]
}) {
  const groupedParams = useMemo(
    () => groupVisibleParams(visibleParams),
    [visibleParams]
  )
  const showGroupedParams =
    groupedParams.length > 1 || groupedParams[0]?.label !== DEFAULT_PARAM_GROUP

  const opacityBinding = useMemo(
    () => ({
      kind: "layer" as const,
      label: "Opacity",
      property: "opacity" as const,
      valueType: "number" as const,
    }),
    []
  )
  const hueBinding = useMemo(
    () => ({
      kind: "layer" as const,
      label: "Hue",
      property: "hue" as const,
      valueType: "number" as const,
    }),
    []
  )
  const saturationBinding = useMemo(
    () => ({
      kind: "layer" as const,
      label: "Saturation",
      property: "saturation" as const,
      valueType: "number" as const,
    }),
    []
  )
  const timelineTracks = useTimelineStore((state) => state.tracks)

  const hasTrack = useCallback(
    (binding: AnimatedPropertyBinding) =>
      hasTrackForBinding(timelineTracks, layerId, binding),
    [layerId, timelineTracks]
  )

  const buildTimelineControl = useCallback(
    (
      binding: AnimatedPropertyBinding | null,
      value: ParameterValue
    ): TimelineKeyframeControl | null => {
      if (!binding) {
        return null
      }

      return {
        binding,
        hasTrack: hasTrack(binding),
        layerId,
        onKeyframe: onTimelineKeyframe,
        reduceMotion,
        timelinePanelOpen,
        value,
      }
    },
    [hasTrack, layerId, onTimelineKeyframe, reduceMotion, timelinePanelOpen]
  )

  return (
    <>
      <div className={s.header}>
        <div className={s.kindRow}>
          <Typography tone="secondary" variant="overline">
            Properties
          </Typography>
          <span className={s.kindBadge}>{formatLayerKind(layerKind)}</span>
        </div>
        <Typography variant="title">{layerName}</Typography>
        {layerSubtitle ? (
          <Typography tone="muted" variant="monoXs">
            {layerSubtitle}
          </Typography>
        ) : null}
        {layerRuntimeError ? (
          <Typography tone="muted" variant="caption">
            {layerRuntimeError}
          </Typography>
        ) : null}
      </div>

      <div className={s.content}>
        <section className={s.section}>
          <Typography
            className={s.sectionTitle}
            tone="secondary"
            variant="overline"
          >
            General
          </Typography>

          <div className={s.fieldStack}>
            <Slider
              label={renderFieldLabel(
                "Opacity",
                buildTimelineControl(opacityBinding, opacity)
              )}
              max={100}
              min={0}
              onValueChange={(value) => setLayerOpacity(layerId, value / 100)}
              value={opacity * 100}
              valueSuffix="%"
            />

            <div className={s.inlineField}>
              <Typography
                className={s.fieldLabel}
                tone="secondary"
                variant="label"
              >
                Blend
              </Typography>
              <Select
                className={s.select ?? ""}
                onValueChange={(value) => {
                  if (value) {
                    setLayerBlendMode(layerId, value as BlendMode)
                  }
                }}
                options={blendModeOptions}
                value={blendMode}
              />
            </div>

            <div className={s.inlineField}>
              <Typography
                className={s.fieldLabel}
                tone="secondary"
                variant="label"
              >
                Mode
              </Typography>
              <Select
                className={s.select ?? ""}
                onValueChange={(value) => {
                  if (value) {
                    setLayerCompositeMode(layerId, value as LayerCompositeMode)
                  }
                }}
                options={compositeModeOptions}
                value={compositeMode}
              />
            </div>

            <Slider
              label={renderFieldLabel(
                "Hue",
                buildTimelineControl(hueBinding, hue)
              )}
              max={180}
              min={-180}
              onValueChange={(value) => setLayerHue(layerId, value)}
              value={hue}
            />

            <Slider
              label={renderFieldLabel(
                "Saturation",
                buildTimelineControl(saturationBinding, saturation)
              )}
              max={2}
              min={0}
              onValueChange={(value) => setLayerSaturation(layerId, value)}
              step={0.01}
              value={saturation}
              valueFormatOptions={{
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              }}
            />
          </div>
        </section>

        {visibleParams.length > 0 ? (
          <section className={s.section}>
            {!showGroupedParams && (
              <Typography
                className={s.sectionTitle}
                tone="secondary"
                variant="overline"
              >
                {definitionName}
              </Typography>
            )}

            {showGroupedParams ? (
              <div className={s.groupStack}>
                {groupedParams.map((group) => {
                  const groupKey = `${layerId}:${group.id}`
                  const isExpanded = expandedParamGroups[groupKey] ?? true

                  return (
                    <div className={s.paramGroup} key={group.id}>
                      {group.collapsible ? (
                        <button
                          aria-expanded={isExpanded}
                          className={s.groupToggle}
                          onClick={() => onToggleParamGroup(groupKey)}
                          type="button"
                        >
                          <div className={s.groupHeading}>
                            <span
                              aria-hidden="true"
                              className={
                                isExpanded
                                  ? s.groupChevronExpanded
                                  : s.groupChevron
                              }
                            />
                            <Typography tone="secondary" variant="overline">
                              {group.label}
                            </Typography>
                          </div>
                        </button>
                      ) : (
                        <div className={s.groupHeadingStatic}>
                          <Typography tone="secondary" variant="overline">
                            {group.label}
                          </Typography>
                        </div>
                      )}

                      <AnimatePresence initial={false}>
                        {isExpanded ? (
                          <motion.div
                            animate={
                              reduceMotion
                                ? { opacity: 1 }
                                : { height: "auto", opacity: 1 }
                            }
                            className={s.groupBodyWrap}
                            exit={
                              reduceMotion
                                ? { opacity: 0 }
                                : { height: 0, opacity: 0 }
                            }
                            initial={
                              reduceMotion
                                ? { opacity: 0 }
                                : { height: 0, opacity: 0 }
                            }
                            transition={
                              reduceMotion
                                ? { duration: 0.12, ease: "easeOut" }
                                : {
                                    damping: 34,
                                    mass: 0.85,
                                    stiffness: 360,
                                    type: "spring",
                                  }
                            }
                          >
                            <div className={s.fieldStack}>
                              {group.params.map((param) => (
                                <ParameterField
                                  definition={param}
                                  key={param.key}
                                  layerId={layerId}
                                  onChange={updateLayerParam}
                                  onTimelineKeyframe={onTimelineKeyframe}
                                  reduceMotion={reduceMotion}
                                  timelineBinding={createParamTimelineBinding(
                                    param
                                  )}
                                  timelinePanelOpen={timelinePanelOpen}
                                  value={
                                    values[param.key] ?? param.defaultValue
                                  }
                                />
                              ))}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={s.fieldStack}>
                {visibleParams.map((param) => (
                  <ParameterField
                    definition={param}
                    key={param.key}
                    layerId={layerId}
                    onChange={updateLayerParam}
                    onTimelineKeyframe={onTimelineKeyframe}
                    reduceMotion={reduceMotion}
                    timelineBinding={createParamTimelineBinding(param)}
                    timelinePanelOpen={timelinePanelOpen}
                    value={values[param.key] ?? param.defaultValue}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </>
  )
}

<script lang="ts">
  import { onMount } from "svelte";
  import { imageStore } from "$lib/stores/imageStore";
  import type { AdjustmentsState, CropBox } from "$lib/stores/imageStore";
  import { applyAdjustments } from "$lib/utils/imageProcessing";

  interface SliderConfig {
    key: keyof AdjustmentsState;
    label: string;
    min: number;
    max: number;
    step: number;
    hint?: string;
    format?: (value: number) => string;
  }

  const sliders: SliderConfig[] = [
    {
      key: "exposure",
      label: "Exposure",
      min: -2,
      max: 2,
      step: 0.1,
      hint: "± stops",
      format: (v) => `${v.toFixed(1)} stops`,
    },
    {
      key: "brightness",
      label: "Brightness",
      min: -1,
      max: 1,
      step: 0.05,
      format: (v) => `${Math.round(v * 100)}%`,
    },
    {
      key: "contrast",
      label: "Contrast",
      min: -1,
      max: 1,
      step: 0.05,
      format: (v) => `${Math.round(v * 100)}%`,
    },
    {
      key: "saturation",
      label: "Saturation",
      min: -1,
      max: 1,
      step: 0.05,
      format: (v) => `${Math.round(v * 100)}%`,
    },
    {
      key: "warmth",
      label: "Warmth",
      min: -1,
      max: 1,
      step: 0.05,
      format: (v) => `${Math.round(v * 100)}%`,
    },
    {
      key: "highlights",
      label: "Highlights",
      min: -1,
      max: 1,
      step: 0.05,
      format: (v) => `${Math.round(v * 100)}%`,
    },
    {
      key: "shadows",
      label: "Shadows",
      min: -1,
      max: 1,
      step: 0.05,
      format: (v) => `${Math.round(v * 100)}%`,
    },
  ];

  const defaultCrop: CropBox = {
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
  };

  type AspectPreset = "free" | "1:1" | "2:3" | "3:2" | "16:9";
  const aspectPresets: AspectPreset[] = ["free", "1:1", "2:3", "3:2", "16:9"];

  let isApplying = false;
  let errorMessage = "";

  onMount(() => {
    // Don't auto-create crop - user must click "Start Crop" button
  });

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function ensureCrop(): CropBox {
    if (!$imageStore.adjustments.crop) {
      imageStore.updateAdjustments({ crop: defaultCrop });
      return defaultCrop;
    }
    return $imageStore.adjustments.crop;
  }

  function toggleCropMode() {
    const newMode = !$imageStore.adjustments.cropMode;
    imageStore.updateAdjustments({ cropMode: newMode });
    if (newMode && !$imageStore.adjustments.crop) {
      imageStore.updateAdjustments({ crop: defaultCrop });
    }
  }

  function updateSlider(key: keyof AdjustmentsState, raw: number) {
    imageStore.updateAdjustments({ [key]: raw } as Partial<AdjustmentsState>);
  }

  function sliderValue(key: keyof AdjustmentsState): number {
    const value = $imageStore.adjustments[key];
    return typeof value === "number" ? value : 0;
  }

  function resetAdjustments() {
    imageStore.resetAdjustments();
    if ($imageStore.current) {
      imageStore.updateAdjustments({ crop: defaultCrop });
    }
  }

  function rotate(delta: number) {
    updateSlider("rotation", $imageStore.adjustments.rotation + delta);
  }

  function setAspect(aspect: AspectPreset) {
    const crop = ensureCrop();
    if (aspect === "free") {
      imageStore.updateAdjustments({ crop });
      return;
    }

    const [w, h] = aspect.split(":").map(Number);
    if (!w || !h) return;

    const targetRatio = w / h;
    let width = crop.width;
    let height = crop.height;

    if (width / height > targetRatio) {
      width = height * targetRatio;
    } else {
      height = width / targetRatio;
    }

    const x = clamp(crop.x + (crop.width - width) / 2, 0, 1 - width);
    const y = clamp(crop.y + (crop.height - height) / 2, 0, 1 - height);

    imageStore.updateAdjustments({ crop: { x, y, width, height } });
  }

  async function applyAll() {
    if (!$imageStore.current) return;

    isApplying = true;
    errorMessage = "";

    try {
      const processed = applyAdjustments(
        $imageStore.current,
        $imageStore.adjustments,
        { applyCrop: true }
      );
      imageStore.setImage(processed);
      imageStore.resetAdjustments();
    } catch (error) {
      console.error("Failed to apply adjustments", error);
      errorMessage = "Could not apply adjustments. Check console for details.";
    } finally {
      isApplying = false;
    }
  }
</script>

<div class="flex flex-col gap-4 h-full bg-surface-800 p-4 rounded-lg">
  <div class="flex items-center justify-between">
    <h2 class="text-lg font-bold text-surface-50">Adjustments</h2>
    <span class="text-xs text-surface-400">Live preview, apply to bake</span>
  </div>

  {#if !$imageStore.current}
    <p class="text-sm text-surface-400">Load an image to start editing.</p>
  {:else}
    <div class="space-y-4">
      <div class="space-y-3">
        <p class="text-sm font-semibold text-surface-200">Light &amp; Color</p>
        {#each sliders as slider}
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs text-surface-300">
              <span>{slider.label}</span>
              <span class="text-primary-300">
                {#if slider.format}
                  {slider.format(sliderValue(slider.key))}
                {:else}
                  {sliderValue(slider.key).toFixed(2)}
                {/if}
              </span>
            </div>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={sliderValue(slider.key)}
              on:input={(event) =>
                updateSlider(slider.key, parseFloat(event.currentTarget.value))}
              class="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer"
              style="accent-color: rgb(var(--color-primary-500))"
            />
            {#if slider.hint}
              <p class="text-[11px] text-surface-500">{slider.hint}</p>
            {/if}
          </div>
        {/each}
      </div>

      <div class="divider"></div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-surface-200">Rotate</p>
          <span class="text-xs text-primary-300">{$imageStore.adjustments.rotation.toFixed(1)}°</span>
        </div>
        <div class="flex gap-2">
          <button class="btn variant-ghost text-sm" on:click={() => rotate(-90)}>
            ↺ 90°
          </button>
          <button class="btn variant-ghost text-sm" on:click={() => rotate(90)}>
            ↻ 90°
          </button>
          <button
            class="btn variant-ghost text-sm"
            on:click={() => updateSlider("rotation", 0)}
          >
            Reset
          </button>
        </div>
        <input
          type="range"
          min={-45}
          max={45}
          step={0.5}
            value={sliderValue("rotation")}
          on:input={(event) =>
            updateSlider("rotation", parseFloat(event.currentTarget.value))}
          class="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer"
          style="accent-color: rgb(var(--color-primary-500))"
        />
      </div>

      <div class="divider"></div>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-surface-200">Crop</p>
        </div>

        <button
          class={`btn w-full ${
            $imageStore.adjustments.cropMode
              ? "variant-filled-primary"
              : "variant-ghost"
          }`}
          on:click={toggleCropMode}
        >
          {$imageStore.adjustments.cropMode ? "✓ Cropping" : "✂️ Start Crop"}
        </button>

        {#if $imageStore.adjustments.cropMode}
          <div class="flex flex-wrap gap-2">
            {#each aspectPresets as preset}
              <button
                class={`btn text-xs py-1 variant-soft`}
                on:click={() => setAspect(preset)}
              >
                {preset}
              </button>
            {/each}
          </div>

          <p class="text-xs text-surface-400">
            Drag corners or edges on the canvas to adjust the crop area. Grid shows rule of thirds.
          </p>
        {/if}
      </div>

      {#if errorMessage}
        <div class="p-2 rounded bg-error-900 text-error-100 text-xs">
          {errorMessage}
        </div>
      {/if}

      <div class="flex gap-2">
        <button
          class="btn variant-filled-primary flex-1"
          on:click={applyAll}
          disabled={isApplying}
        >
          {isApplying ? "Applying..." : "Apply to image"}
        </button>
        <button class="btn variant-ghost" on:click={resetAdjustments}>Reset</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .divider {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 0.25rem 0;
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: rgb(var(--color-primary-500));
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
    cursor: pointer;
  }

  input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: rgb(var(--color-primary-500));
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
    border: none;
    cursor: pointer;
  }
</style>

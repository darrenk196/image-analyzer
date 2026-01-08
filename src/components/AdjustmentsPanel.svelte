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

<div class="adjustments-panel">
  {#if !$imageStore.current}
    <p class="empty-message">Load an image to start editing.</p>
  {:else}
    <!-- LIGHT Section -->
    <section class="control-section">
      <h3 class="section-header">LIGHT</h3>
      {#each sliders.slice(0, 5) as slider}
        <div class="control-item">
          <div class="control-label-row">
            <span class="control-label">{slider.label}</span>
            <span class="control-value">
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
            class="slider"
          />
        </div>
      {/each}
    </section>

    <!-- COLOR Section -->
    <section class="control-section">
      <h3 class="section-header">COLOR</h3>
      {#each sliders.slice(5, 7) as slider}
        <div class="control-item">
          <div class="control-label-row">
            <span class="control-label">{slider.label}</span>
            <span class="control-value">
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
            class="slider"
          />
        </div>
      {/each}
    </section>

    <!-- ROTATION Section -->
    <section class="control-section">
      <h3 class="section-header">ROTATION</h3>
      <div class="control-item">
        <div class="control-label-row">
          <span class="control-label">Rotate</span>
          <span class="control-value"
            >{$imageStore.adjustments.rotation.toFixed(1)}°</span
          >
        </div>
        <div class="rotation-buttons">
          <button class="btn-secondary btn-sm" on:click={() => rotate(-90)}>
            ↺ 90°
          </button>
          <button class="btn-secondary btn-sm" on:click={() => rotate(90)}>
            ↻ 90°
          </button>
          <button
            class="btn-secondary btn-sm"
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
          class="slider"
        />
      </div>
    </section>

    <!-- CROP Section -->
    <section class="control-section">
      <h3 class="section-header">CROP</h3>
      <button
        class="btn-crop-toggle"
        class:active={$imageStore.adjustments.cropMode}
        on:click={toggleCropMode}
      >
        {$imageStore.adjustments.cropMode ? "✓ Cropping" : "✂️ Start Crop"}
      </button>

      {#if $imageStore.adjustments.cropMode}
        <div class="crop-presets">
          {#each aspectPresets as preset}
            <button class="btn-preset" on:click={() => setAspect(preset)}>
              {preset}
            </button>
          {/each}
        </div>
        <p class="hint-text">
          Drag corners or edges on the canvas to adjust the crop area. Grid
          shows rule of thirds.
        </p>
      {/if}
    </section>

    <!-- Apply Section -->
    <div class="apply-section">
      {#if errorMessage}
        <div class="error-message">{errorMessage}</div>
      {/if}
      <div class="apply-buttons">
        <button class="btn-primary" on:click={applyAll} disabled={isApplying}>
          {isApplying ? "Applying..." : "Apply to image"}
        </button>
        <button class="btn-secondary" on:click={resetAdjustments}>Reset</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .adjustments-panel {
    height: 100%;
    padding: 24px;
    overflow-y: auto;
  }

  .empty-message {
    font-size: 14px;
    color: var(--color-text-secondary);
    text-align: center;
    padding: 40px 20px;
  }

  .control-section {
    margin-bottom: 32px;
  }

  .section-header {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    margin-bottom: 16px;
  }

  .control-item {
    margin-bottom: 20px;
  }

  .control-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .control-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .control-value {
    font-size: 13px;
    font-family: var(--font-family-mono);
    color: var(--color-text-secondary);
  }

  .slider {
    width: 100%;
    height: 4px;
    background: var(--color-border-subtle);
    border-radius: 2px;
    outline: none;
    appearance: none;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: white;
    border: none;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }

  .rotation-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .btn-crop-toggle {
    width: 100%;
    height: 36px;
    padding: 0 16px;
    background: transparent;
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all 150ms ease;
    margin-bottom: 12px;
  }

  .btn-crop-toggle:hover {
    background: var(--color-border-subtle);
  }

  .btn-crop-toggle.active {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: white;
  }

  .crop-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .btn-preset {
    padding: 6px 12px;
    background: var(--color-border-subtle);
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .btn-preset:hover {
    background: var(--color-border-strong);
  }

  .hint-text {
    font-size: 12px;
    color: var(--color-text-tertiary);
    line-height: 1.5;
  }

  .apply-section {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--color-border-subtle);
  }

  .error-message {
    padding: 12px;
    margin-bottom: 12px;
    background: var(--color-error);
    border-radius: 6px;
    font-size: 13px;
    color: white;
  }

  .apply-buttons {
    display: flex;
    gap: 8px;
  }

  .btn-primary {
    flex: 1;
    height: 36px;
    padding: 0 20px;
    background: var(--color-accent-primary);
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: white;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    height: 36px;
    padding: 0 16px;
    background: transparent;
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .btn-secondary:hover {
    background: var(--color-border-subtle);
  }

  .btn-sm {
    flex: 1;
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
  }
</style>

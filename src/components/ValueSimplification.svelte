<script lang="ts">
  import { imageStore } from "$lib/stores/imageStore";
  import {
    extractDominantColors,
    posterizeImage,
    rgbToHex,
    mapColorsToPalette,
  } from "$lib/utils/imageProcessing";
  import { palettes, paletteCategories } from "$lib/utils/palettes";
  import { debounce } from "$lib/utils/timing";

  let isProcessing = false;
  let pendingUpdate = false;

  // Debounced color extraction - runs after user stops changing sliders
  const debouncedExtractColors = debounce(async () => {
    if (!$imageStore.current || !$imageStore.valueSimplification.enabled)
      return;

    isProcessing = true;
    pendingUpdate = false;

    // Extract colors from current image
    const imageData = new Uint8ClampedArray($imageStore.current.data);
    const width = $imageStore.current.width;
    const height = $imageStore.current.height;

    let colors = extractDominantColors(
      imageData,
      width,
      height,
      $imageStore.valueSimplification.levels,
      8 // More aggressive sampling for speed
    );

    // Map to palette if enabled
    if ($imageStore.valueSimplification.paletteEnabled) {
      const palette = palettes[$imageStore.valueSimplification.selectedPalette];
      if (palette) {
        colors = mapColorsToPalette(colors, palette.colors);
      }
    }

    imageStore.setExtractedColors(colors);
    isProcessing = false;
  }, 300); // Wait 300ms after slider stops moving

  function handleLevelChange(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value);
    imageStore.setValueSimplificationLevels(value);
    pendingUpdate = true;
    debouncedExtractColors();
  }

  function toggleValueSimplification() {
    imageStore.setValueSimplificationEnabled(
      !$imageStore.valueSimplification.enabled
    );
    if ($imageStore.valueSimplification.enabled) {
      debouncedExtractColors();
    }
  }

  function setPreset(levels: number) {
    imageStore.setValueSimplificationLevels(levels);
    imageStore.setValueSimplificationEnabled(true);
    pendingUpdate = true;
    debouncedExtractColors();
  }

  function copyColorToClipboard(hex: string) {
    navigator.clipboard.writeText(hex);
  }

  function handlePaletteChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    imageStore.setSelectedPalette(value);
    pendingUpdate = true;
    debouncedExtractColors();
  }

  function togglePalette() {
    imageStore.setPaletteEnabled(
      !$imageStore.valueSimplification.paletteEnabled
    );
    pendingUpdate = true;
    debouncedExtractColors();
  }
</script>

<div class="flex flex-col gap-4 h-full bg-surface-800 p-4 rounded-lg">
  <h2 class="text-lg font-bold text-surface-50">Value Simplification</h2>

  {#if !$imageStore.current}
    <div class="text-sm text-surface-400">Load an image to use this tool</div>
  {:else}
    <!-- Toggle Switch -->
    <div class="flex items-center justify-between">
      <label for="enable-toggle" class="text-sm font-medium text-surface-200"
        >Enable</label
      >
      <button
        id="enable-toggle"
        on:click={toggleValueSimplification}
        role="switch"
        aria-checked={$imageStore.valueSimplification.enabled}
        class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          $imageStore.valueSimplification.enabled
            ? "bg-primary-500"
            : "bg-surface-600"
        }`}
      >
        <span
          class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            $imageStore.valueSimplification.enabled
              ? "translate-x-6"
              : "translate-x-1"
          }`}
        ></span>
      </button>
    </div>

    {#if $imageStore.valueSimplification.enabled}
      <!-- Level Slider -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label
            for="value-levels"
            class="text-sm font-medium text-surface-200"
          >
            Value Levels {pendingUpdate ? "(updating...)" : ""}
          </label>
          <span class="text-sm font-semibold text-primary-400">
            {$imageStore.valueSimplification.levels}
          </span>
        </div>
        <input
          id="value-levels"
          type="range"
          min="2"
          max="10"
          value={$imageStore.valueSimplification.levels}
          on:input={handleLevelChange}
          class="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer"
          style="accent-color: rgb(var(--color-primary-500))"
        />
        <div class="flex gap-2 text-xs text-surface-400">
          <span>2</span>
          <span class="flex-1"></span>
          <span>10</span>
        </div>
      </div>

      <!-- Opacity Slider -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label
            for="value-opacity"
            class="text-sm font-medium text-surface-200">Opacity</label
          >
          <span class="text-sm font-semibold text-primary-400">
            {Math.round($imageStore.valueSimplification.opacity * 100)}%
          </span>
        </div>
        <input
          id="value-opacity"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={$imageStore.valueSimplification.opacity}
          on:input={(e) => {
            imageStore.setValueSimplificationOpacity(
              parseFloat(e.currentTarget.value)
            );
          }}
          class="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer"
          style="accent-color: rgb(var(--color-primary-500))"
        />
      </div>

      <div class="divider"></div>

      <!-- Presets -->
      <div class="space-y-2">
        <p class="text-sm font-medium text-surface-200">Presets</p>
        <div class="grid grid-cols-3 gap-2">
          <button
            on:click={() => setPreset(3)}
            class={`btn text-xs py-1 ${
              $imageStore.valueSimplification.levels === 3
                ? "variant-filled-primary"
                : "variant-ghost"
            }`}
          >
            Quick
          </button>
          <button
            on:click={() => setPreset(5)}
            class={`btn text-xs py-1 ${
              $imageStore.valueSimplification.levels === 5
                ? "variant-filled-primary"
                : "variant-ghost"
            }`}
          >
            Standard
          </button>
          <button
            on:click={() => setPreset(8)}
            class={`btn text-xs py-1 ${
              $imageStore.valueSimplification.levels === 8
                ? "variant-filled-primary"
                : "variant-ghost"
            }`}
          >
            Detail
          </button>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Paint by Numbers Section -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label
            for="paint-by-numbers-toggle"
            class="text-sm font-medium text-surface-200"
          >
            Paint by Numbers
          </label>
          <button
            id="paint-by-numbers-toggle"
            on:click={() =>
              imageStore.setPaintByNumbersEnabled(
                !$imageStore.valueSimplification.paintByNumbersEnabled
              )}
            role="switch"
            aria-checked={$imageStore.valueSimplification.paintByNumbersEnabled}
            class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              $imageStore.valueSimplification.paintByNumbersEnabled
                ? "bg-primary-500"
                : "bg-surface-600"
            }`}
          >
            <span
              class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                $imageStore.valueSimplification.paintByNumbersEnabled
                  ? "translate-x-6"
                  : "translate-x-1"
              }`}
            ></span>
          </button>
        </div>

        {#if $imageStore.valueSimplification.paintByNumbersEnabled}
          <!-- Mode Toggle -->
          <div class="space-y-2">
            <p class="text-xs font-semibold text-surface-300">
              Reference Style
            </p>
            <div class="grid grid-cols-2 gap-2">
              <button
                on:click={() => imageStore.setPaintByNumbersMode("blocks")}
                class={`btn text-xs py-2 ${
                  $imageStore.valueSimplification.paintByNumbersMode ===
                  "blocks"
                    ? "variant-filled-primary"
                    : "variant-ghost"
                }`}
              >
                🎨 Color Blocks
              </button>
              <button
                on:click={() => imageStore.setPaintByNumbersMode("lines")}
                class={`btn text-xs py-2 ${
                  $imageStore.valueSimplification.paintByNumbersMode === "lines"
                    ? "variant-filled-primary"
                    : "variant-ghost"
                }`}
              >
                ✏️ Line Guide
              </button>
            </div>
          </div>

          <p class="text-xs text-surface-400 italic">
            {#if $imageStore.valueSimplification.paintByNumbersMode === "blocks"}
              Solid color blocks for painting reference
            {:else}
              Outlined regions for drawing guide
            {/if}
          </p>
        {/if}
      </div>

      <div class="divider"></div>

      <!-- Color Palette Selection Section -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label
            for="palette-toggle"
            class="text-sm font-medium text-surface-200"
          >
            Apply Color Palette
          </label>
          <button
            id="palette-toggle"
            on:click={togglePalette}
            role="switch"
            aria-checked={$imageStore.valueSimplification.paletteEnabled}
            class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              $imageStore.valueSimplification.paletteEnabled
                ? "bg-primary-500"
                : "bg-surface-600"
            }`}
          >
            <span
              class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                $imageStore.valueSimplification.paletteEnabled
                  ? "translate-x-6"
                  : "translate-x-1"
              }`}
            ></span>
          </button>
        </div>

        {#if $imageStore.valueSimplification.paletteEnabled}
          <div class="space-y-2">
            <label
              for="palette-select"
              class="text-xs font-semibold text-surface-300"
            >
              Palette Selection
            </label>
            <select
              id="palette-select"
              value={$imageStore.valueSimplification.selectedPalette}
              on:change={handlePaletteChange}
              class="w-full px-3 py-2 bg-surface-700 text-surface-50 rounded border border-surface-600 text-sm focus:outline-none focus:border-primary-500"
            >
              {#each Object.entries(paletteCategories) as [category, label]}
                <optgroup {label}>
                  {#each Object.entries(palettes) as [key, palette]}
                    {#if palette.category === category}
                      <option value={key}>{palette.name}</option>
                    {/if}
                  {/each}
                </optgroup>
              {/each}
            </select>

            {#if palettes[$imageStore.valueSimplification.selectedPalette]}
              <div class="bg-surface-700 p-2 rounded">
                <p class="text-xs text-surface-400 mb-2">
                  {palettes[$imageStore.valueSimplification.selectedPalette]
                    .description}
                </p>
                <div class="flex gap-1 flex-wrap">
                  {#each palettes[$imageStore.valueSimplification.selectedPalette].colors as color}
                    <div
                      class="w-6 h-6 rounded border border-surface-600"
                      style={`background-color: ${color}`}
                      title={color}
                    ></div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <div class="divider"></div>

      <!-- Extracted Colors Palette -->
      <div class="space-y-2">
        <p class="text-sm font-medium text-surface-200">
          Color Palette {isProcessing ? "(Processing...)" : ""}
        </p>

        {#if $imageStore.valueSimplification.extractedColors.length > 0}
          <div class="space-y-2">
            {#each $imageStore.valueSimplification.extractedColors as color, idx (idx)}
              <button
                class="flex items-center gap-2 p-2 bg-surface-700 rounded hover:bg-surface-600 cursor-pointer transition-colors text-left w-full"
                on:click={() => copyColorToClipboard(color.hex)}
                title="Click to copy color"
              >
                <div
                  class="w-8 h-8 rounded border border-surface-500"
                  style={`background-color: rgb(${color.r}, ${color.g}, ${color.b})`}
                  aria-label={`Color: ${color.hex}`}
                ></div>
                <div class="flex-1">
                  <p class="text-xs font-mono font-semibold text-surface-50">
                    {color.hex}
                  </p>
                </div>
                <span class="text-xs text-surface-400">Copy</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="text-xs text-surface-400">Colors will appear here</p>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .divider {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 0.5rem 0;
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgb(var(--color-primary-500));
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgb(var(--color-primary-500));
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
</style>

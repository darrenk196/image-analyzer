<script lang="ts">
  import { analysis, imageStore } from "$lib/stores/imageStore";
  import ValueSimplification from "./ValueSimplification.svelte";
</script>

<div
  class="flex flex-col gap-4 h-full bg-surface-800 p-4 rounded-lg overflow-y-auto"
>
  {#if $imageStore.activeTool === "value-simplification"}
    <ValueSimplification />
  {:else}
    <h2 class="text-lg font-bold text-surface-50">Analysis</h2>

    {#if $analysis}
      <div class="space-y-3">
        <div class="bg-surface-700 p-3 rounded">
          <p class="text-xs text-surface-400">Average Brightness</p>
          <p class="text-lg font-bold text-surface-50">
            {($analysis.average_brightness * 100).toFixed(1)}%
          </p>
        </div>

        <div class="bg-surface-700 p-3 rounded">
          <p class="text-xs text-surface-400">Contrast</p>
          <p class="text-lg font-bold text-surface-50">
            {($analysis.contrast * 100).toFixed(1)}%
          </p>
        </div>

        <div class="bg-surface-700 p-3 rounded">
          <p class="text-xs text-surface-400 mb-2">Luminosity Histogram</p>
          <div class="flex gap-0.5 items-end h-16">
            {#each $analysis.histogram.luminosity as value, i (i)}
              {#if i % 8 === 0}
                <div
                  class="flex-1 bg-primary-500 rounded-t"
                  style="height: {(value /
                    Math.max(...$analysis.histogram.luminosity)) *
                    100}%"
                ></div>
              {/if}
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <p class="text-sm text-surface-400">Load an image to see analysis</p>
    {/if}
  {/if}
</div>

<script lang="ts">
  import ImageCanvas from "../components/ImageCanvas.svelte";
  import ToolPanel from "../components/ToolPanel.svelte";
  import AnalysisPanel from "../components/AnalysisPanel.svelte";
</script>

<div class="w-screen h-screen flex flex-col bg-surface-900">
  <!-- Header -->
  <header class="bg-surface-800 border-b border-surface-700 px-6 py-4">
    <h1 class="text-2xl font-bold text-surface-50">Image Analyzer</h1>
    <p class="text-sm text-surface-400">
      Break down images into shapes, values, and colors
    </p>
  </header>

  <!-- Main Layout -->
  <div class="flex flex-1 gap-4 p-4 overflow-hidden">
    <!-- Left Sidebar - Tools -->
    <div class="w-48 flex-shrink-0 overflow-y-auto">
      <ToolPanel />
    </div>

    <!-- Center - Canvas -->
    <div class="flex-1 min-w-0">
      <ImageCanvas />
    </div>

    <!-- Right Sidebar - Analysis -->
    <div class="w-64 flex-shrink-0 overflow-y-auto">
      <AnalysisPanel />
    </div>
  </div>
</div>

<script lang="ts">
  import { open } from "@tauri-apps/plugin-dialog";
  import { loadImage } from "$lib/api/imageApi";
  import { imageStore } from "$lib/stores/imageStore";
  import { Upload } from "lucide-svelte";

  async function openImage() {
    try {
      const selected = await open({
        filters: [
          {
            name: "Image",
            extensions: ["png", "jpg", "jpeg", "gif", "webp"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        imageStore.setProcessing(true);
        try {
          const imageData = await loadImage(selected);
          imageStore.setImage(imageData);
        } catch (error) {
          console.error("Error loading image:", error);
          alert("Failed to load image. Make sure it's a valid image file.");
        }
        imageStore.setProcessing(false);
      }
    } catch (error) {
      console.error("Error opening file dialog:", error);
      imageStore.setProcessing(false);
    }
  }
</script>

<div class="empty-state">
  <div class="drop-zone">
    <div class="icon-container">
      <Upload size={64} strokeWidth={1.5} />
    </div>

    <h2 class="heading">Drop an image to get started</h2>

    <p class="subtext">
      Drag and drop your image here, or click the button below to browse your
      files
    </p>

    <button class="btn-choose" on:click={openImage}>
      <Upload size={18} />
      Choose Image
    </button>

    <p class="formats">Supported formats: JPG, PNG, GIF, WebP</p>
  </div>
</div>

<style>
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 48px;
  }

  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: 480px;
    padding: 64px 48px;
    border: 2px dashed var(--color-border-strong);
    border-radius: 12px;
    text-align: center;
  }

  .icon-container {
    margin-bottom: 24px;
    color: var(--color-border-strong);
  }

  .heading {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 12px 0;
  }

  .subtext {
    font-size: 14px;
    color: var(--color-text-tertiary);
    line-height: 1.6;
    margin: 0 0 32px 0;
    max-width: 360px;
  }

  .btn-choose {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 24px;
    background: var(--color-accent-primary);
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: white;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .btn-choose:hover {
    background: var(--color-accent-hover);
  }

  .formats {
    font-size: 12px;
    color: var(--color-text-tertiary);
    margin: 24px 0 0 0;
  }
</style>

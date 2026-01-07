use crate::models::{AnalysisResult, ColorSample, HistogramData, ImageData};

#[tauri::command]
pub async fn load_image(path: String) -> Result<ImageData, String> {
    let img = image::open(&path).map_err(|e| format!("Failed to load image: {}", e))?;
    let rgba_img = img.to_rgba8();

    Ok(ImageData {
        width: rgba_img.width(),
        height: rgba_img.height(),
        data: rgba_img.to_vec(),
        format: "rgba".to_string(),
    })
}

#[tauri::command]
pub async fn analyze_image(image_data: ImageData) -> Result<AnalysisResult, String> {
    let width = image_data.width as usize;
    let height = image_data.height as usize;
    let data = &image_data.data;

    // Calculate histogram
    let mut histogram = HistogramData {
        red: vec![0; 256],
        green: vec![0; 256],
        blue: vec![0; 256],
        luminosity: vec![0; 256],
    };

    let chunk_size = 4; // RGBA
    for chunk in data.chunks(chunk_size) {
        if chunk.len() == chunk_size {
            let r = chunk[0] as usize;
            let g = chunk[1] as usize;
            let b = chunk[2] as usize;
            let a = chunk[3];

            if a > 0 {
                histogram.red[r] += 1;
                histogram.green[g] += 1;
                histogram.blue[b] += 1;

                // Calculate luminosity (perceptual brightness)
                let lum = ((0.299 * r as f32) + (0.587 * g as f32) + (0.114 * b as f32)) as usize;
                histogram.luminosity[lum.min(255)] += 1;
            }
        }
    }

    // Calculate average brightness
    let total_pixels = (width * height) as f32;
    let avg_brightness = histogram.luminosity.iter().enumerate()
        .map(|(i, &count)| (i as f32) * (count as f32))
        .sum::<f32>() / total_pixels / 255.0;

    // Calculate contrast (using standard deviation)
    let mean = avg_brightness * 255.0;
    let variance = histogram.luminosity.iter().enumerate()
        .map(|(i, &count)| {
            let diff = (i as f32) - mean;
            (diff * diff) * (count as f32)
        })
        .sum::<f32>() / total_pixels;
    let contrast = variance.sqrt() / 255.0;

    // Extract dominant colors (simplified)
    let dominant_colors = vec![
        ColorSample {
            r: 128,
            g: 128,
            b: 128,
            hex: "#808080".to_string(),
        },
    ];

    Ok(AnalysisResult {
        histogram,
        dominant_colors,
        average_brightness: avg_brightness,
        contrast,
    })
}

#[tauri::command]
pub async fn adjust_brightness(
    image_data: ImageData,
    amount: f32,
) -> Result<ImageData, String> {
    let mut adjusted = image_data.data.clone();
    let mut chunks = adjusted.chunks_exact_mut(4);

    for chunk in &mut chunks {
        chunk[0] = ((chunk[0] as f32 * amount).min(255.0) as u8).max(0);
        chunk[1] = ((chunk[1] as f32 * amount).min(255.0) as u8).max(0);
        chunk[2] = ((chunk[2] as f32 * amount).min(255.0) as u8).max(0);
    }

    Ok(ImageData {
        data: adjusted,
        ..image_data
    })
}

#[tauri::command]
pub async fn adjust_contrast(
    image_data: ImageData,
    amount: f32,
) -> Result<ImageData, String> {
    let mut adjusted = image_data.data.clone();
    let center = 128.0;

    for chunk in adjusted.chunks_exact_mut(4) {
        chunk[0] = (((chunk[0] as f32 - center) * amount + center).min(255.0) as u8).max(0);
        chunk[1] = (((chunk[1] as f32 - center) * amount + center).min(255.0) as u8).max(0);
        chunk[2] = (((chunk[2] as f32 - center) * amount + center).min(255.0) as u8).max(0);
    }

    Ok(ImageData {
        data: adjusted,
        ..image_data
    })
}

#[tauri::command]
pub async fn convert_to_grayscale(image_data: ImageData) -> Result<ImageData, String> {
    let mut adjusted = image_data.data.clone();

    for chunk in adjusted.chunks_exact_mut(4) {
        let gray = ((0.299 * chunk[0] as f32)
            + (0.587 * chunk[1] as f32)
            + (0.114 * chunk[2] as f32)) as u8;
        chunk[0] = gray;
        chunk[1] = gray;
        chunk[2] = gray;
    }

    Ok(ImageData {
        data: adjusted,
        ..image_data
    })
}

#[tauri::command]
pub async fn save_image(image_data: ImageData, path: String) -> Result<(), String> {
    let img = image::RgbaImage::from_raw(image_data.width, image_data.height, image_data.data)
        .ok_or("Failed to create image from data")?;

    img.save(&path)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    Ok(())
}

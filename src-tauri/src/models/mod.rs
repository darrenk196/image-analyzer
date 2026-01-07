use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ImageData {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
    pub format: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HistogramData {
    pub red: Vec<u32>,
    pub green: Vec<u32>,
    pub blue: Vec<u32>,
    pub luminosity: Vec<u32>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ColorSample {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub hex: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub histogram: HistogramData,
    pub dominant_colors: Vec<ColorSample>,
    pub average_brightness: f32,
    pub contrast: f32,
}

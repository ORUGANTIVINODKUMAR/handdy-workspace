import { createContext } from "react";

export const ThemeContext = createContext(null);

export const themes = [
  { id: "upsilon", name: "CRM", description: "CRM workspace green", colors: ["#0D3B2E", "#1E644E", "#369270", "#ABD8C5", "#EAF5EF"] },
  { id: "periwinkle", name: "Periwinkle", description: "Calm blue and lavender", colors: ["#4056A1", "#6C8CE5", "#92A6DB", "#AEBBDA", "#E7E3F1"] },
  { id: "kozowood", name: "Kozowood", description: "Warm walnut and sand", colors: ["#3B342D", "#8B6238", "#A67C52", "#BC9775", "#A49386"] },
  { id: "moon", name: "Moon Phases", description: "Deep slate and ocean teal", colors: ["#1D252B", "#263845", "#25566A", "#7899A1", "#CFD5D1"] },
  { id: "brightmedia", name: "BrightMedia", description: "Berry, rose, and blush", colors: ["#700022", "#A2395B", "#DEA3B7", "#C44D79", "#EC3E78"] },
  { id: "boro", name: "Boro05", description: "Sage and coastal blue", colors: ["#657361", "#2B7694", "#4F8BB0", "#A7CCE0", "#EEF1F4"] },
  { id: "play", name: "Play", description: "Terracotta and soft steel", colors: ["#87492F", "#343746", "#7FAFCB", "#AFC5CF", "#8A8269"] },
  { id: "sea", name: "Sea Love", description: "Teal, mint, and sunlight", colors: ["#007175", "#93DED2", "#FFF5B8", "#FCE28E", "#E6E0D8"] },
  { id: "console", name: "Shift Console", description: "Navy sidebar, signal blue accent", colors: ["#0F1A33", "#2453D6", "#5B8CFF", "#C7CFE6", "#F6F7FB"] },
];

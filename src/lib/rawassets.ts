const SVG = import.meta.glob("../assets/**/*.json", {
    query: '?raw',
    import: 'default',
    eager: true,
    
}) as Record<string, string>;

export const ASSETS: Record<string, string> = {};

for (const key in SVG) {
    ASSETS[key.substring("../assets/".length)] = SVG[key];
}
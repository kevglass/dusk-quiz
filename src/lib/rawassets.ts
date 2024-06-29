const SVG = import.meta.glob(["../assets/**/*.json"], {
    query: '?raw',
    import: 'default',
    eager: true,
    
}) as Record<string, string>;

export const RAW_ASSETS: Record<string, string> = {};

for (const key in SVG) {
    RAW_ASSETS[key.substring("../assets/".length)] = SVG[key];
}
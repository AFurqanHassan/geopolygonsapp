// Color palette for group IDs
const COLOR_PALETTE = [
    "#2563eb", // blue
    "#059669", // green
    "#d97706", // orange
    "#9333ea", // purple
    "#dc2626", // red
    "#0891b2", // cyan
    "#ea580c", // orange-red
    "#7c3aed", // violet
    "#0d9488", // teal
    "#c026d3", // fuchsia
];

export function getColorForGroupId(groupId: string): string {
    const hash = groupId.split("").reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const index = Math.abs(hash) % COLOR_PALETTE.length;
    return COLOR_PALETTE[index];
}

export function buildReportFileName(
    category: string,
    name: string,
    ext: string,
    date: Date = new Date(),
): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');

    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40);

    const cat = category.toLowerCase().replace(/[^a-z0-9]/g, '');

    return `ARKA_${yyyy}${mm}${dd}_${hh}${min}_${cat}_${slug}.${ext}`;
}

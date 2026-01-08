
const d1 = new Date("Thu, 04 Sep 2025 07:00:00 GMT");
const now = new Date("Wed, 07 Jan 2026 13:00:00 GMT");
const diff = (now - d1) / (1000 * 60 * 60 * 24);
console.log(`Date 1: ${d1.toString()}`);
console.log(`Now: ${now.toString()}`);
console.log(`Diff days: ${diff}`);
console.log(`Is <= 5: ${diff <= 5}`);

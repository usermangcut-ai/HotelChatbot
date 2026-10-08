/** URL ảnh tĩnh trong data/images kèm mã build: thay ảnh rồi build lại → URL đổi → không dính cache cũ. */
export const imageUrl = (file: string) => `/images/${file}?v=${__BUILD_ID__}`;

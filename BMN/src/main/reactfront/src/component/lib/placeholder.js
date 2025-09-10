// src/lib/placeholder.js
export const onImgError = (e) => {
    const img = e.currentTarget;
    img.onerror = null; // 무한 루프 방지
    img.src =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
        <rect width='100%' height='100%' fill='#f2f2f2'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
              font-size='18' fill='#9aa1a9'>no image</text>
        </svg>
    `);
};
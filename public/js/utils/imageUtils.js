/**
 * Image Utility for resizing and compressing images before storage.
 * This helps prevent QuotaExceededError in localStorage.
 */

export const compressImage = (base64Str, maxWidth = 300, maxHeight = 300, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to webp if possible for better compression, otherwise jpeg
            const result = canvas.toDataURL('image/jpeg', quality);
            resolve(result);
        };
        img.onerror = (err) => reject(err);
    });
};

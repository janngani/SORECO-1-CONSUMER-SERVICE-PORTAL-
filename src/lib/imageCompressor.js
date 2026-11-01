const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg"];
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg"];

/**
 * Validates that an uploaded file is strictly a PNG, JPG, or JPEG image.
 * Protects against dangerous file uploads (e.g., .php, .exe, scripts disguised as images).
 */
export function validateImageFile(file) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const fileName = (file.name || "").toLowerCase();
  
  // Guard against executable and script extensions even if disguised with double extensions
  const DANGEROUS_PATTERNS = /\.(php[0-9]?|phtml|exe|sh|bat|cmd|com|vbs|ps1|jsp|asp|aspx|cgi|pl|py|rb|jar|war|dll|so|bin)(\.|$|%00)/i;
  if (DANGEROUS_PATTERNS.test(fileName)) {
    throw new Error("Upload rejected: Potentially dangerous executable or script file detected (.php, .exe, etc.). Upload is strictly forbidden.");
  }

  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  if (!hasValidExtension) {
    throw new Error("Upload rejected: Only PNG, JPG, and JPEG images are allowed. Files like .php, .exe, and scripts are strictly forbidden.");
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    throw new Error("Upload rejected: Only PNG, JPG, and JPEG images are allowed.");
  }

  // Max 10MB per image
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("Upload rejected: File size exceeds the 10MB limit.");
  }

  return true;
}

/**
 * Compresses a valid PNG/JPG/JPEG image to a JPEG data URL.
 * Strictly rejects any file that fails extension, MIME, or image rendering checks.
 */
export function compressImage(file, maxDimension = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    try {
      validateImageFile(file);
    } catch (validationErr) {
      reject(validationErr);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Upload rejected: Canvas graphics context is unavailable."));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        } catch (error) {
          reject(new Error("Upload rejected: Failed to process image file."));
        }
      };

      img.onerror = () => {
        // Disguised files (e.g. PHP/executable script renamed to .png/.jpg) will fail here!
        reject(new Error("Upload rejected: Invalid or corrupted image content. Only real PNG, JPG, and JPEG files are accepted."));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error("Upload rejected: Failed to read selected file."));
    };

    reader.readAsDataURL(file);
  });
}
